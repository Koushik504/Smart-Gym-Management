import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { db, mongo, sql, closeDatabases } from "../lib/db";
import { day } from "../lib/rules";
import { deliverOutbox } from "../lib/outbox";
import type { Row } from "../components/data";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3100";
const results: { name: string; passed: boolean; error?: string }[] = [];
const run = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log("PASS", name);
  } catch (error) {
    results.push({ name, passed: false, error: (error as Error).message });
    console.error("FAIL", name, (error as Error).message);
  }
};
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  withOrigin = true,
): Promise<{ status: number; body: Row; cookie: string }> {
  // Management writes use the dedicated admin namespace, as the UI does.
  if (
    method !== "GET" &&
    [
      "members",
      "trainers",
      "packages",
      "subscriptions",
      "equipment",
      "maintenance",
      "payments",
      "outbox",
    ].includes(path.split("/")[0])
  )
    path = "admin/" + path;
  const response = await fetch(origin + "/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(withOrigin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
let admin = "",
  trainer = "",
  regularUser = "",
  memberUserId = 0,
  memberId = 0,
  otherMemberId = 0,
  planId = 0,
  equipmentId = 0,
  exerciseId = 0,
  pkgId = 0,
  testTrainerId = 0,
  testUserId = 0,
  workoutId = "",
  progressId = "";
const suffix = randomUUID().slice(0, 8),
  today = day().toISOString().slice(0, 10);
const expectStatus = (
  response: { status: number; body: unknown },
  status: number,
) => assert.equal(response.status, status, JSON.stringify(response.body));
try {
  await run("MySQL 8 connectivity and MongoDB ping", async () => {
    const [row] = await db.$queryRaw<
      { version: string; port: number; databaseName: string }[]
    >`SELECT VERSION() version, @@port port, DATABASE() databaseName`;
    assert.match(row.version, /^8\./);
    const configured = new URL(process.env.DATABASE_URL!);
    assert.equal(Number(row.port), Number(configured.port || 3306));
    assert.equal(row.databaseName, configured.pathname.slice(1));
    assert.equal((await (await mongo()).command({ ping: 1 })).ok, 1);
  });
  await run("Anonymous API access denied", async () => {
    expectStatus(await request("members"), 401);
  });
  await run("Origin protection rejects credential mutations", async () => {
    expectStatus(
      await request(
        "auth/login",
        "POST",
        {
          email: "admin@smartgym.local",
          password: process.env.SEED_ADMIN_PASSWORD,
        },
        "",
        false,
      ),
      403,
    );
  });
  await run("Authentication rejects incorrect passwords", async () => {
    expectStatus(
      await request("auth/login", "POST", {
        email: "admin@smartgym.local",
        password: "not-the-password",
      }),
      401,
    );
  });
  await run("Admin and trainer login issue opaque sessions", async () => {
    const a = await request("auth/login", "POST", {
      email: "admin@smartgym.local",
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    expectStatus(a, 200);
    admin = a.cookie;
    assert.ok(admin);
    const t = await request("auth/login", "POST", {
      email: "aarav@smartgym.local",
      password: process.env.SEED_TRAINER_PASSWORD,
    });
    expectStatus(t, 200);
    trainer = t.cookie;
    assert.ok(trainer);
  });
  const actor = await db.trainer.findFirstOrThrow({
    where: { user: { email: "aarav@smartgym.local" } },
  });
  const other = await db.trainer.findFirstOrThrow({
    where: { id: { not: actor.id } },
  });
  await run("Trainer cannot access finances or create members", async () => {
    expectStatus(await request("payments", "GET", undefined, trainer), 403);
    expectStatus(await request("members", "POST", {}, trainer), 403);
  });
  await run(
    "Dedicated read routes, health and auth/me use live databases",
    async () => {
      for (const path of [
        "auth/me",
        "me",
        "lookups",
        "dashboard",
        "reports",
        "payments",
        "members",
        "trainers",
        "packages",
        "subscriptions",
        "attendance",
        "equipment",
        "maintenance",
        "exercises",
        "plans",
        "assignments",
        "workouts",
        "progress",
      ]) {
        const response = await request(path, "GET", undefined, admin);
        assert.equal(
          response.status,
          200,
          `${path}: ${JSON.stringify(response.body)}`,
        );
      }
      const health = await request("health", "GET", undefined, admin);
      expectStatus(health, 200);
      assert.deepEqual(health.body, {
        status: "ok",
        mysql: "up",
        mongodb: "up",
      });
      const me = await request("auth/me", "GET", undefined, admin);
      assert.equal(me.body.role, "ADMIN");
      assert.equal(me.body.passwordHash, undefined);
      expectStatus(
        await request("unknown-resource", "GET", undefined, admin),
        404,
      );
      // Next.js supplies the 405 response without a JSON body.
      const unsupported = await fetch(origin + "/api/admin/trainers/1", {
        method: "DELETE",
        headers: { Origin: origin, Cookie: admin },
      });
      assert.equal(unsupported.status, 405);
    },
  );
  await run(
    "Admin database APIs reject anonymous and trainer access",
    async () => {
      for (const path of [
        "admin/stored-procedures",
        "admin/stored-functions",
        "admin/database-reports",
        "admin/analytics",
        "health",
      ]) {
        expectStatus(await request(path), 401);
        expectStatus(await request(path, "GET", undefined, trainer), 403);
      }
      for (const path of [
        "admin/stored-procedures",
        "admin/stored-functions",
      ]) {
        expectStatus(await request(path, "POST", {}, trainer), 403);
        expectStatus(await request(path, "POST", {}, admin, false), 403);
      }
    },
  );
  await run(
    "All SQL views and CTE analytics execute through admin routes",
    async () => {
      for (const report of [
        "active-memberships",
        "monthly-revenue",
        "trainer-workload",
        "attendance-summary",
        "payment-audit",
      ]) {
        const response = await request(
          "admin/database-reports?report=" + report,
          "GET",
          undefined,
          admin,
        );
        expectStatus(response, 200);
        assert.ok(Array.isArray(response.body.rows), report);
        assert.equal(response.body.report, report);
      }
      for (const report of [
        "attendance-leaderboard",
        "package-performance",
        "inactive-members",
      ]) {
        const response = await request(
          "admin/analytics?report=" + report,
          "GET",
          undefined,
          admin,
        );
        expectStatus(response, 200);
        assert.ok(Array.isArray(response.body.rows), report);
      }
    },
  );
  await run(
    "Database APIs validate operation names, ranges, IDs and JSON",
    async () => {
      for (const body of [
        { procedure: "sg_member_summary; DROP TABLE sg_members", memberId: 1 },
        { procedure: "sg_member_summary", memberId: "1 OR 1=1" },
        { procedure: "sg_top_attendance", limit: 101 },
      ])
        expectStatus(
          await request("admin/stored-procedures", "POST", body, admin),
          422,
        );
      expectStatus(
        await request(
          "admin/stored-functions",
          "POST",
          { functionName: "sg_attendance_rate", memberId: 1, days: 0 },
          admin,
        ),
        422,
      );
      expectStatus(
        await request(
          "admin/stored-functions",
          "POST",
          { functionName: "sg_is_member_active", memberId: 2147483647 },
          admin,
        ),
        404,
      );
      for (const path of ["admin/database-reports", "admin/analytics"]) {
        expectStatus(
          await request(path + "?report=__proto__", "GET", undefined, admin),
          422,
        );
      }
      const invalid = await fetch(origin + "/api/admin/stored-functions", {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: admin,
          "Content-Type": "application/json",
        },
        body: "{",
      });
      assert.equal(invalid.status, 400);
    },
  );
  await run(
    "Create member, edit fields and assign trainer persist",
    async () => {
      const a = await request(
        "members",
        "POST",
        {
          name: "Integration " + suffix,
          email: `test-${suffix}@smartgym.local`,
          goal: "Strength",
          trainerId: actor.id,
          password: "FixtureMember!" + suffix,
        },
        admin,
      );
      expectStatus(a, 201);
      memberId = a.body.id;
      memberUserId = a.body.userId;
      const b = await request(
        "members/" + memberId,
        "PATCH",
        {
          name: "Updated " + suffix,
          email: `test-${suffix}@smartgym.local`,
          goal: "Consistency",
          trainerId: actor.id,
        },
        admin,
      );
      expectStatus(b, 200);
      assert.equal(
        (await db.member.findUniqueOrThrow({ where: { id: memberId } })).name,
        "Updated " + suffix,
      );
      const c = await request(
        "members",
        "POST",
        {
          name: "Other " + suffix,
          email: `other-${suffix}@smartgym.local`,
          goal: "Strength",
          trainerId: other.id,
        },
        admin,
      );
      expectStatus(c, 201);
      otherMemberId = c.body.id;
    },
  );
  await run("Trainer access is restricted to assigned members", async () => {
    expectStatus(
      await request("members/" + memberId, "GET", undefined, trainer),
      200,
    );
    expectStatus(
      await request("members/" + otherMemberId, "GET", undefined, trainer),
      403,
    );
    const list = await request("members", "GET", undefined, trainer);
    assert.ok(
      list.body.every((m: { trainerId: number }) => m.trainerId === actor.id),
    );
  });
  await run(
    "Regular member login is scoped to own records and cannot manage the gym",
    async () => {
      const login = await request("auth/login", "POST", {
        email: `test-${suffix}@smartgym.local`,
        password: "FixtureMember!" + suffix,
      });
      expectStatus(login, 200);
      regularUser = login.cookie;
      assert.equal(login.body.role, "USER");
      const me = await request("auth/me", "GET", undefined, regularUser);
      assert.equal(me.body.member.id, memberId);
      assert.equal(me.body.passwordHash, undefined);
      const members = await request("members", "GET", undefined, regularUser);
      expectStatus(members, 200);
      assert.deepEqual(
        members.body.map((m: Row) => m.id),
        [memberId],
      );
      expectStatus(
        await request(
          "members/" + otherMemberId,
          "GET",
          undefined,
          regularUser,
        ),
        403,
      );
      for (const path of [
        "members",
        "trainers",
        "packages",
        "subscriptions",
        "equipment",
        "maintenance",
        "attendance",
        "plans",
        "assignments",
        "exercises",
        "outbox",
      ]) {
        expectStatus(
          await request("admin/" + path, "POST", {}, regularUser),
          403,
        );
      }
      for (const path of [
        "admin/members/" + memberId,
        "admin/packages/1",
        "admin/equipment/1",
        "admin/payments/1",
      ]) {
        expectStatus(await request(path, "PATCH", {}, regularUser), 403);
      }
      expectStatus(
        await request(
          "admin/members/" + otherMemberId,
          "DELETE",
          undefined,
          regularUser,
        ),
        403,
      );
      for (const path of ["plans", "assignments", "attendance", "exercises"]) {
        expectStatus(await request(path, "POST", {}, regularUser), 403);
      }
      for (const path of [
        "reports",
        "dashboard",
        "trainers",
        "equipment",
        "maintenance",
        "health",
        "admin/database-reports",
        "admin/analytics",
        "admin/stored-procedures",
        "admin/stored-functions",
      ]) {
        expectStatus(await request(path, "GET", undefined, regularUser), 403);
      }
      const legacy = await fetch(origin + "/api/members", {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: regularUser,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      assert.equal(legacy.status, 405);
    },
  );
  await run(
    "Stored procedure and functions return the persisted member state",
    async () => {
      const response = await request(
        "admin/stored-procedures",
        "POST",
        { procedure: "sg_member_summary", memberId },
        admin,
      );
      expectStatus(response, 200);
      assert.equal(response.body.rows[0].id, memberId);
      assert.equal(response.body.rows[0].name, "Updated " + suffix);
      const assigned = await request(
        "admin/stored-procedures",
        "POST",
        { procedure: "sg_trainer_members", trainerId: actor.id },
        admin,
      );
      expectStatus(assigned, 200);
      assert.ok(assigned.body.rows.some((row: Row) => row.id === memberId));
      const active = await request(
        "admin/stored-functions",
        "POST",
        { functionName: "sg_is_member_active", memberId },
        admin,
      );
      expectStatus(active, 200);
      assert.equal(Number(active.body.result), 0);
      const end = await request(
        "admin/stored-functions",
        "POST",
        { functionName: "sg_membership_end", memberId },
        admin,
      );
      expectStatus(end, 200);
      assert.equal(end.body.result, null);
    },
  );
  await run(
    "Server validation and unique constraints reject invalid members",
    async () => {
      expectStatus(
        await request("members", "POST", { name: "x", email: "bad" }, admin),
        422,
      );
      expectStatus(
        await request(
          "members",
          "POST",
          {
            name: "Duplicate",
            email: `test-${suffix}@smartgym.local`,
            goal: "Strength",
          },
          admin,
        ),
        409,
      );
    },
  );
  await run("Package creation and database CHECK enforcement", async () => {
    const p = await request(
      "packages",
      "POST",
      {
        name: "Integration " + suffix,
        price: 1000,
        durationDays: 30,
        active: true,
      },
      admin,
    );
    expectStatus(p, 201);
    pkgId = p.body.id;
    await assert.rejects(
      () =>
        db.$executeRaw`INSERT INTO sg_packages(name,price,durationDays,active) VALUES (${`invalid-${suffix}`},-1,30,1)`,
    );
  });
  let paymentId = 0,
    subscriptionId = 0;
  const requestKey = randomUUID();
  await run(
    "Renewal procedure creates pending payment and is idempotent",
    async () => {
      const body = {
        memberId,
        packageId: pkgId,
        method: "UPI",
        status: "PENDING",
        requestKey,
      };
      expectStatus(await request("subscriptions", "POST", body, admin), 201);
      expectStatus(await request("subscriptions", "POST", body, admin), 201);
      assert.equal(await db.subscription.count({ where: { requestKey } }), 1);
      const sub = await db.subscription.findUniqueOrThrow({
        where: { requestKey },
        include: { payment: true },
      });
      subscriptionId = sub.id;
      paymentId = sub.payment!.id;
      assert.equal(sub.payment!.status, "PENDING");
    },
  );
  await run(
    "Pending membership cannot check in; paid settlement unlocks check-in",
    async () => {
      expectStatus(
        await request("attendance", "POST", { memberId, date: today }, trainer),
        422,
      );
      expectStatus(
        await request("payments/" + paymentId, "PATCH", {}, admin),
        200,
      );
      expectStatus(
        await request("payments/" + paymentId, "PATCH", {}, admin),
        409,
      );
      expectStatus(
        await request("attendance", "POST", { memberId, date: today }, trainer),
        201,
      );
    },
  );
  await run(
    "Duplicate attendance and inverted check-out are rejected",
    async () => {
      expectStatus(
        await request("attendance", "POST", { memberId, date: today }, admin),
        409,
      );
      const attendance = await db.attendance.findUniqueOrThrow({
        where: { memberId_date: { memberId, date: new Date(today) } },
      });
      await assert.rejects(() =>
        db.attendance.update({
          where: { memberId_date: { memberId, date: new Date(today) } },
          data: { checkOut: new Date(+attendance.checkIn - 1000) },
        }),
      );
      expectStatus(
        await request(`attendance/${memberId}_${today}`, "PATCH", {}, trainer),
        200,
      );
    },
  );
  await run(
    "SQL attendance functions and leaderboard reflect a real check-in",
    async () => {
      const rate = await request(
        "admin/stored-functions",
        "POST",
        { functionName: "sg_attendance_rate", memberId, days: 30 },
        admin,
      );
      expectStatus(rate, 200);
      assert.equal(Number(rate.body.result), 3.33);
      const active = await request(
        "admin/stored-functions",
        "POST",
        { functionName: "sg_is_member_active", memberId },
        admin,
      );
      expectStatus(active, 200);
      assert.equal(Number(active.body.result), 1);
      const top = await request(
        "admin/stored-procedures",
        "POST",
        { procedure: "sg_top_attendance", limit: 100 },
        admin,
      );
      expectStatus(top, 200);
      assert.ok(
        top.body.rows.some(
          (row: Row) => row.id === memberId && Number(row.visits) === 1,
        ),
      );
    },
  );
  await run(
    "Concurrent renewals serialize into non-overlapping periods",
    async () => {
      const payload = {
        memberId,
        packageId: pkgId,
        method: "CASH",
        status: "PAID",
      };
      const responses = await Promise.all([
        request(
          "subscriptions",
          "POST",
          { ...payload, requestKey: randomUUID() },
          admin,
        ),
        request(
          "subscriptions",
          "POST",
          { ...payload, requestKey: randomUUID() },
          admin,
        ),
      ]);
      responses.forEach((r) => expectStatus(r, 201));
      const rows = await db.subscription.findMany({
        where: { memberId },
        orderBy: { startsAt: "asc" },
      });
      assert.equal(rows.length, 3);
      for (let i = 1; i < rows.length; i++)
        assert.ok(rows[i].startsAt > rows[i - 1].endsAt);
    },
  );
  await run(
    "Procedure rollback leaves no subscription or outbox on payment failure",
    async () => {
      const count = await db.subscription.count({ where: { memberId } }),
        events = await db.outbox.count({ where: { memberId } });
      await assert.rejects(() =>
        sql().execute("CALL sg_renew_membership(?,?,?,?,?)", [
          memberId,
          pkgId,
          "INVALID",
          "PAID",
          randomUUID(),
        ]),
      );
      assert.equal(await db.subscription.count({ where: { memberId } }), count);
      assert.equal(await db.outbox.count({ where: { memberId } }), events);
    },
  );
  await run(
    "Interactive transaction rolls back subscription when trigger rejects payment",
    async () => {
      const key = randomUUID();
      await assert.rejects(() =>
        db.$transaction(async (tx) => {
          const sub = await tx.subscription.create({
            data: {
              memberId,
              packageId: pkgId,
              startsAt: new Date(today),
              endsAt: new Date(today),
              price: 1000,
              requestKey: key,
            },
          });
          await tx.payment.create({
            data: {
              subscriptionId: sub.id,
              amount: 1,
              method: "CASH",
              status: "PAID",
              paidAt: new Date(),
            },
          });
        }),
      );
      assert.equal(
        await db.subscription.count({ where: { requestKey: key } }),
        0,
      );
    },
  );
  await run(
    "SQL views, triggers and foreign keys operate on real records",
    async () => {
      const rows = await db.$queryRaw<
        { memberId: number }[]
      >`SELECT memberId FROM sg_active_memberships WHERE memberId=${memberId}`;
      assert.ok(rows.length);
      assert.ok(
        (await db.audit.count({
          where: { entity: "payment", entityId: paymentId },
        })) >= 2,
      );
      await assert.rejects(() => db.member.delete({ where: { id: memberId } }));
      await request(
        "subscriptions/" + subscriptionId,
        "DELETE",
        undefined,
        admin,
      );
      assert.equal(
        (
          await db.subscription.findUniqueOrThrow({
            where: { id: subscriptionId },
          })
        ).status,
        "CANCELLED",
      );
      assert.ok(
        (await db.audit.count({
          where: { entity: "subscription", entityId: subscriptionId },
        })) > 0,
      );
    },
  );
  await run(
    "Equipment inventory and maintenance transaction persist",
    async () => {
      const e = await request(
        "equipment",
        "POST",
        {
          name: "Test equipment " + suffix,
          quantity: 2,
          status: "AVAILABLE",
          nextService: today,
        },
        admin,
      );
      expectStatus(e, 201);
      equipmentId = e.body.id;
      expectStatus(
        await request(
          "maintenance",
          "POST",
          {
            equipmentId,
            performedAt: today,
            description: "Integration service",
            cost: 100,
            nextService: new Date(+day() + 30 * 86400000)
              .toISOString()
              .slice(0, 10),
            status: "AVAILABLE",
          },
          admin,
        ),
        201,
      );
      assert.equal(await db.maintenance.count({ where: { equipmentId } }), 1);
    },
  );
  await run(
    "Exercise catalog, plan creation and trainer assignment",
    async () => {
      const e = await request(
        "exercises",
        "POST",
        {
          name: "Test movement " + suffix,
          muscleGroup: "Core",
          equipmentId,
          defaultSets: 3,
          defaultReps: 10,
        },
        trainer,
      );
      expectStatus(e, 201);
      exerciseId = e.body.id;
      const p = await request(
        "plans",
        "POST",
        {
          name: "Integration plan " + suffix,
          goal: "Strength",
          durationWeeks: 6,
          trainerId: actor.id,
          exercises: [{ exerciseId, sets: 3, reps: 10 }],
        },
        trainer,
      );
      expectStatus(p, 201);
      planId = p.body.id;
      expectStatus(
        await request("assignments", "POST", { memberId, planId }, trainer),
        201,
      );
      expectStatus(
        await request(
          "assignments",
          "POST",
          { memberId: otherMemberId, planId },
          trainer,
        ),
        403,
      );
    },
  );
  await run("MongoDB workout CRUD, filters and aggregation", async () => {
    const body = {
      memberId,
      date: today,
      durationMinutes: 45,
      status: "COMPLETED",
      entries: [{ exerciseId, sets: 3, reps: 10, weight: 20, completed: true }],
      notes: "Integration workout",
    };
    const w = await request("workouts", "POST", body, trainer);
    expectStatus(w, 201);
    workoutId = w.body.insertedId;
    expectStatus(
      await request(
        "workouts/" + workoutId,
        "PATCH",
        { ...body, notes: "Updated integration log" },
        trainer,
      ),
      200,
    );
    const list = await request(
      "workouts?memberId=" + memberId + "&from=" + today + "&to=" + today,
      "GET",
      undefined,
      trainer,
    );
    assert.ok(list.body.some((w: { id: string }) => w.id === workoutId));
    expectStatus(
      await request(
        "workouts/" + workoutId,
        "PATCH",
        { ...body, memberId: otherMemberId },
        trainer,
      ),
      422,
    );
    const reports = await request(
      "reports?memberId=" + memberId,
      "GET",
      undefined,
      trainer,
    );
    expectStatus(reports, 200);
    assert.equal(reports.body.workout.insights[0].sessions, 1);
    assert.equal(reports.body.workout.exerciseCompletion[0].volume, 600);
  });
  await run("MongoDB progress CRUD and document validation", async () => {
    const body = {
      memberId,
      date: today,
      weightKg: 70,
      waistCm: 80,
      goal: "Consistency",
      notes: "Integration progress",
    };
    const p = await request("progress", "POST", body, trainer);
    expectStatus(p, 201);
    progressId = p.body.insertedId;
    expectStatus(
      await request(
        "progress/" + progressId,
        "PATCH",
        { ...body, weightKg: 69 },
        trainer,
      ),
      200,
    );
    await assert.rejects(() =>
      mongo().then((d) =>
        d
          .collection("workout_logs")
          .insertOne({ memberId: 0, date: "invalid" }),
      ),
    );
  });
  await run(
    "Members read own financial history and assigned plans, and edit only own logs",
    async () => {
      for (const path of [
        "subscriptions",
        "payments",
        "attendance",
        "assignments",
        "workouts",
        "progress",
      ]) {
        const response = await request(path, "GET", undefined, regularUser);
        expectStatus(response, 200);
        assert.ok(
          response.body.every(
            (row: Row) =>
              (row.memberId ?? row.subscription?.memberId) === memberId,
          ),
          path,
        );
        expectStatus(
          await request(
            path + "?memberId=" + otherMemberId,
            "GET",
            undefined,
            regularUser,
          ),
          403,
        );
      }
      const plans = await request("plans", "GET", undefined, regularUser);
      expectStatus(plans, 200);
      assert.deepEqual(
        plans.body.map((plan: Row) => plan.id),
        [planId],
      );
      const lookups = await request("lookups", "GET", undefined, regularUser);
      assert.deepEqual(
        lookups.body.members.map((m: Row) => m.id),
        [memberId],
      );
      assert.equal(lookups.body.equipment.length, 0);
      const body = {
        memberId,
        date: today,
        durationMinutes: 20,
        status: "COMPLETED",
        notes: "Member-created log",
        entries: [
          { exerciseId, sets: 2, reps: 10, weight: 5, completed: true },
        ],
      };
      expectStatus(
        await request(
          "workouts",
          "POST",
          { ...body, memberId: otherMemberId },
          regularUser,
        ),
        403,
      );
      const created = await request("workouts", "POST", body, regularUser);
      expectStatus(created, 201);
      expectStatus(
        await request(
          "workouts/" + created.body.insertedId,
          "PATCH",
          { ...body, notes: "Updated by owner" },
          regularUser,
        ),
        200,
      );
      expectStatus(
        await request(
          "workouts/" + created.body.insertedId,
          "DELETE",
          undefined,
          regularUser,
        ),
        200,
      );
      // A real document owned by a different member must remain inaccessible by ID.
      const database = await mongo();
      const foreign = await database.collection("member_progress").insertOne({
        memberId: otherMemberId,
        date: day(),
        weightKg: 70,
        waistCm: 80,
        goal: "Strength",
        notes: "Owned by someone else",
        createdBy: 1,
        createdAt: new Date(),
      });
      try {
        expectStatus(
          await request(
            "progress/" + foreign.insertedId,
            "DELETE",
            undefined,
            regularUser,
          ),
          403,
        );
        expectStatus(
          await request(
            "progress/" + foreign.insertedId,
            "PATCH",
            {
              memberId: otherMemberId,
              date: today,
              weightKg: 71,
              waistCm: 80,
              goal: "Strength",
            },
            regularUser,
          ),
          403,
        );
        assert.ok(
          await database
            .collection("member_progress")
            .findOne({ _id: foreign.insertedId }),
        );
      } finally {
        await database
          .collection("member_progress")
          .deleteOne({ _id: foreign.insertedId });
      }
    },
  );
  await run(
    "Dashboard metrics, search and date filters use persisted records",
    async () => {
      const d = await request("dashboard", "GET", undefined, admin);
      expectStatus(d, 200);
      assert.equal(
        d.body.metrics.totalMembers,
        await db.member.count({ where: { active: true } }),
      );
      const s = await request(
        "members?q=Updated%20" + suffix,
        "GET",
        undefined,
        admin,
      );
      assert.equal(s.body.length, 1);
      const a = await request(
        "attendance?memberId=" + memberId + "&from=" + today + "&to=" + today,
        "GET",
        undefined,
        trainer,
      );
      assert.equal(a.body.length, 1);
    },
  );
  await run("Outbox retries safely and events are not duplicated", async () => {
    const a = await deliverOutbox();
    assert.equal(a.failed, 0);
    const database = await mongo(),
      before = await database
        .collection("activity_events")
        .countDocuments({ memberId });
    await db.outbox.updateMany({
      where: { memberId },
      data: { processedAt: null },
    });
    await deliverOutbox();
    assert.equal(
      await database.collection("activity_events").countDocuments({ memberId }),
      before,
    );
  });
  await run(
    "Safe disposable SQL CREATE ALTER INSERT UPDATE DELETE DROP demonstration",
    async () => {
      const name = "sg_demo_" + suffix.replaceAll("-", "");
      const connection = await sql().getConnection();
      try {
        await connection.query(`CREATE TABLE ${name}(id INT PRIMARY KEY)`);
        await connection.query(
          `ALTER TABLE ${name} ADD value INT NOT NULL DEFAULT 0`,
        );
        await connection.query(`INSERT INTO ${name} VALUES(1,1)`);
        await connection.query(`UPDATE ${name} SET value=2 WHERE id=1`);
        await connection.query(`DELETE FROM ${name} WHERE id=1`);
      } finally {
        await connection.query(`DROP TABLE IF EXISTS ${name}`);
        connection.release();
      }
    },
  );
  await run(
    "MongoDB deletes and member deactivation preserve relational history",
    async () => {
      expectStatus(
        await request("workouts/" + workoutId, "DELETE", undefined, trainer),
        200,
      );
      workoutId = "";
      expectStatus(
        await request("progress/" + progressId, "DELETE", undefined, trainer),
        200,
      );
      progressId = "";
      expectStatus(
        await request("members/" + memberId, "DELETE", undefined, admin),
        200,
      );
      assert.equal(
        (await db.member.findUniqueOrThrow({ where: { id: memberId } })).active,
        false,
      );
      expectStatus(
        await request("members", "GET", undefined, regularUser),
        401,
      );
      expectStatus(
        await request("auth/login", "POST", {
          email: `test-${suffix}@smartgym.local`,
          password: "FixtureMember!" + suffix,
        }),
        401,
      );
      assert.ok(
        (await db.payment.count({ where: { subscription: { memberId } } })) > 0,
      );
    },
  );
  await run(
    "Trainer financial fields are excluded and injection-shaped filters are rejected",
    async () => {
      const detail = await request(
        "members/" + memberId,
        "GET",
        undefined,
        trainer,
      );
      assert.equal(detail.body.subscriptions[0].price, undefined);
      assert.equal(detail.body.subscriptions[0].payment.amount, undefined);
      const search = await request(
        "members?q=" + encodeURIComponent("' OR 1=1 --"),
        "GET",
        undefined,
        admin,
      );
      assert.equal(search.body.length, 0);
      expectStatus(
        await request(
          "workouts?memberId=" + encodeURIComponent('{"$ne":null}'),
          "GET",
          undefined,
          trainer,
        ),
        422,
      );
    },
  );
  await run(
    "Trainer creation, profile editing, password hashing and session invalidation",
    async () => {
      const password = "FixtureTrainer!" + suffix;
      const created = await request(
        "trainers",
        "POST",
        {
          name: "Fixture Coach " + suffix,
          email: `coach-${suffix}@smartgym.local`,
          specialty: "Strength",
          password,
        },
        admin,
      );
      expectStatus(created, 201);
      testTrainerId = created.body.id;
      testUserId = created.body.userId;
      const login = await request("auth/login", "POST", {
        email: `coach-${suffix}@smartgym.local`,
        password,
      });
      expectStatus(login, 200);
      expectStatus(
        await request(
          "trainers/" + testTrainerId,
          "PATCH",
          {
            name: "Updated Coach " + suffix,
            email: `coach-${suffix}@smartgym.local`,
            specialty: "Mobility",
            password: password + "New",
          },
          admin,
        ),
        200,
      );
      expectStatus(await request("me", "GET", undefined, login.cookie), 401);
      const user = await db.user.findUniqueOrThrow({
        where: { id: testUserId },
      });
      assert.match(user.passwordHash, /^\$2[aby]\$12\$/);
      assert.notEqual(user.passwordHash, password);
    },
  );
  await run(
    "Catalog updates persist without repricing historical subscriptions",
    async () => {
      expectStatus(
        await request(
          "packages/" + pkgId,
          "PATCH",
          {
            name: "Updated package " + suffix,
            price: 1200,
            durationDays: 30,
            active: true,
          },
          admin,
        ),
        200,
      );
      assert.equal(
        Number(
          (await db.subscription.findFirstOrThrow({ where: { memberId } }))
            .price,
        ),
        1000,
      );
      expectStatus(
        await request(
          "equipment/" + equipmentId,
          "PATCH",
          {
            name: "Updated equipment " + suffix,
            quantity: 3,
            status: "AVAILABLE",
            nextService: today,
          },
          admin,
        ),
        200,
      );
      expectStatus(
        await request(
          "exercises/" + exerciseId,
          "PATCH",
          {
            name: "Updated movement " + suffix,
            muscleGroup: "Back",
            equipmentId,
            defaultSets: 4,
            defaultReps: 8,
          },
          trainer,
        ),
        200,
      );
      expectStatus(
        await request(
          "plans/" + planId,
          "PATCH",
          {
            name: "Updated plan " + suffix,
            goal: "Strength and mobility",
            durationWeeks: 10,
            trainerId: actor.id,
            exercises: [{ exerciseId, sets: 4, reps: 8 }],
          },
          trainer,
        ),
        200,
      );
      assert.equal(
        (
          await db.planExercise.findUniqueOrThrow({
            where: { planId_exerciseId: { planId, exerciseId } },
          })
        ).sets,
        4,
      );
    },
  );
  await run(
    "Reference-safe plan/exercise deletion and inventory retirement",
    async () => {
      expectStatus(
        await request("plans/" + planId, "DELETE", undefined, trainer),
        409,
      );
      expectStatus(
        await request(
          "assignments/" + memberId + "-" + planId,
          "DELETE",
          undefined,
          trainer,
        ),
        200,
      );
      expectStatus(
        await request("plans/" + planId, "DELETE", undefined, trainer),
        200,
      );
      planId = 0;
      expectStatus(
        await request("exercises/" + exerciseId, "DELETE", undefined, admin),
        200,
      );
      exerciseId = 0;
      expectStatus(
        await request("equipment/" + equipmentId, "DELETE", undefined, admin),
        200,
      );
      assert.equal(
        (await db.equipment.findUniqueOrThrow({ where: { id: equipmentId } }))
          .status,
        "RETIRED",
      );
    },
  );
  await run(
    "MongoDB outage leaves a durable pending outbox event for later retry",
    async () => {
      const event = await db.outbox.create({
        data: { type: "test.outage", memberId, metadata: { synthetic: true } },
      });
      await promisify(execFile)(
        process.execPath,
        ["--import", "tsx", "scripts/outbox.ts"],
        {
          env: { ...process.env, MONGODB_URI: "mongodb://127.0.0.1:1" },
          windowsHide: true,
          timeout: 20000,
        },
      );
      const pending = await db.outbox.findUniqueOrThrow({
        where: { id: event.id },
      });
      assert.equal(pending.processedAt, null);
      assert.ok(pending.attempts >= 1);
      assert.ok(pending.lastError);
      const recovered = await deliverOutbox();
      assert.equal(recovered.failed, 0);
      assert.ok(
        (await db.outbox.findUniqueOrThrow({ where: { id: event.id } }))
          .processedAt,
      );
    },
  );
  await run("Logout invalidates the server session", async () => {
    expectStatus(await request("auth/logout", "POST", {}, trainer), 200);
    expectStatus(await request("members", "GET", undefined, trainer), 401);
  });
} finally {
  // Only records with IDs created in THIS run are cleaned; legacy and seed data are untouched.
  const ids = [memberId, otherMemberId].filter(Boolean);
  try {
    const database = await mongo();
    for (const name of ["workout_logs", "member_progress", "activity_events"])
      await database.collection(name).deleteMany({ memberId: { $in: ids } });
    const paymentRows = await db.payment.findMany({
        where: { subscription: { memberId: { in: ids } } },
        select: { id: true },
      }),
      subRows = await db.subscription.findMany({
        where: { memberId: { in: ids } },
        select: { id: true },
      });
    await db.audit.deleteMany({
      where: {
        OR: [
          { entity: "payment", entityId: { in: paymentRows.map((p) => p.id) } },
          {
            entity: "subscription",
            entityId: { in: subRows.map((s) => s.id) },
          },
        ],
      },
    });
    await db.payment.deleteMany({
      where: { subscription: { memberId: { in: ids } } },
    });
    await db.subscription.deleteMany({ where: { memberId: { in: ids } } });
    await db.attendance.deleteMany({ where: { memberId: { in: ids } } });
    await db.assignment.deleteMany({ where: { memberId: { in: ids } } });
    await db.outbox.deleteMany({ where: { memberId: { in: ids } } });
    await db.member.deleteMany({ where: { id: { in: ids } } });
    if (planId) await db.workoutPlan.delete({ where: { id: planId } });
    if (exerciseId) await db.exercise.delete({ where: { id: exerciseId } });
    if (equipmentId) {
      await db.maintenance.deleteMany({ where: { equipmentId } });
      await db.equipment.delete({ where: { id: equipmentId } });
    }
    if (pkgId) await db.package.delete({ where: { id: pkgId } });
    if (testTrainerId)
      await db.trainer.delete({ where: { id: testTrainerId } });
    if (testUserId) await db.user.delete({ where: { id: testUserId } });
    if (memberUserId) await db.user.delete({ where: { id: memberUserId } });
    for (const cookie of [admin, trainer])
      if (cookie) await request("auth/logout", "POST", {}, cookie);
  } catch (error) {
    results.push({
      name: "Fixture cleanup",
      passed: false,
      error: (error as Error).message,
    });
  }
  await mkdir("docs", { recursive: true });
  await writeFile(
    "docs/TEST_RESULTS.json",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        origin,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        results,
      },
      null,
      2,
    ),
  );
  await closeDatabases();
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
