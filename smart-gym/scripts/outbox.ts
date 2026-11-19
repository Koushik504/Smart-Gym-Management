import "dotenv/config";
import { deliverOutbox } from "../lib/outbox";
import { closeDatabases } from "../lib/db";
try {
  console.log(await deliverOutbox());
} finally {
  await closeDatabases();
}
