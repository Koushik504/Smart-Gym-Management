export type AppRole = "ADMIN" | "TRAINER" | "USER";
export type Operation = "read" | "create" | "update" | "delete";

const trainerResources = [
  "members",
  "attendance",
  "exercises",
  "plans",
  "assignments",
  "workouts",
  "progress",
];
const memberResources = [
  "members",
  "subscriptions",
  "payments",
  "attendance",
  "exercises",
  "plans",
  "assignments",
  "workouts",
  "progress",
];
export function canAccess(
  role: string,
  resource: string,
  operation: Operation,
) {
  if (role === "ADMIN") return true;
  if (role === "USER") {
    return operation === "read"
      ? memberResources.includes(resource)
      : ["workouts", "progress"].includes(resource);
  }
  if (role !== "TRAINER" || !trainerResources.includes(resource)) return false;
  if (operation === "read") return true;
  if (resource === "members") return false;
  if (resource === "exercises" && operation === "delete") return false;
  return true;
}

export function mutationPath(role: string, path: string) {
  return role === "ADMIN" ? "admin/" + path : path;
}
