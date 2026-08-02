import { db } from "@/lib/db.js";

export function baseQuery(ownerId: string) {
  return db.selectFrom("base_table").where("owner_id", "=", ownerId);
}
