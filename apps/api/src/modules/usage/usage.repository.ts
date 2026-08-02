import { sql } from "kysely";

import { db } from "@/lib/db.js";

export type RawTokenUsageSummary = {
  input_tokens: string | number;
  output_tokens: string | number;
  total_tokens: string | number;
  request_count: string | number;
  successful_requests: string | number;
  failed_requests: string | number;
  unknown_usage_requests: string | number;
  total_latency_ms: string | number;
  average_latency_ms: string | number;
};

export type RawProviderModelUsageSummary = RawTokenUsageSummary & {
  provider: string;
  model_key: string;
};

function usageSummarySelection() {
  return [
    sql<string>`
      coalesce(sum(input_tokens), 0)::bigint
    `.as("input_tokens"),

    sql<string>`
      coalesce(sum(output_tokens), 0)::bigint
    `.as("output_tokens"),

    sql<string>`
      coalesce(
        sum(
          coalesce(
            total_tokens,
            coalesce(input_tokens, 0) + coalesce(output_tokens, 0)
          )
        ),
        0
      )::bigint
    `.as("total_tokens"),

    sql<number>`
      count(*)::int
    `.as("request_count"),

    sql<number>`
      (
        count(*) filter (
          where ai_invocations.status = 'completed'
        )
      )::int
    `.as("successful_requests"),

    sql<number>`
      (
        count(*) filter (
          where ai_invocations.status = 'failed'
        )
      )::int
    `.as("failed_requests"),

    sql<number>`
      (
        count(*) filter (
          where
            input_tokens is null
            or output_tokens is null
            or total_tokens is null
        )
      )::int
    `.as("unknown_usage_requests"),

    sql<string>`
      coalesce(sum(latency_ms), 0)::bigint
    `.as("total_latency_ms"),

    sql<string>`
      coalesce(
        round(avg(latency_ms) filter (where latency_ms is not null)),
        0
      )::bigint
    `.as("average_latency_ms"),
  ] as const;
}

export function findAccountUsage(ownerId: string) {
  return db
    .selectFrom("ai_invocations")
    .select(usageSummarySelection())
    .where("owner_id", "=", ownerId)
    .executeTakeFirstOrThrow();
}

export function findRunUsage(ownerId: string, runId: string) {
  return db
    .selectFrom("ai_invocations")
    .select(usageSummarySelection())
    .where("owner_id", "=", ownerId)
    .where("run_id", "=", runId)
    .executeTakeFirstOrThrow();
}

export function findProviderModelUsage(ownerId: string) {
  return db
    .selectFrom("ai_invocations")
    .select(["provider", "model_key"])
    .select(usageSummarySelection())
    .where("owner_id", "=", ownerId)
    .groupBy(["provider", "model_key"])
    .execute();
}
