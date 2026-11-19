import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { db, sql } from "./db";
import { HttpError } from "./http";

const id = z.coerce.number().int().positive();
export const procedureSchema = z.discriminatedUnion("procedure", [
  z.object({ procedure: z.literal("sg_member_summary"), memberId: id }),
  z.object({ procedure: z.literal("sg_trainer_members"), trainerId: id }),
  z.object({
    procedure: z.literal("sg_top_attendance"),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
]);
export const functionSchema = z.discriminatedUnion("functionName", [
  z.object({ functionName: z.literal("sg_membership_end"), memberId: id }),
  z.object({ functionName: z.literal("sg_is_member_active"), memberId: id }),
  z.object({
    functionName: z.literal("sg_attendance_rate"),
    memberId: id,
    days: z.coerce.number().int().min(1).max(365).default(30),
  }),
]);

async function existingMember(memberId: number) {
  if (
    !(await db.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    }))
  )
    throw new HttpError(404, "Member not found");
}
export async function executeProcedure(input: unknown) {
  const value = procedureSchema.parse(input);
  let statement: string;
  let parameter: number;
  switch (value.procedure) {
    case "sg_member_summary":
      await existingMember(value.memberId);
      statement = "CALL sg_member_summary(?)";
      parameter = value.memberId;
      break;
    case "sg_trainer_members":
      if (
        !(await db.trainer.findUnique({
          where: { id: value.trainerId },
          select: { id: true },
        }))
      )
        throw new HttpError(404, "Trainer not found");
      statement = "CALL sg_trainer_members(?)";
      parameter = value.trainerId;
      break;
    case "sg_top_attendance":
      statement = "CALL sg_top_attendance(?)";
      parameter = value.limit;
  }
  const [sets] = await sql().query<RowDataPacket[][]>(statement, [parameter]);
  return { procedure: value.procedure, rows: sets[0] };
}
export async function executeFunction(input: unknown) {
  const value = functionSchema.parse(input);
  await existingMember(value.memberId);
  const statements = {
    sg_membership_end: "SELECT sg_membership_end(?) AS result",
    sg_is_member_active: "SELECT sg_is_member_active(?) AS result",
    sg_attendance_rate: "SELECT sg_attendance_rate(?,?) AS result",
  };
  const [rows] = await sql().execute<RowDataPacket[]>(
    statements[value.functionName],
    "days" in value ? [value.memberId, value.days] : [value.memberId],
  );
  return { ...value, result: rows[0].result };
}

// Only fixed SQL statements can be selected; no submitted SQL/identifiers run.
export const databaseReports = {
  "active-memberships":
    "SELECT * FROM sg_active_memberships ORDER BY endsAt,memberId LIMIT 200",
  "monthly-revenue":
    "SELECT * FROM sg_monthly_revenue ORDER BY month DESC LIMIT 200",
  "trainer-workload":
    "SELECT * FROM sg_trainer_workload ORDER BY members DESC,id LIMIT 200",
  "attendance-summary":
    "SELECT * FROM sg_attendance_summary ORDER BY visits DESC,id LIMIT 200",
  "payment-audit":
    "SELECT id,entity,entityId,action,details,createdAt FROM sg_audit ORDER BY createdAt DESC,id DESC LIMIT 200",
};
export const analyticsReports = {
  "attendance-leaderboard": `WITH recent_visits AS (
    SELECT memberId,COUNT(*) AS visits FROM sg_attendance
    WHERE date BETWEEN UTC_DATE()-INTERVAL 29 DAY AND UTC_DATE() GROUP BY memberId
  ) SELECT m.id,m.name,r.visits,DENSE_RANK() OVER (ORDER BY r.visits DESC) AS attendanceRank
    FROM recent_visits r JOIN sg_members m ON m.id=r.memberId ORDER BY r.visits DESC,m.id LIMIT 200`,
  "package-performance": `SELECT pkg.id,pkg.name,COUNT(s.id) AS subscriptions,
    COALESCE(SUM(CASE WHEN pay.status='PAID' THEN pay.amount ELSE 0 END),0) AS paidRevenue
    FROM sg_packages pkg LEFT JOIN sg_subscriptions s ON s.packageId=pkg.id
    LEFT JOIN sg_payments pay ON pay.subscriptionId=s.id
    GROUP BY pkg.id,pkg.name ORDER BY paidRevenue DESC,pkg.id LIMIT 200`,
  "inactive-members": `WITH last_visits AS (
    SELECT memberId,MAX(date) AS lastVisit FROM sg_attendance WHERE date<=UTC_DATE() GROUP BY memberId
  ) SELECT m.id,m.name,v.lastVisit,DATEDIFF(UTC_DATE(),v.lastVisit) AS daysSinceVisit
    FROM sg_members m LEFT JOIN last_visits v ON v.memberId=m.id
    WHERE m.active=1 AND (v.lastVisit IS NULL OR v.lastVisit<UTC_DATE()-INTERVAL 14 DAY)
    ORDER BY v.lastVisit,m.id LIMIT 200`,
};
export async function queryReport(kind: "database" | "analytics", url: URL) {
  const queries = kind === "database" ? databaseReports : analyticsReports;
  const report = url.searchParams.get("report") || Object.keys(queries)[0];
  if (!Object.hasOwn(queries, report))
    throw new HttpError(422, "Unknown report");
  const [rows] = await sql().query<RowDataPacket[]>(
    queries[report as keyof typeof queries],
  );
  return { report, rows, limit: 200 };
}
