import { mongo } from "../../lib/db";
export async function setupMongo() {
  const database = await mongo();
  const number = { bsonType: ["int", "long", "double", "decimal"] };
  const validators: Record<string, object> = {
    workout_logs: {
      $jsonSchema: {
        bsonType: "object",
        required: ["memberId", "date", "durationMinutes", "status", "entries"],
        properties: {
          memberId: { ...number, minimum: 1 },
          date: { bsonType: "date" },
          durationMinutes: { ...number, minimum: 1, maximum: 600 },
          status: { enum: ["COMPLETED", "PARTIAL"] },
          notes: { bsonType: "string", maxLength: 1000 },
          entries: {
            bsonType: "array",
            minItems: 1,
            maxItems: 30,
            items: {
              bsonType: "object",
              required: ["exerciseId", "sets", "reps", "weight", "completed"],
              properties: {
                exerciseId: { ...number, minimum: 1 },
                sets: { ...number, minimum: 1, maximum: 100 },
                reps: { ...number, minimum: 1, maximum: 1000 },
                weight: { ...number, minimum: 0, maximum: 1000 },
                completed: { bsonType: "bool" },
              },
            },
          },
        },
      },
    },
    member_progress: {
      $jsonSchema: {
        bsonType: "object",
        required: ["memberId", "date", "weightKg", "waistCm", "goal"],
        properties: {
          memberId: { ...number, minimum: 1 },
          date: { bsonType: "date" },
          weightKg: { ...number, minimum: 1, maximum: 600 },
          waistCm: { ...number, minimum: 1, maximum: 300 },
          goal: { bsonType: "string", maxLength: 200 },
          notes: { bsonType: "string", maxLength: 1000 },
        },
      },
    },
    activity_events: {
      $jsonSchema: {
        bsonType: "object",
        required: ["type", "timestamp", "metadata"],
        properties: {
          type: { bsonType: "string" },
          memberId: { ...number, minimum: 1 },
          timestamp: { bsonType: "date" },
          metadata: { bsonType: "object" },
        },
      },
    },
  };
  const existing = new Set(
    (await database.listCollections().toArray()).map((c) => c.name),
  );
  for (const [name, validator] of Object.entries(validators)) {
    if (existing.has(name))
      await database.command({
        collMod: name,
        validator,
        validationLevel: "strict",
        validationAction: "error",
      });
    else
      await database.createCollection(name, {
        validator,
        validationLevel: "strict",
        validationAction: "error",
      });
  }
  await database
    .collection("workout_logs")
    .createIndex({ memberId: 1, date: -1 });
  await database
    .collection("workout_logs")
    .createIndex({ date: -1, status: 1 });
  await database
    .collection("member_progress")
    .createIndex({ memberId: 1, date: -1 });
  await database
    .collection("activity_events")
    .createIndex({ memberId: 1, timestamp: -1 });
  await database
    .collection("activity_events")
    .createIndex({ type: 1, timestamp: -1 });
}
