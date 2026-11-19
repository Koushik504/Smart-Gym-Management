import { Prisma } from "@prisma/client";
import { db, mongo } from "./db";
import { type Actor, memberAccess } from "./auth";
import { memberScope } from "./services";
import { retentionRule, progressRule, day } from "./rules";
import { positiveId } from "./validation";
type Row = Record<string, unknown>;
export async function dashboard(actor: Actor) {
  const scope = memberScope(actor),
    today = day(),
    month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const where =
    actor.role === "ADMIN"
      ? Prisma.sql`1=1`
      : Prisma.sql`m.trainerId=${actor.trainer?.id ?? -1}`;
  const [
    totalMembers,
    activeMemberships,
    expiredMembers,
    todayAttendance,
    attendance,
    growth,
    distribution,
    trainers,
    alerts,
    revenue,
    pending,
  ] = await Promise.all([
    db.member.count({ where: { ...scope, active: true } }),
    db.member.count({
      where: {
        ...scope,
        active: true,
        subscriptions: {
          some: {
            status: "ACTIVE",
            startsAt: { lte: today },
            endsAt: { gte: today },
            payment: { status: "PAID" },
          },
        },
      },
    }),
    db.member.count({
      where: {
        ...scope,
        active: true,
        subscriptions: {
          some: {},
          none: { status: "ACTIVE", endsAt: { gte: today } },
        },
      },
    }),
    db.attendance.count({ where: { member: scope, date: today } }),
    db.$queryRaw<
      Row[]
    >`SELECT DATE_FORMAT(a.date,'%Y-%m-%d') label,COUNT(*) value FROM sg_attendance a JOIN sg_members m ON m.id=a.memberId WHERE ${where} AND a.date>=UTC_DATE()-INTERVAL 29 DAY GROUP BY a.date ORDER BY a.date`,
    db.$queryRaw<
      Row[]
    >`SELECT DATE_FORMAT(m.joinedAt,'%Y-%m') label,COUNT(*) value FROM sg_members m WHERE ${where} AND m.joinedAt>=UTC_DATE()-INTERVAL 6 MONTH GROUP BY label ORDER BY label`,
    db.$queryRaw<
      Row[]
    >`SELECT p.name label,COUNT(DISTINCT s.memberId) value FROM sg_subscriptions s JOIN sg_members m ON m.id=s.memberId JOIN sg_packages p ON p.id=s.packageId JOIN sg_payments pay ON pay.subscriptionId=s.id WHERE ${where} AND m.active=1 AND s.status='ACTIVE' AND s.startsAt<=UTC_DATE() AND s.endsAt>=UTC_DATE() AND pay.status='PAID' GROUP BY p.name`,
    actor.role === "ADMIN" ? db.trainer.count() : Promise.resolve(null),
    actor.role === "ADMIN"
      ? db.equipment.count({
          where: {
            OR: [
              { status: "MAINTENANCE" },
              { status: { not: "RETIRED" }, nextService: { lte: today } },
            ],
          },
        })
      : Promise.resolve(null),
    actor.role === "ADMIN"
      ? db.$queryRaw<
          Row[]
        >`SELECT month label,revenue value FROM sg_monthly_revenue WHERE month>=DATE_FORMAT(UTC_DATE()-INTERVAL 5 MONTH,'%Y-%m') ORDER BY month DESC LIMIT 6`
      : Promise.resolve([]),
    actor.role === "ADMIN"
      ? db.payment.aggregate({
          where: { status: "PENDING" },
          _count: true,
          _sum: { amount: true },
        })
      : Promise.resolve(null),
  ]);
  const monthly =
    actor.role === "ADMIN"
      ? await db.payment.aggregate({
          where: { status: "PAID", paidAt: { gte: month } },
          _sum: { amount: true },
        })
      : null;
  const recent = await db.attendance.findMany({
    where: { member: scope },
    include: { member: { select: { name: true } } },
    orderBy: { checkIn: "desc" },
    take: 5,
  });
  const expiring = await retention(actor);
  return {
    metrics: {
      totalMembers,
      activeMemberships,
      expiredMembers,
      totalTrainers: trainers,
      monthlyRevenue: monthly ? Number(monthly._sum.amount || 0) : null,
      todayAttendance,
      pendingPayments: pending ? pending._count : null,
      pendingAmount: pending ? Number(pending._sum.amount || 0) : null,
      maintenanceAlerts: alerts,
    },
    charts: { attendance, growth, distribution, revenue: revenue.reverse() },
    recent,
    retention: expiring.slice(0, 5),
    retentionCount: expiring.length,
  };
}
export async function retention(actor: Actor) {
  const where =
    actor.role === "ADMIN"
      ? Prisma.sql`1=1`
      : Prisma.sql`m.trainerId=${actor.trainer?.id ?? -1}`;
  const rows = await db.$queryRaw<
    Row[]
  >`SELECT m.id,m.name,m.email,MAX(s.endsAt) endsAt,DATEDIFF(MAX(s.endsAt),UTC_DATE()) daysToExpiry,
    (SELECT COUNT(*) FROM sg_attendance a WHERE a.memberId=m.id AND a.date BETWEEN UTC_DATE()-INTERVAL 13 DAY AND UTC_DATE()) recentVisits,
    (SELECT COUNT(*) FROM sg_attendance a WHERE a.memberId=m.id AND a.date BETWEEN UTC_DATE()-INTERVAL 27 DAY AND UTC_DATE()-INTERVAL 14 DAY) previousVisits
    FROM sg_members m LEFT JOIN sg_subscriptions s ON s.memberId=m.id AND s.status='ACTIVE' WHERE ${where} AND m.active=1 GROUP BY m.id,m.name,m.email ORDER BY daysToExpiry LIMIT 200`;
  return rows
    .map((r) => ({
      ...r,
      recentVisits: Number(r.recentVisits),
      previousVisits: Number(r.previousVisits),
      daysToExpiry: r.daysToExpiry === null ? null : Number(r.daysToExpiry),
      reasons: retentionRule(
        r.daysToExpiry === null ? null : Number(r.daysToExpiry),
        Number(r.recentVisits),
        Number(r.previousVisits),
      ),
    }))
    .filter((r) => r.reasons.length);
}
export async function workoutAnalytics(actor: Actor, memberId?: number) {
  if (memberId) await memberAccess(actor, memberId);
  const members = await db.member.findMany({
    where: { ...memberScope(actor), ...(memberId ? { id: memberId } : {}) },
    select: { id: true, name: true },
  });
  const ids = members.map((m) => m.id),
    database = await mongo();
  const filter = {
    memberId: { $in: ids },
    date: { $gte: new Date(Date.now() - 90 * 86400000) },
  };
  const monthly = await database
    .collection("workout_logs")
    .aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          sessions: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          minutes: { $sum: "$durationMinutes" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  const summary = await database
    .collection("workout_logs")
    .aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$memberId",
          sessions: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          minutes: { $sum: "$durationMinutes" },
          lastSession: { $max: "$date" },
        },
      },
      { $sort: { sessions: -1 } },
    ])
    .toArray();
  const exerciseCompletion = await database
    .collection("workout_logs")
    .aggregate([
      { $match: filter },
      { $unwind: "$entries" },
      {
        $group: {
          _id: "$entries.exerciseId",
          entries: { $sum: 1 },
          completed: { $sum: { $cond: ["$entries.completed", 1, 0] } },
          volume: {
            $sum: {
              $cond: [
                "$entries.completed",
                {
                  $multiply: [
                    "$entries.sets",
                    "$entries.reps",
                    "$entries.weight",
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      { $sort: { volume: -1 } },
    ])
    .toArray();
  const exercises = await db.exercise.findMany({
    select: { id: true, name: true },
  });
  const measurements = await database
    .collection("member_progress")
    .aggregate([
      { $match: filter },
      { $sort: { date: 1, _id: 1 } },
      {
        $group: {
          _id: "$memberId",
          entries: { $sum: 1 },
          firstDate: { $first: "$date" },
          lastDate: { $last: "$date" },
          firstWeight: { $first: "$weightKg" },
          latestWeight: { $last: "$weightKg" },
          latestGoal: { $last: "$goal" },
        },
      },
      { $sort: { lastDate: -1 } },
    ])
    .toArray();
  const activity = await database
    .collection("activity_events")
    .aggregate([
      { $match: { memberId: { $in: ids }, timestamp: filter.date } },
      {
        $group: {
          _id: "$type",
          events: { $sum: 1 },
          lastEvent: { $max: "$timestamp" },
        },
      },
      { $sort: { events: -1 } },
    ])
    .toArray();
  const insights = await Promise.all(
    summary.map(async (row) => {
      const logs = await database
        .collection<DocumentLike & { memberId: number; date: Date }>(
          "workout_logs",
        )
        .find({ memberId: row._id })
        .sort({ date: -1, _id: -1 })
        .limit(2)
        .toArray();
      const volume = (doc: DocumentLike | undefined) =>
        Array.isArray(doc?.entries)
          ? doc.entries.reduce(
              (total: number, e: Entry) =>
                total + (e.completed ? e.sets * e.reps * e.weight : 0),
              0,
            )
          : 0;
      const rule = progressRule(
        row.sessions,
        row.completed,
        volume(logs[0]),
        volume(logs[1]),
      );
      const plans = await db.workoutPlan.findMany({
        where: {
          ...(actor.role === "TRAINER"
            ? { trainerId: actor.trainer?.id ?? -1 }
            : {}),
          goal: {
            contains: rule.completionRate < 70 ? "conditioning" : "strength",
          },
        },
        select: { id: true, name: true },
        take: 3,
      });
      return {
        ...row,
        memberName: members.find((m) => m.id === row._id)?.name,
        ...rule,
        suggestedPlans: plans,
      };
    }),
  );
  return {
    monthly,
    insights,
    activity,
    measurements: measurements.map((r) => ({
      ...r,
      memberName: members.find((m) => m.id === r._id)?.name,
      weightChange: r.latestWeight - r.firstWeight,
    })),
    exerciseCompletion: exerciseCompletion.map((r) => ({
      ...r,
      name: exercises.find((e) => e.id === r._id)?.name || `Exercise ${r._id}`,
    })),
  };
}
interface Entry {
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
}
interface DocumentLike {
  entries?: Entry[];
}
export async function reports(actor: Actor, url: URL) {
  const memberId = url.searchParams.get("memberId")
    ? positiveId(url.searchParams.get("memberId"))
    : undefined;
  const [overview, risks, workload] = await Promise.all([
    dashboard(actor),
    retention(actor),
    actor.role === "ADMIN"
      ? db.$queryRaw<
          Row[]
        >`SELECT * FROM sg_trainer_workload ORDER BY members DESC`
      : Promise.resolve([]),
  ]);
  let workout: Awaited<ReturnType<typeof workoutAnalytics>> | null = null,
    mongoError: string | null = null;
  try {
    workout = await workoutAnalytics(actor, memberId);
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    mongoError =
      "Workout analytics unavailable. Check MongoDB; MySQL reports remain available.";
  }
  const activity =
    actor.role === "ADMIN"
      ? await db.outbox.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
      : [];
  return {
    overview,
    retention: risks,
    workload,
    workout,
    mongoError,
    activity,
  };
}
