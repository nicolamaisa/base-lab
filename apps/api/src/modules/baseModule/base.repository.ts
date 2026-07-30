import { db } from "@/lib/db.js";

export function baseQuery(ownerId: string) {
  return db.selectFrom("base").where("owner_id", "=", ownerId);
}
