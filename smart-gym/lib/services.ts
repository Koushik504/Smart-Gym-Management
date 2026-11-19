import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ObjectId, type Filter, type Document } from "mongodb";
import { z } from "zod";
import { db, mongo, sql } from "./db";
import { type Actor, memberAccess } from "./auth";
import { HttpError } from "./http";
import { schemas, type Resource, positiveId } from "./validation";
import { day } from "./rules";
import { canAccess, type Operation } from "./permissions";

function authorize(actor: Actor, resource: string, operation: Operation) {
  if (!canAccess(actor.role, resource, operation))
    throw new HttpError(403, "You do not have permission for this action");
}

export function memberScope(actor: Actor): Prisma.MemberWhereInput {
  if (actor.role === "USER") return { userId: actor.id };
  return actor.role === "ADMIN" ? {} : { trainerId: actor.trainer?.id ?? -1 };
}
const requireAdmin = (actor: Actor) => {
  if (actor.role !== "ADMIN")
    throw new HttpError(403, "Administrator access required");
};
function dates(url: URL) {
  const parse = (key: string) => {
    const raw = url.searchParams.get(key);
    return raw ? new Date(z.iso.date().parse(raw) + "T00:00:00Z") : undefined;
  };
  const from = parse("from"),
    to = parse("to");
  if (from && to && from > to)
    throw new HttpError(422, "Start date must precede end date");
  return { from, to };
}
const range = (from?: Date, to?: Date) => ({
  ...(from ? { gte: from } : {}),
  ...(to ? { lt: new Date(+to + 86400000) } : {}),
});
async function mongoFilter(actor: Actor, url: URL): Promise<Filter<Document>> {
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const ids = await db.member.findMany({
    where: { ...memberScope(actor), ...(q ? { name: { contains: q } } : {}) },
    select: { id: true },
  });
  const requested = url.searchParams.get("memberId");
  if (requested) await memberAccess(actor, positiveId(requested));
  const { from, to } = dates(url);
  return {
    memberId: {
      $in: ids
        .map((m) => m.id)
        .filter((id) => !requested || id === positiveId(requested)),
    },
    ...(from || to
      ? {
          date: {
            $gte: from || new Date(0),
            $lt: to ? new Date(+to + 86400000) : new Date("9999-01-01"),
          },
        }
      : {}),
  };
}
export async function lookups(actor: Actor) {
  const [members, trainers, packages, exercises, plans, equipment] =
    await Promise.all([
      db.member.findMany({
        where: { ...memberScope(actor), active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.trainer.findMany({
        where:
          actor.role === "ADMIN"
            ? {}
            : {
                id:
                  actor.role === "USER"
                    ? (actor.member?.trainerId ?? -1)
                    : (actor.trainer?.id ?? -1),
              },
        include: { user: { select: { name: true } } },
      }),
      actor.role === "ADMIN"
        ? db.package.findMany({ where: { active: true } })
        : [],
      db.exercise.findMany({ orderBy: { name: "asc" } }),
      db.workoutPlan.findMany({
        where:
          actor.role === "ADMIN"
            ? {}
            : actor.role === "USER"
              ? { assignments: { some: { member: { userId: actor.id } } } }
              : { trainerId: actor.trainer?.id ?? -1 },
        include: { exercises: true },
      }),
      actor.role === "USER"
        ? []
        : db.equipment.findMany({ orderBy: { name: "asc" } }),
    ]);
  return {
    members,
    trainers: trainers.map((t) => ({ id: t.id, name: t.user.name })),
    packages,
    exercises,
    plans,
    equipment,
  };
}
export async function listResource(resource: Resource, actor: Actor, url: URL) {
  authorize(actor, resource, "read");
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const { from, to } = dates(url);
  const memberId = url.searchParams.get("memberId")
    ? positiveId(url.searchParams.get("memberId"))
    : undefined;
  if (memberId) await memberAccess(actor, memberId);
  const member = {
    ...memberScope(actor),
    ...(memberId ? { id: memberId } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };
  const status = url.searchParams.get("status");
  switch (resource) {
    case "members":
      return db.member.findMany({
        where: {
          ...member,
          name: { contains: q },
          ...(status === "ACTIVE"
            ? { active: true }
            : status === "INACTIVE"
              ? { active: false }
              : {}),
        },
        include: {
          trainer: { include: { user: { select: { name: true } } } },
          subscriptions: {
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              status: true,
              price: actor.role !== "TRAINER",
              package: { select: { id: true, name: true } },
              payment: { select: { status: true } },
            },
            orderBy: { endsAt: "desc" },
          },
        },
        orderBy: { id: "desc" },
        take: 200,
      });
    case "trainers":
      requireAdmin(actor);
      return db.trainer.findMany({
        where: { user: { name: { contains: q } } },
        include: {
          user: { select: { name: true, email: true, active: true } },
          _count: { select: { members: true, plans: true } },
        },
        take: 200,
      });
    case "packages":
      requireAdmin(actor);
      return db.package.findMany({
        where: { name: { contains: q } },
        orderBy: { price: "asc" },
        take: 200,
      });
    case "subscriptions":
      if (actor.role !== "USER") requireAdmin(actor);
      return db.subscription.findMany({
        where: {
          member,
          ...(status === "CANCELLED"
            ? { status: "CANCELLED" }
            : status === "EXPIRED"
              ? { status: "ACTIVE", endsAt: { lt: day() } }
              : status === "ACTIVE"
                ? {
                    status: "ACTIVE",
                    startsAt: { lte: day() },
                    endsAt: { gte: day() },
                    payment: { status: "PAID" },
                  }
                : {}),
          ...(from || to ? { createdAt: range(from, to) } : {}),
        },
        include: { member: true, package: true, payment: true },
        orderBy: { id: "desc" },
        take: 200,
      });
    case "attendance":
      return db.attendance.findMany({
        where: { member, ...(from || to ? { date: range(from, to) } : {}) },
        include: { member: true },
        orderBy: [{ date: "desc" }, { checkIn: "desc" }],
        take: 200,
      });
    case "equipment":
      requireAdmin(actor);
      return db.equipment.findMany({
        where: {
          name: { contains: q },
          ...(status
            ? {
                status: z
                  .enum(["AVAILABLE", "MAINTENANCE", "RETIRED"])
                  .parse(status),
              }
            : {}),
        },
        include: { _count: { select: { maintenance: true } } },
        take: 200,
      });
    case "maintenance":
      requireAdmin(actor);
      return db.maintenance.findMany({
        where: {
          ...(from || to ? { performedAt: range(from, to) } : {}),
          ...(q
            ? {
                OR: [
                  { description: { contains: q } },
                  { equipment: { name: { contains: q } } },
                ],
              }
            : {}),
        },
        include: { equipment: true },
        orderBy: { performedAt: "desc" },
        take: 200,
      });
    case "exercises":
      return db.exercise.findMany({
        where: { name: { contains: q } },
        include: { equipment: true },
        take: 200,
      });
    case "plans":
      return db.workoutPlan.findMany({
        where: {
          name: { contains: q },
          ...(actor.role === "TRAINER"
            ? { trainerId: actor.trainer?.id ?? -1 }
            : actor.role === "USER"
              ? { assignments: { some: { member: { userId: actor.id } } } }
              : {}),
        },
        include: {
          trainer: { include: { user: { select: { name: true } } } },
          exercises: { include: { exercise: true } },
          _count: { select: { assignments: true } },
        },
        take: 200,
      });
    case "assignments":
      return db.assignment.findMany({
        where: { member },
        include: { member: true, plan: true },
        orderBy: { assignedAt: "desc" },
        take: 200,
      });
    case "workouts":
    case "progress": {
      const filter = await mongoFilter(actor, url);
      const rows = await (
        await mongo()
      )
        .collection(
          resource === "workouts" ? "workout_logs" : "member_progress",
        )
        .find(filter)
        .sort({ date: -1, _id: -1 })
        .limit(200)
        .toArray();
      const names = await db.member.findMany({
        where: member,
        select: { id: true, name: true },
      });
      return rows.map((row) => ({
        ...row,
        id: row._id.toString(),
        memberName:
          names.find((m) => m.id === row.memberId)?.name ||
          `Member ${row.memberId}`,
      }));
    }
  }
}
async function ownPlan(actor: Actor, id: number) {
  const plan = await db.workoutPlan.findUnique({ where: { id } });
  if (!plan) throw new HttpError(404, "Workout plan not found");
  if (actor.role === "TRAINER" && plan.trainerId !== actor.trainer?.id)
    throw new HttpError(
      403,
      "Only the plan owner can change or assign this plan",
    );
  return plan;
}
export async function createResource(
  resource: Resource,
  actor: Actor,
  input: unknown,
) {
  authorize(actor, resource, "create");
  switch (resource) {
    case "members": {
      requireAdmin(actor);
      const { password, ...data } = schemas.members.parse(input);
      const passwordHash = password
        ? await bcrypt.hash(password, 12)
        : undefined;
      return db.$transaction(async (tx) => {
        const user = passwordHash
          ? await tx.user.create({
              data: {
                name: data.name,
                email: data.email,
                passwordHash,
                role: "USER",
              },
            })
          : null;
        const member = await tx.member.create({
          data: { ...data, userId: user?.id },
        });
        await tx.outbox.create({
          data: { type: "member.created", memberId: member.id, metadata: {} },
        });
        return member;
      });
    }
    case "trainers": {
      requireAdmin(actor);
      const { password, ...data } = schemas.trainers.parse(input);
      if (!password)
        throw new HttpError(
          422,
          "A password of at least 12 characters is required",
        );
      const passwordHash = await bcrypt.hash(password, 12);
      return db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            role: "TRAINER",
            passwordHash,
          },
        });
        return tx.trainer.create({
          data: {
            userId: user.id,
            specialty: data.specialty,
            phone: data.phone,
          },
        });
      });
    }
    case "packages":
      requireAdmin(actor);
      return db.package.create({ data: schemas.packages.parse(input) });
    case "equipment": {
      requireAdmin(actor);
      const data = schemas.equipment.parse(input);
      return db.equipment.create({
        data: {
          ...data,
          nextService: data.nextService ? new Date(data.nextService) : null,
        },
      });
    }
    case "exercises":
      return db.exercise.create({ data: schemas.exercises.parse(input) });
    case "plans": {
      const { exercises, ...data } = schemas.plans.parse(input);
      if (actor.role === "TRAINER" && data.trainerId !== actor.trainer?.id)
        throw new HttpError(
          403,
          "Create plans only under your trainer account",
        );
      return db.workoutPlan.create({
        data: { ...data, exercises: { create: exercises } },
      });
    }
    case "subscriptions": {
      requireAdmin(actor);
      const data = schemas.subscriptions.parse(input);
      const [result] = await sql().execute(
        "CALL sg_renew_membership(?,?,?,?,?)",
        [
          data.memberId,
          data.packageId,
          data.method,
          data.status,
          data.requestKey,
        ],
      );
      return { result };
    }
    case "attendance": {
      const data = schemas.attendance.parse(input);
      await memberAccess(actor, data.memberId, true);
      if (data.date !== day().toISOString().slice(0, 10))
        throw new HttpError(422, "Check-in is available for today (UTC) only");
      return db.$transaction(async (tx) => {
        const eligible = await tx.subscription.count({
          where: {
            memberId: data.memberId,
            status: "ACTIVE",
            startsAt: { lte: day() },
            endsAt: { gte: day() },
            payment: { status: "PAID" },
          },
        });
        if (!eligible)
          throw new HttpError(422, "An active, paid membership is required");
        const record = await tx.attendance.create({
          data: { memberId: data.memberId, date: new Date(data.date) },
        });
        await tx.outbox.create({
          data: {
            type: "attendance.checkin",
            memberId: data.memberId,
            metadata: { date: data.date },
          },
        });
        return record;
      });
    }
    case "assignments": {
      const data = schemas.assignments.parse(input);
      await memberAccess(actor, data.memberId, true);
      await ownPlan(actor, data.planId);
      return db.assignment.create({ data });
    }
    case "maintenance": {
      requireAdmin(actor);
      const data = schemas.maintenance.parse(input);
      return db.$transaction(async (tx) => {
        const record = await tx.maintenance.create({
          data: {
            equipmentId: data.equipmentId,
            performedAt: new Date(data.performedAt),
            description: data.description,
            cost: data.cost,
          },
        });
        await tx.equipment.update({
          where: { id: data.equipmentId },
          data: {
            status: data.status,
            nextService: new Date(data.nextService),
          },
        });
        return record;
      });
    }
    case "workouts":
    case "progress": {
      const data =
        resource === "workouts"
          ? schemas.workouts.parse(input)
          : schemas.progress.parse(input);
      await memberAccess(actor, data.memberId, true);
      if ("entries" in data) {
        const ids = [...new Set(data.entries.map((e) => e.exerciseId))];
        if (
          (await db.exercise.count({ where: { id: { in: ids } } })) !==
          ids.length
        )
          throw new HttpError(422, "One or more exercises do not exist");
      }
      return (await mongo())
        .collection(
          resource === "workouts" ? "workout_logs" : "member_progress",
        )
        .insertOne({
          ...data,
          date: new Date(data.date),
          createdBy: actor.id,
          createdAt: new Date(),
        });
    }
  }
}
export async function updateResource(
  resource: Resource,
  actor: Actor,
  key: string,
  input: unknown,
) {
  authorize(actor, resource, "update");
  if (resource === "workouts" || resource === "progress") {
    if (!ObjectId.isValid(key)) throw new HttpError(422, "Invalid document ID");
    const collection = (await mongo()).collection(
      resource === "workouts" ? "workout_logs" : "member_progress",
    );
    const record = await collection.findOne({ _id: new ObjectId(key) });
    if (!record) throw new HttpError(404, "Document not found");
    await memberAccess(actor, record.memberId);
    const data =
      resource === "workouts"
        ? schemas.workouts.parse(input)
        : schemas.progress.parse(input);
    if (data.memberId !== record.memberId)
      throw new HttpError(422, "Member reference cannot be changed");
    await memberAccess(actor, data.memberId, true);
    if ("entries" in data) {
      const ids = [...new Set(data.entries.map((e) => e.exerciseId))];
      if (
        (await db.exercise.count({ where: { id: { in: ids } } })) !== ids.length
      )
        throw new HttpError(422, "Exercise does not exist");
    }
    await collection.updateOne(
      { _id: record._id },
      { $set: { ...data, date: new Date(data.date), updatedAt: new Date() } },
    );
    return { updated: true };
  }
  const id = positiveId(key);
  switch (resource) {
    case "members": {
      requireAdmin(actor);
      const { password, ...data } = schemas.members.parse(input);
      const passwordHash = password
        ? await bcrypt.hash(password, 12)
        : undefined;
      return db.$transaction(async (tx) => {
        const member = await tx.member.findUniqueOrThrow({ where: { id } });
        let userId = member.userId;
        if (userId) {
          await tx.user.update({
            where: { id: userId },
            data: {
              name: data.name,
              email: data.email,
              ...(passwordHash ? { passwordHash } : {}),
            },
          });
          if (passwordHash) await tx.session.deleteMany({ where: { userId } });
        } else if (passwordHash) {
          userId = (
            await tx.user.create({
              data: {
                name: data.name,
                email: data.email,
                passwordHash,
                role: "USER",
              },
            })
          ).id;
        }
        return tx.member.update({ where: { id }, data: { ...data, userId } });
      });
    }
    case "trainers": {
      requireAdmin(actor);
      const { password, ...data } = schemas.trainers.parse(input);
      const trainer = await db.trainer.findUniqueOrThrow({ where: { id } });
      const passwordHash = password
        ? await bcrypt.hash(password, 12)
        : undefined;
      return db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: trainer.userId },
          data: {
            name: data.name,
            email: data.email,
            ...(passwordHash ? { passwordHash } : {}),
          },
        });
        if (passwordHash)
          await tx.session.deleteMany({ where: { userId: trainer.userId } });
        return tx.trainer.update({
          where: { id },
          data: { specialty: data.specialty, phone: data.phone },
        });
      });
    }
    case "packages":
      requireAdmin(actor);
      return db.package.update({
        where: { id },
        data: schemas.packages.parse(input),
      });
    case "equipment": {
      requireAdmin(actor);
      const data = schemas.equipment.parse(input);
      return db.equipment.update({
        where: { id },
        data: {
          ...data,
          nextService: data.nextService ? new Date(data.nextService) : null,
        },
      });
    }
    case "exercises":
      return db.exercise.update({
        where: { id },
        data: schemas.exercises.parse(input),
      });
    case "plans": {
      await ownPlan(actor, id);
      const { exercises, ...data } = schemas.plans.parse(input);
      if (actor.role === "TRAINER" && data.trainerId !== actor.trainer?.id)
        throw new HttpError(403, "Cannot transfer plan ownership");
      return db.$transaction(async (tx) => {
        await tx.planExercise.deleteMany({ where: { planId: id } });
        return tx.workoutPlan.update({
          where: { id },
          data: { ...data, exercises: { create: exercises } },
        });
      });
    }
    default:
      throw new HttpError(405, "This record cannot be edited");
  }
}
export async function deleteResource(
  resource: Resource,
  actor: Actor,
  key: string,
) {
  authorize(actor, resource, "delete");
  if (resource === "workouts" || resource === "progress") {
    if (!ObjectId.isValid(key)) throw new HttpError(422, "Invalid document ID");
    const collection = (await mongo()).collection(
      resource === "workouts" ? "workout_logs" : "member_progress",
    );
    const record = await collection.findOne({ _id: new ObjectId(key) });
    if (!record) throw new HttpError(404, "Document not found");
    await memberAccess(actor, record.memberId);
    await collection.deleteOne({ _id: record._id });
    return { deleted: true };
  }
  if (resource === "assignments") {
    const [memberId, planId] = key.split("-").map(positiveId);
    await memberAccess(actor, memberId);
    await ownPlan(actor, planId);
    return db.assignment.delete({
      where: { memberId_planId: { memberId, planId } },
    });
  }
  const id = positiveId(key);
  switch (resource) {
    case "members":
      requireAdmin(actor);
      return db.$transaction(async (tx) => {
        const record = await tx.member.update({
          where: { id },
          data: { active: false },
        });
        if (record.userId)
          await tx.session.deleteMany({ where: { userId: record.userId } });
        await tx.outbox.create({
          data: { type: "member.deactivated", memberId: id, metadata: {} },
        });
        return record;
      });
    case "packages":
      requireAdmin(actor);
      return db.package.update({ where: { id }, data: { active: false } });
    case "equipment":
      requireAdmin(actor);
      return db.equipment.update({
        where: { id },
        data: { status: "RETIRED" },
      });
    case "plans":
      await ownPlan(actor, id);
      return db.workoutPlan.delete({ where: { id } });
    case "exercises":
      requireAdmin(actor);
      return db.exercise.delete({ where: { id } });
    case "subscriptions":
      requireAdmin(actor);
      return db.subscription.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    default:
      throw new HttpError(405, "This historical record is retained");
  }
}
export async function payments(actor: Actor, url: URL) {
  if (actor.role !== "USER") requireAdmin(actor);
  const { from, to } = dates(url);
  const requested = url.searchParams.get("status");
  const status = requested
    ? z.enum(["PAID", "PENDING"]).parse(requested)
    : undefined;
  const memberId = url.searchParams.get("memberId")
    ? positiveId(url.searchParams.get("memberId"))
    : undefined;
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (memberId) await memberAccess(actor, memberId);
  return db.payment.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(from || to ? { createdAt: range(from, to) } : {}),
      subscription: {
        member: memberScope(actor),
        ...(memberId ? { memberId } : {}),
        ...(q
          ? { member: { ...memberScope(actor), name: { contains: q } } }
          : {}),
      },
    },
    include: { subscription: { include: { member: true, package: true } } },
    orderBy: { id: "desc" },
    take: 200,
  });
}
export async function settlePayment(actor: Actor, id: number) {
  requireAdmin(actor);
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id },
      include: { subscription: { include: { member: true } } },
    });
    if (
      !payment.subscription.member.active ||
      payment.subscription.status === "CANCELLED"
    )
      throw new HttpError(
        422,
        "Cannot settle for a cancelled subscription or deactivated member",
      );
    const changed = await tx.payment.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (!changed.count)
      throw new HttpError(409, "Payment has already been settled");
    await tx.outbox.create({
      data: {
        type: "payment.settled",
        memberId: payment.subscription.memberId,
        metadata: { paymentId: id },
      },
    });
    return { settled: true };
  });
}
export async function checkout(actor: Actor, key: string) {
  authorize(actor, "attendance", "update");
  const [rawId, date] = key.split("_");
  const memberId = positiveId(rawId);
  z.iso.date().parse(date);
  await memberAccess(actor, memberId);
  const result = await db.attendance.updateMany({
    where: { memberId, date: new Date(date), checkOut: null },
    data: { checkOut: new Date() },
  });
  if (!result.count)
    throw new HttpError(409, "Attendance is missing or already checked out");
  return { checkedOut: true };
}
