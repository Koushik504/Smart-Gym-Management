import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, mongo, closeDatabases } from "../lib/db";
import { day } from "../lib/rules";
import { randomUUID } from "node:crypto";
import { setupMongo } from "../database/mongodb/setup";

const today = day(),
  ago = (days: number) => new Date(+today - days * 86400000);
try {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD,
    trainerPassword = process.env.SEED_TRAINER_PASSWORD;
  if (
    !adminPassword ||
    !trainerPassword ||
    adminPassword.length < 12 ||
    trainerPassword.length < 12
  )
    throw new Error("Set both SEED passwords with at least 12 characters");
  if (await db.user.count()) {
    console.log(
      "Seed skipped: users already exist. No existing records modified.",
    );
  } else {
    const [adminHash, trainerHash] = await Promise.all([
      bcrypt.hash(adminPassword, 12),
      bcrypt.hash(trainerPassword, 12),
    ]);
    await db.$transaction(
      async (tx) => {
        await tx.user.create({
          data: {
            name: "Gym Administrator",
            email: "admin@smartgym.local",
            passwordHash: adminHash,
            role: "ADMIN",
          },
        });
        const trainers = [];
        for (const [name, specialty] of [
          ["Aarav Mehta", "Strength & conditioning"],
          ["Diya Iyer", "Mobility & endurance"],
          ["Kabir Shah", "Functional fitness"],
        ]) {
          const user = await tx.user.create({
            data: {
              name,
              email: name.split(" ")[0].toLowerCase() + "@smartgym.local",
              passwordHash: trainerHash,
              role: "TRAINER",
            },
          });
          trainers.push(
            await tx.trainer.create({ data: { userId: user.id, specialty } }),
          );
        }
        const packages = [];
        for (const [name, price, durationDays] of [
          ["Essential", 1499, 30],
          ["Performance", 3999, 90],
          ["Elite Annual", 12999, 365],
        ] as const)
          packages.push(
            await tx.package.create({ data: { name, price, durationDays } }),
          );
        const treadmill = await tx.equipment.create({
          data: {
            name: "Treadmill",
            quantity: 5,
            status: "MAINTENANCE",
            nextService: ago(2),
          },
        });
        const rack = await tx.equipment.create({
          data: { name: "Power rack", quantity: 3, nextService: ago(-45) },
        });
        const dumbbells = await tx.equipment.create({
          data: { name: "Dumbbell sets", quantity: 12, nextService: ago(-20) },
        });
        await tx.maintenance.create({
          data: {
            equipmentId: treadmill.id,
            performedAt: ago(60),
            description: "Synthetic service record: belt inspection",
            cost: 850,
          },
        });
        const exercises = [];
        for (const [name, muscleGroup, equipmentId] of [
          ["Barbell squat", "Legs", rack.id],
          ["Dumbbell row", "Back", dumbbells.id],
          ["Push-up", "Chest", null],
          ["Treadmill walk", "Cardio", treadmill.id],
          ["Plank", "Core", null],
        ] as const)
          exercises.push(
            await tx.exercise.create({
              data: { name, muscleGroup, equipmentId },
            }),
          );
        const plans = [];
        for (let i = 0; i < 3; i++)
          plans.push(
            await tx.workoutPlan.create({
              data: {
                name: [
                  "Foundation strength",
                  "Everyday conditioning",
                  "Full body strength",
                ][i],
                goal:
                  i === 1
                    ? "Beginner conditioning and endurance"
                    : "Progressive strength and mobility",
                durationWeeks: 8,
                trainerId: trainers[i].id,
                exercises: {
                  create: exercises
                    .slice(i, i + 3)
                    .map((e) => ({ exerciseId: e.id, sets: 3, reps: 12 })),
                },
              },
            }),
          );
        const names = [
          "Ananya Rao",
          "Rohan Kapoor",
          "Ishita Patel",
          "Vivan Nair",
          "Meera Joshi",
          "Arjun Das",
          "Tara Menon",
          "Dev Sharma",
          "Sana Khan",
          "Neel Verma",
          "Aditi Sen",
          "Reyansh Gupta",
          "Nisha Reddy",
          "Advik Kumar",
          "Kavya Bhat",
          "Ayaan Singh",
          "Pihu Jain",
          "Vihaan Roy",
          "Sara Shah",
          "Dhruv Sethi",
          "Maya Rao",
          "Yash Iyer",
          "Riya Bose",
          "Om Patel",
        ];
        for (let i = 0; i < names.length; i++) {
          const member = await tx.member.create({
            data: {
              name: names[i],
              email: `member${i + 1}@smartgym.local`,
              phone: `90010${String(i).padStart(5, "0")}`,
              goal: i % 2 ? "Strength and consistency" : "General fitness",
              trainerId: trainers[i % 3].id,
              joinedAt: ago(7 + i * 6),
            },
          });
          await tx.assignment.create({
            data: { memberId: member.id, planId: plans[i % 3].id },
          });
          const pkg = packages[i % 3];
          const endsAt =
            i % 6 === 0
              ? ago(5)
              : i % 4 === 0
                ? ago(-7)
                : ago(-30 - (i % 3) * 25);
          const sub = await tx.subscription.create({
            data: {
              memberId: member.id,
              packageId: pkg.id,
              startsAt: ago(30),
              endsAt,
              price: pkg.price,
              requestKey: randomUUID(),
            },
          });
          await tx.payment.create({
            data: {
              subscriptionId: sub.id,
              amount: pkg.price,
              method: i % 2 ? "UPI" : "CASH",
              status: i % 7 === 0 ? "PENDING" : "PAID",
              paidAt: i % 7 === 0 ? null : ago(i * 4),
              createdAt: ago(i * 4),
            },
          });
          for (let d = 0; d < 28; d++)
            if ((i + d) % 4 === 0 && !(i % 5 === 0 && d < 14))
              await tx.attendance.create({
                data: {
                  memberId: member.id,
                  date: ago(d),
                  checkIn: new Date(+ago(d) + 7 * 3600000),
                  checkOut: d ? new Date(+ago(d) + 8 * 3600000) : null,
                },
              });
          await tx.outbox.create({
            data: {
              type: "member.created",
              memberId: member.id,
              metadata: { synthetic: true },
            },
          });
        }
      },
      { timeout: 60000 },
    );
    console.log("Synthetic MySQL seed committed");
  }
  await setupMongo();
  const database = await mongo();
  if ((await database.collection("workout_logs").countDocuments()) === 0) {
    const members = await db.member.findMany({ take: 12 }),
      exercises = await db.exercise.findMany({ take: 3 });
    for (const [i, member] of members.entries())
      for (let s = 0; s < 6; s++) {
        await database.collection("workout_logs").insertOne({
          memberId: member.id,
          date: ago(s * 5 + (i % 3)),
          durationMinutes: 35 + s * 3,
          status: s % 4 ? "COMPLETED" : "PARTIAL",
          notes: "Synthetic demonstration session",
          entries: exercises.map((e) => ({
            exerciseId: e.id,
            sets: 3,
            reps: 12,
            weight: 10 + (5 - s) * 2,
            completed: s % 4 !== 0,
          })),
          synthetic: true,
        });
      }
    for (const member of members)
      for (let p = 0; p < 3; p++)
        await database.collection("member_progress").insertOne({
          memberId: member.id,
          date: ago(p * 14),
          weightKg: 68 + p,
          waistCm: 78 + p,
          goal: member.goal,
          notes: "Synthetic measurement",
          synthetic: true,
        });
    console.log("Synthetic MongoDB workout and progress seed inserted");
  } else console.log("MongoDB seed skipped: existing logs preserved");
  console.log(
    "Local accounts: admin@smartgym.local / aarav@smartgym.local. Passwords come from private SEED environment variables.",
  );
} finally {
  await closeDatabases();
}
