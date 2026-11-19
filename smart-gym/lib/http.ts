import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(
    JSON.parse(
      JSON.stringify(value, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
    ),
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      422,
    );
  if (error instanceof SyntaxError)
    return json({ error: "Invalid JSON request" }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return json(
        { error: "A record with these unique values already exists" },
        409,
      );
    if (error.code === "P2025") return json({ error: "Record not found" }, 404);
    if (error.code === "P2003")
      return json(
        { error: "Referenced record is missing or still in use" },
        409,
      );
  }
  const e = error as { code?: string; errno?: number; sqlMessage?: string };
  if (e.code === "ER_DUP_ENTRY")
    return json({ error: "Duplicate request or record" }, 409);
  if (e.code === "ER_SIGNAL_EXCEPTION")
    return json(
      { error: e.sqlMessage || "Business rule rejected the operation" },
      422,
    );
  if (e.code === "ER_CHECK_CONSTRAINT_VIOLATED" || e.errno === 3819)
    return json({ error: "Database constraint rejected the values" }, 422);
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "UnknownError",
    e.code || "",
  );
  return json(
    {
      error:
        "Database or service unavailable. No success was recorded; check server configuration and retry.",
    },
    503,
  );
}
export function checkOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN;
  if (!expected || request.headers.get("origin") !== expected)
    throw new HttpError(403, "Request origin is not allowed");
}
