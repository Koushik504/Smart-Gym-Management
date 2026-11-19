import { z } from "zod";
const id = z.coerce.number().int().positive();
const name = z.string().trim().min(2).max(150);
const optionalPhone = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .trim()
    .regex(/^[+\d ()-]{6,20}$/)
    .nullable()
    .optional(),
);
const optionalId = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  id.nullable(),
);
const password = z
  .string()
  .max(72)
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
const isoDate = z.iso.date().refine((v) => {
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Use a valid calendar date");
export const schemas = {
  members: z.object({
    name,
    email: z
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    phone: optionalPhone,
    goal: z.string().trim().min(2).max(200),
    trainerId: optionalId,
    password: password
      .refine(
        (v) => v.length >= 12,
        "Password must contain at least 12 characters",
      )
      .optional(),
  }),
  trainers: z.object({
    name,
    email: z
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    phone: optionalPhone,
    specialty: z.string().trim().min(2).max(120),
    password: password
      .refine(
        (v) => v.length >= 12,
        "Password must contain at least 12 characters",
      )
      .optional(),
  }),
  packages: z.object({
    name: name.max(100),
    price: z.coerce.number().positive().max(99999999),
    durationDays: z.coerce.number().int().min(1).max(730),
    active: z.boolean().default(true),
  }),
  equipment: z.object({
    name: name.max(100),
    quantity: z.coerce.number().int().min(0).max(10000),
    status: z.enum(["AVAILABLE", "MAINTENANCE", "RETIRED"]),
    nextService: z.preprocess(
      (v) => (v === "" ? null : v),
      isoDate.nullable().optional(),
    ),
  }),
  exercises: z.object({
    name: name.max(100),
    muscleGroup: z.string().trim().min(2).max(80),
    equipmentId: optionalId,
    defaultSets: z.coerce.number().int().min(1).max(100),
    defaultReps: z.coerce.number().int().min(1).max(1000),
  }),
  plans: z.object({
    name: name.max(100),
    goal: z.string().trim().min(2).max(200),
    durationWeeks: z.coerce.number().int().min(1).max(104),
    trainerId: id,
    exercises: z
      .array(
        z.object({
          exerciseId: id,
          sets: z.coerce.number().int().min(1).max(100),
          reps: z.coerce.number().int().min(1).max(1000),
        }),
      )
      .min(1)
      .max(30)
      .refine(
        (a) => new Set(a.map((x) => x.exerciseId)).size === a.length,
        "Exercises must be unique",
      ),
  }),
  subscriptions: z.object({
    memberId: id,
    packageId: id,
    method: z.enum(["CASH", "CARD", "UPI", "BANK"]),
    status: z.enum(["PAID", "PENDING"]).default("PAID"),
    requestKey: z.string().uuid(),
  }),
  attendance: z.object({ memberId: id, date: isoDate }),
  assignments: z.object({ memberId: id, planId: id }),
  maintenance: z
    .object({
      equipmentId: id,
      performedAt: isoDate,
      description: z.string().trim().min(3).max(500),
      cost: z.coerce.number().min(0).max(99999999),
      nextService: isoDate,
      status: z
        .enum(["AVAILABLE", "MAINTENANCE", "RETIRED"])
        .default("AVAILABLE"),
    })
    .refine(
      (v) => v.nextService > v.performedAt,
      "Next service must be after maintenance",
    ),
  workouts: z.object({
    memberId: id,
    date: isoDate,
    durationMinutes: z.coerce.number().min(1).max(600),
    status: z.enum(["COMPLETED", "PARTIAL"]),
    notes: z.string().max(1000).default(""),
    entries: z
      .array(
        z.object({
          exerciseId: id,
          sets: z.coerce.number().int().min(1).max(100),
          reps: z.coerce.number().int().min(1).max(1000),
          weight: z.coerce.number().min(0).max(1000),
          completed: z.boolean(),
        }),
      )
      .min(1)
      .max(30),
  }),
  progress: z.object({
    memberId: id,
    date: isoDate,
    weightKg: z.coerce.number().positive().max(600),
    waistCm: z.coerce.number().positive().max(300),
    goal: z.string().min(2).max(200),
    notes: z.string().max(1000).default(""),
  }),
};
export type Resource = keyof typeof schemas;
export const resourceNames = Object.keys(schemas) as Resource[];
export const loginSchema = z.object({
  email: z
    .email()
    .max(150)
    .transform((v) => v.toLowerCase()),
  password: password.refine((v) => v.length > 0, "Password is required"),
});
export const positiveId = (value: unknown) => id.parse(value);
