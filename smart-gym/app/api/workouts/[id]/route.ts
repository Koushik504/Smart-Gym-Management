import { detailHandlers } from "@/lib/api-handlers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { PATCH, DELETE } = detailHandlers("workouts");
