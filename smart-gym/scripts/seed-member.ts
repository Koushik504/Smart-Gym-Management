import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, mongo, closeDatabases } from "../lib/db";

// This login demonstrates EXISTING persisted gym history, not a new empty member.
// Match only the known synthetic seed profile; never choose an arbitrary customer.
const email = "member@smartgym.local";
try {
  const target = await db.member.findFirst({
    where: {
      email: "member2@smartgym.local",
      name: "Rohan Kapoor",
      active: true,
      subscriptions: { some: {} },
      assignments: { some: {} },
    },
  });
  if (!target) {
    console.log(
      "No populated synthetic seed member found. Use Admin > Members > Edit to enable a login on the intended existing SQL member. No empty member created.",
    );
    process.exitCode = 0;
  } else {
    const user = await db.user.findUnique({
      where: { email },
      include: {
        member: {
          include: {
            _count: {
              select: {
                subscriptions: true,
                attendance: true,
                assignments: true,
              },
            },
          },
        },
      },
    });
    if (user && user.role !== "USER")
      throw new Error("Demo email belongs to a staff account; no changes made");
    if (user?.member?.id === target.id) {
      console.log(
        "Demonstration login already points to its populated SQL member; password/history unchanged.",
      );
    } else if (target.userId !== null) {
      throw new Error(
        "The demonstration SQL member already has another login; no changes made",
      );
    } else {
      const previous = user?.member;
      if (previous) {
        if (
          previous.name !== "Demo Member" ||
          previous.email !== email ||
          previous.trainerId !== null ||
          Object.values(previous._count).some((count) => count !== 0)
        )
          throw new Error(
            "The existing login has member history; automatic relinking is not allowed",
          );
        const database = await mongo();
        for (const name of [
          "workout_logs",
          "member_progress",
          "activity_events",
        ]) {
          if (
            await database
              .collection(name)
              .countDocuments({ memberId: previous.id })
          )
            throw new Error(
              "The existing login has activity documents; automatic relinking is not allowed",
            );
        }
      }
      const password = process.env.SEED_MEMBER_PASSWORD || "LocalMember!2026";
      if (
        !user &&
        (password.length < 12 || Buffer.byteLength(password, "utf8") > 72)
      )
        throw new Error(
          "Set SEED_MEMBER_PASSWORD to 12+ characters and at most 72 UTF-8 bytes",
        );
      const passwordHash = user ? undefined : await bcrypt.hash(password, 12);
      await db.$transaction(async (tx) => {
        const account =
          user ||
          (await tx.user.create({
            data: {
              name: target.name,
              email,
              passwordHash: passwordHash!,
              role: "USER",
            },
          }));
        if (previous)
          await tx.member.update({
            where: { id: previous.id, userId: account.id },
            data: { userId: null },
          });
        const linked = await tx.member.updateMany({
          where: { id: target.id, userId: null },
          data: { userId: account.id },
        });
        if (linked.count !== 1)
          throw new Error(
            "Member login changed concurrently; transaction rolled back",
          );
        await tx.user.update({
          where: { id: account.id },
          data: { name: target.name },
        });
        await tx.session.deleteMany({ where: { userId: account.id } });
      });
      console.log(
        `Demonstration login linked to existing SQL member ${target.id} (${target.name}). Existing payments, memberships, attendance and plans were retained; no history was invented or copied. Sign in again.`,
      );
    }
  }
} finally {
  await closeDatabases();
}
