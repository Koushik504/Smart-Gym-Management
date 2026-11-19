export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "password"
    | "date"
    | "select"
    | "checkbox"
    | "textarea";
  source?: string;
  options?: string[];
  optional?: boolean;
  min?: number;
  step?: string;
};
export type Config = {
  title: string;
  kicker: string;
  description: string;
  singular: string;
  fields: Field[];
  editable?: boolean;
  deletable?: boolean;
  admin?: boolean;
};
export const configs: Record<string, Config> = {
  members: {
    title: "Members",
    kicker: "PEOPLE AT THE HEART OF YOUR GYM",
    description:
      "Manage your community, track memberships and connect the right trainer.",
    singular: "member",
    admin: true,
    editable: true,
    deletable: true,
    fields: [
      { key: "name", label: "Full name" },
      { key: "email", label: "Email address", type: "email" },
      {
        key: "password",
        label: "Member login password (12+ characters)",
        type: "password",
        optional: true,
      },
      { key: "phone", label: "Phone number", optional: true },
      { key: "goal", label: "Fitness goal" },
      {
        key: "trainerId",
        label: "Assigned trainer",
        type: "select",
        source: "trainers",
        optional: true,
      },
    ],
  },
  trainers: {
    title: "Trainers",
    kicker: "YOUR COACHING TEAM",
    description: "Build your team and keep every member supported.",
    singular: "trainer",
    admin: true,
    editable: true,
    fields: [
      { key: "name", label: "Full name" },
      { key: "email", label: "Login email", type: "email" },
      { key: "specialty", label: "Specialty" },
      { key: "phone", label: "Phone number", optional: true },
      {
        key: "password",
        label: "Login password (12+ characters)",
        type: "password",
        optional: true,
      },
    ],
  },
  packages: {
    title: "Membership packages",
    kicker: "A PLAN FOR EVERY MEMBER",
    description:
      "Set your pricing and duration. Existing subscriptions keep their agreed price.",
    singular: "package",
    admin: true,
    editable: true,
    deletable: true,
    fields: [
      { key: "name", label: "Package name" },
      {
        key: "price",
        label: "Price (INR)",
        type: "number",
        min: 1,
        step: "0.01",
      },
      {
        key: "durationDays",
        label: "Duration in days",
        type: "number",
        min: 1,
      },
      { key: "active", label: "Available for enrollment", type: "checkbox" },
    ],
  },
  subscriptions: {
    title: "Memberships",
    kicker: "KEEP THE MOMENTUM GOING",
    description:
      "Enroll and renew members with a single, transactional payment record.",
    singular: "enrollment",
    admin: true,
    deletable: true,
    fields: [
      { key: "memberId", label: "Member", type: "select", source: "members" },
      {
        key: "packageId",
        label: "Membership package",
        type: "select",
        source: "packages",
      },
      {
        key: "method",
        label: "Payment method",
        type: "select",
        options: ["CASH", "CARD", "UPI", "BANK"],
      },
      {
        key: "status",
        label: "Payment status",
        type: "select",
        options: ["PAID", "PENDING"],
      },
    ],
  },
  attendance: {
    title: "Attendance",
    kicker: "CONSISTENCY STARTS WITH SHOWING UP",
    description:
      "Check members in, record check-out and review daily activity. Dates use UTC.",
    singular: "check-in",
    fields: [
      { key: "memberId", label: "Member", type: "select", source: "members" },
      { key: "date", label: "Check-in date (today, UTC)", type: "date" },
    ],
  },
  equipment: {
    title: "Equipment",
    kicker: "READY FOR THE NEXT REP",
    description: "Keep inventory available and maintenance on schedule.",
    singular: "equipment",
    admin: true,
    editable: true,
    deletable: true,
    fields: [
      { key: "name", label: "Equipment name" },
      { key: "quantity", label: "Quantity", type: "number", min: 0 },
      {
        key: "status",
        label: "Availability",
        type: "select",
        options: ["AVAILABLE", "MAINTENANCE", "RETIRED"],
      },
      {
        key: "nextService",
        label: "Next maintenance date",
        type: "date",
        optional: true,
      },
    ],
  },
  maintenance: {
    title: "Maintenance history",
    kicker: "CARE THAT KEEPS THINGS MOVING",
    description:
      "Record completed service and update the next maintenance date together.",
    singular: "maintenance record",
    admin: true,
    fields: [
      {
        key: "equipmentId",
        label: "Equipment",
        type: "select",
        source: "equipment",
      },
      { key: "performedAt", label: "Service date", type: "date" },
      { key: "description", label: "Service details", type: "textarea" },
      {
        key: "cost",
        label: "Cost (INR)",
        type: "number",
        min: 0,
        step: "0.01",
      },
      { key: "nextService", label: "Next service date", type: "date" },
      {
        key: "status",
        label: "Availability after service",
        type: "select",
        options: ["AVAILABLE", "MAINTENANCE", "RETIRED"],
      },
    ],
  },
  exercises: {
    title: "Exercise catalog",
    kicker: "THE BUILDING BLOCKS OF PROGRESS",
    description:
      "Create a shared library of movements, equipment and target repetitions.",
    singular: "exercise",
    editable: true,
    deletable: true,
    fields: [
      { key: "name", label: "Exercise name" },
      { key: "muscleGroup", label: "Muscle group" },
      {
        key: "equipmentId",
        label: "Equipment",
        type: "select",
        source: "equipment",
        optional: true,
      },
      { key: "defaultSets", label: "Default sets", type: "number", min: 1 },
      { key: "defaultReps", label: "Default reps", type: "number", min: 1 },
    ],
  },
  plans: {
    title: "Workout plans",
    kicker: "PURPOSE IN EVERY SESSION",
    description:
      "Build a structured program and assign it to the members you train.",
    singular: "workout plan",
    editable: true,
    deletable: true,
    fields: [
      { key: "name", label: "Plan name" },
      { key: "goal", label: "Training goal" },
      {
        key: "durationWeeks",
        label: "Duration in weeks",
        type: "number",
        min: 1,
      },
      {
        key: "trainerId",
        label: "Plan owner",
        type: "select",
        source: "trainers",
      },
    ],
  },
  assignments: {
    title: "Workout assignments",
    kicker: "TURN A PLAN INTO ACTION",
    description: "Connect members with structured programs from their trainer.",
    singular: "assignment",
    deletable: true,
    fields: [
      { key: "memberId", label: "Member", type: "select", source: "members" },
      { key: "planId", label: "Workout plan", type: "select", source: "plans" },
    ],
  },
  workouts: {
    title: "Workout studio",
    kicker: "SMALL EFFORTS. MEASURABLE PROGRESS.",
    description:
      "Log flexible sessions and follow the story behind each member’s progress.",
    singular: "workout session",
    editable: true,
    deletable: true,
    fields: [
      { key: "memberId", label: "Member", type: "select", source: "members" },
      { key: "date", label: "Workout date", type: "date" },
      {
        key: "durationMinutes",
        label: "Duration (minutes)",
        type: "number",
        min: 1,
      },
      {
        key: "status",
        label: "Completion status",
        type: "select",
        options: ["COMPLETED", "PARTIAL"],
      },
      {
        key: "notes",
        label: "Session notes",
        type: "textarea",
        optional: true,
      },
    ],
  },
  progress: {
    title: "Member progress",
    kicker: "SEE HOW FAR THEY’VE COME",
    description: "Track measurements and goals alongside workout activity.",
    singular: "progress entry",
    editable: true,
    deletable: true,
    fields: [
      { key: "memberId", label: "Member", type: "select", source: "members" },
      { key: "date", label: "Measurement date", type: "date" },
      {
        key: "weightKg",
        label: "Body weight (kg)",
        type: "number",
        min: 1,
        step: "0.1",
      },
      {
        key: "waistCm",
        label: "Waist (cm)",
        type: "number",
        min: 1,
        step: "0.1",
      },
      { key: "goal", label: "Fitness goal" },
      {
        key: "notes",
        label: "Progress notes",
        type: "textarea",
        optional: true,
      },
    ],
  },
};
