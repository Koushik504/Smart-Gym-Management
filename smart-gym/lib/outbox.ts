import { db, mongo } from "./db";
export async function deliverOutbox() {
  const events = await db.outbox.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  let delivered = 0,
    failed = 0;
  for (const event of events) {
    try {
      const database = await mongo();
      // A unique event ID makes replay and concurrent delivery harmless.
      await database
        .collection<{
          _id: string;
          type: string;
          memberId?: number;
          timestamp: Date;
          metadata: unknown;
        }>("activity_events")
        .updateOne(
          { _id: event.id },
          {
            $setOnInsert: {
              type: event.type,
              ...(event.memberId ? { memberId: event.memberId } : {}),
              timestamp: event.createdAt,
              metadata: event.metadata,
            },
          },
          { upsert: true },
        );
      await db.outbox.update({
        where: { id: event.id },
        data: {
          processedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      delivered++;
    } catch {
      await db.outbox.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          lastError: "MongoDB delivery failed; safe to retry",
        },
      });
      failed++;
    }
  }
  return {
    delivered,
    failed,
    pending: await db.outbox.count({ where: { processedAt: null } }),
  };
}
