import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

const state = globalThis as unknown as {
  prisma?: PrismaClient;
  mongo?: Promise<MongoClient>;
  pool?: mysql.Pool;
};
const url = new URL(
  process.env.DATABASE_URL ||
    "mysql://unconfigured:unconfigured@127.0.0.1/smart_gym",
);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
  connectTimeout: 5000,
  // MySQL 8 needs an RSA key on the first caching_sha2_password login after
  // restart. Retrieve it only from the dedicated local demonstration server.
  allowPublicKeyRetrieval: ["127.0.0.1", "localhost", "[::1]"].includes(
    url.hostname,
  ),
});
export const db = state.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") state.prisma = db;
export function sql() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  return (state.pool ??= mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 5,
    multipleStatements: false,
    timezone: "Z",
    decimalNumbers: true,
  }));
}
export async function mongo() {
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is not configured");
  state.mongo ??= new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 4000,
  })
    .connect()
    .catch((error) => {
      state.mongo = undefined;
      throw error;
    });
  return (await state.mongo).db(process.env.MONGODB_DB || "smart_gym");
}
export async function closeDatabases() {
  await db.$disconnect();
  if (state.pool) {
    await state.pool.end();
    state.pool = undefined;
  }
  if (state.mongo) {
    await (await state.mongo).close();
    state.mongo = undefined;
  }
}
