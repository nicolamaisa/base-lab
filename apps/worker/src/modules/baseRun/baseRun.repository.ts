import { db } from "@/lib/db.js";
import { Json } from "@/types/db.types.js";

export async function findPendingRunsIds(limit: number) {
  const rows = await db
    .selectFrom("base_run")
    .select(["id"])
    .where("status", "=", "pending")
    .orderBy("created_at", "asc")
    .limit(limit)
    .execute();

  return rows.map((row) => row.id);
}

export async function claimRunById(id: string) {
  return db.transaction().execute(async (transaction) => {
    const pendingRun = await transaction
      .selectFrom("base_run")
      .selectAll()
      .where("id", "=", id)
      .where("status", "=", "pending")
      .forUpdate()
      .skipLocked()
      .executeTakeFirst();

    if (!pendingRun) {
      return undefined;
    }

    const claimedRun = await transaction
      .updateTable("base_run")
      .set({
        status: "running",
        started_at: new Date(),
      })
      .where("id", "=", pendingRun.id)
      .where("status", "=", "pending")
      .returningAll()
      .executeTakeFirst();

    return claimedRun;
  });
}

export async function claimNextRun() {
  return db.transaction().execute(async (transaction) => {
    const pendingRun = await transaction
      .selectFrom("base_run")
      .selectAll()
      .where("status", "=", "pending")
      .orderBy("created_at", "asc")
      .forUpdate()
      .skipLocked()
      .executeTakeFirst();

    if (!pendingRun) {
      return undefined;
    }

    const claimedRun = await transaction
      .updateTable("base_run")
      .set({
        status: "running",
        started_at: new Date(),
      })
      .where("id", "=", pendingRun.id)
      .where("status", "=", "pending")
      .returningAll()
      .executeTakeFirst();

    return claimedRun;
  });
}

export async function completeRunById(
  id: string,
  response: string,
  rawResponse: Json
) {
  await db
    .updateTable("base_run")
    .set({
      status: "completed",
      completed_at: new Date(),
      response: response,
      raw_response: rawResponse,
    })
    .where("id", "=", id)
    .where("status", "=", "running")
    .execute();
}

export async function failRunById(
  id: string,
  error: { code: string; message: string }
) {
  await db
    .updateTable("base_run")
    .set({
      status: "failed",
      error_code: error.code,
      error_message: error.message,
      completed_at: new Date(),
    })
    .where("id", "=", id)
    .where("status", "=", "running")
    .execute();
}
