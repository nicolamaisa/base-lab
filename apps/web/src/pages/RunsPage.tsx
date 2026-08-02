import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Clock3, RefreshCw } from "lucide-react";

import { listBaseRuns, type BaseRun } from "../api/base-run.api";
import { getRunUsage } from "../api/usage.api";

import { PageHeader } from "../components/layout/PageHeader";

type RunFilter = "all" | "active" | "completed" | "failed";

const runFilters: Array<{
  value: RunFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function isActiveRun(run: BaseRun): boolean {
  return run.status === "pending" || run.status === "running";
}

function matchesFilter(run: BaseRun, filter: RunFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return isActiveRun(run);
  }

  return run.status === filter;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function configurationString(run: BaseRun, key: string): string {
  const value = run.configuration[key];

  return typeof value === "string" ? value : "—";
}

function configurationNumber(run: BaseRun, key: string): string {
  const value = run.configuration[key];

  return typeof value === "number" ? String(value) : "—";
}

const numberFormatter = new Intl.NumberFormat();

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatLatency(milliseconds: number): string {
  if (milliseconds >= 1000) {
    return `${(milliseconds / 1000).toFixed(2)} s`;
  }

  return `${milliseconds} ms`;
}

export function RunsPage() {
  const [filter, setFilter] = useState<RunFilter>("all");

  const [selectedRunId, setSelectedRunId] = useState("");

  const runsQuery = useQuery({
    queryKey: ["base-runs"],

    queryFn: listBaseRuns,

    refetchInterval: (query) => {
      const runs = query.state.data ?? [];

      return runs.some(isActiveRun) ? 3_000 : false;
    },
  });

  const filteredRuns = useMemo(
    () => (runsQuery.data ?? []).filter((run) => matchesFilter(run, filter)),
    [filter, runsQuery.data]
  );

  const selectedRun =
    filteredRuns.find((run) => run.id === selectedRunId) ??
    filteredRuns[0] ??
    null;

  const selectedRunUsageQuery = useQuery({
    queryKey: ["run-usage", selectedRun?.id],

    queryFn: () => getRunUsage(selectedRun?.id as string),

    enabled: selectedRun !== null,

    refetchInterval: (query) => {
      const usage = query.state.data;

      const settledRequests = usage
        ? usage.successful_requests + usage.failed_requests
        : 0;

      return selectedRun && (isActiveRun(selectedRun) || settledRequests === 0)
        ? 3_000
        : false;
    },
  });

  return (
    <main className="dashboardPage dashboardControlPage">
      <PageHeader
        title="Runs"
        description="Inspect previous generations, their configuration and execution status."
        actions={
          <button
            type="button"
            className="secondaryButton runsRefreshButton"
            disabled={runsQuery.isFetching}
            onClick={() => void runsQuery.refetch()}
          >
            <RefreshCw
              size={16}
              className={
                runsQuery.isFetching ? "runsRefreshIconSpinning" : undefined
              }
              aria-hidden
            />
            Refresh
          </button>
        }
      />

      <div className="runsLayout">
        <section className="runsHistoryPanel">
          <header className="runsPanelHeader">
            <div>
              <h2>History</h2>
              <p>{runsQuery.data?.length ?? 0} runs</p>
            </div>

            <Clock3 size={18} aria-hidden />
          </header>

          <div className="runsFilters" aria-label="Filter runs">
            {runFilters.map((item) => (
              <button
                type="button"
                key={item.value}
                aria-pressed={filter === item.value}
                onClick={() => {
                  setFilter(item.value);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {runsQuery.isLoading ? (
            <div className="runsMessage">Loading runs…</div>
          ) : null}

          {runsQuery.isError ? (
            <div className="formError">
              {runsQuery.error instanceof Error
                ? runsQuery.error.message
                : "Unable to load runs."}
            </div>
          ) : null}

          {!runsQuery.isLoading &&
          !runsQuery.isError &&
          filteredRuns.length === 0 ? (
            <div className="runsMessage">No runs match this filter.</div>
          ) : null}

          <div className="runsHistoryList">
            {filteredRuns.map((run) => {
              const selected = run.id === selectedRun?.id;

              return (
                <button
                  type="button"
                  className={[
                    "runsHistoryItem",
                    selected ? "runsHistoryItemSelected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={run.id}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedRunId(run.id);
                  }}
                >
                  <span className="runsHistoryItemHeader">
                    <strong>{configurationString(run, "model")}</strong>

                    <span
                      className={`consoleStatus consoleStatus-${run.status}`}
                    >
                      {run.status}
                    </span>
                  </span>

                  <span className="runsHistoryItemProvider">
                    {configurationString(run, "provider")}
                  </span>

                  <span className="runsHistoryItemPrompt">{run.prompt}</span>

                  <time dateTime={run.created_at}>
                    {formatDate(run.created_at)}
                  </time>
                </button>
              );
            })}
          </div>
        </section>

        <section className="runsDetailPanel">
          {!selectedRun ? (
            <div className="runsDetailEmpty">
              <Clock3 size={22} aria-hidden />

              <div>
                <strong>No run selected</strong>
                <p>Select a run from the history to inspect its details.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="runsDetailHeader">
                <div>
                  <span className="eyebrow">Run details</span>

                  <h2>{configurationString(selectedRun, "model")}</h2>

                  <p>{selectedRun.id}</p>
                </div>

                <span
                  className={`consoleStatus consoleStatus-${selectedRun.status}`}
                >
                  {selectedRun.status}
                </span>
              </header>

              <dl className="runsMetadata">
                <div>
                  <dt>Provider</dt>
                  <dd>{configurationString(selectedRun, "provider")}</dd>
                </div>

                <div>
                  <dt>Temperature</dt>
                  <dd>{configurationNumber(selectedRun, "temperature")}</dd>
                </div>

                <div>
                  <dt>Max tokens</dt>
                  <dd>{configurationNumber(selectedRun, "max_tokens")}</dd>
                </div>

                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(selectedRun.created_at)}</dd>
                </div>
              </dl>

              {selectedRunUsageQuery.data ? (
                <dl className="runUsageSummary">
                  <div>
                    <dt>Input tokens</dt>
                    <dd>
                      {formatNumber(selectedRunUsageQuery.data.input_tokens)}
                    </dd>
                  </div>

                  <div>
                    <dt>Output tokens</dt>
                    <dd>
                      {formatNumber(selectedRunUsageQuery.data.output_tokens)}
                    </dd>
                  </div>

                  <div>
                    <dt>Total tokens</dt>
                    <dd>
                      {formatNumber(selectedRunUsageQuery.data.total_tokens)}
                    </dd>
                  </div>

                  <div>
                    <dt>Latency</dt>
                    <dd>
                      {formatLatency(
                        selectedRunUsageQuery.data.total_latency_ms
                      )}
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="runsDetailBlock">
                <h3>Prompt</h3>

                <pre>{selectedRun.prompt}</pre>
              </div>

              <div className="runsDetailBlock">
                <h3>Response</h3>

                {selectedRun.status === "failed" ? (
                  <div className="formError">
                    {selectedRun.error_message ??
                      "The run failed without an error message."}
                  </div>
                ) : selectedRun.response ? (
                  <pre>{selectedRun.response}</pre>
                ) : (
                  <div className="runsGenerating">
                    <span className="spinner" />

                    <span>Waiting for the worker…</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
