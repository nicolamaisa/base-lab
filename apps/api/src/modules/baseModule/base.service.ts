import { baseQuery } from "./base.repository.js";

export async function getBaseService(ownerId: string) {
  return baseQuery(ownerId).execute();
}
