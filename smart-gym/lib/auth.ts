import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { HttpError } from "./http";
export const sessionCookie = "smart_gym_session";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { include: { trainer: true, member: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active)
    return null;
  if (session.user.role === "USER" && !session.user.member?.active) return null;
  const { passwordHash: _password, ...user } = session.user;
  void _password;
  return user;
}
export type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  if (admin && user.role !== "ADMIN")
    throw new HttpError(403, "Administrator access required");
  return user;
}
export async function requireAdmin() {
  return requireUser(true);
}
export async function authenticate(email: string, password: string) {
  const key = digest(email);
  // An atomic counter also serializes simultaneous attempts; it persists across server restarts.
  await db.$executeRaw`INSERT INTO sg_login_attempts (\`key\`, count, windowStart) VALUES (${key},1,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE count=IF(windowStart < UTC_TIMESTAMP(3)-INTERVAL 15 MINUTE,1,count+1), windowStart=IF(windowStart < UTC_TIMESTAMP(3)-INTERVAL 15 MINUTE,UTC_TIMESTAMP(3),windowStart)`;
  const attempt = await db.loginAttempt.findUniqueOrThrow({ where: { key } });
  if (attempt.count > 10)
    throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const user = await db.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ||
      "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
  );
  if (!user || !user.active || !valid)
    throw new HttpError(401, "Invalid email or password");
  if (
    user.role === "USER" &&
    !(await db.member.count({ where: { userId: user.id, active: true } }))
  )
    throw new HttpError(401, "This member account is deactivated");
  await db.loginAttempt.deleteMany({ where: { key } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash: digest(token), userId: user.id, expiresAt },
  });
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
  return { name: user.name, role: user.role };
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(sessionCookie);
}
export async function memberAccess(
  actor: Actor,
  memberId: number,
  active = false,
) {
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) throw new HttpError(404, "Member not found");
  if (actor.role === "USER" && member.userId !== actor.id)
    throw new HttpError(403, "You can access only your own member records");
  if (actor.role === "TRAINER" && member.trainerId !== actor.trainer?.id)
    throw new HttpError(403, "This member is not assigned to you");
  if (active && !member.active)
    throw new HttpError(422, "Member is deactivated");
  return member;
}
