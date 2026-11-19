import { collectionHandlers } from "@/lib/api-handlers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET } = collectionHandlers("subscriptions");
