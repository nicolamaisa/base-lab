import { useQuery } from "@tanstack/react-query";

import { Activity, Clock3, RefreshCw, Send, Sigma } from "lucide-react";

import { getAccountUsage, getProviderModelUsage } from "../api/usage.api";

import { PageHeader } from "../components/layout/PageHeader";

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

function calculateSuccessRate(successful: number, failed: number): string {
  const settled = successful + failed;

  if (settled === 0) {
    return "—";
  }

  return `${Math.round((successful / settled) * 100)}%`;
}

export function UsagePage() {
  const usageQuery = useQuery({
    queryKey: ["account-usage"],
    queryFn: getAccountUsage,
    staleTime: 10_000,
  });

  const providerModelUsageQuery = useQuery({
    queryKey: ["provider-model-usage"],
    queryFn: getProviderModelUsage,
    staleTime: 10_000,
  });

  const usage = usageQuery.data;

  const knownTokens = usage ? usage.input_tokens + usage.output_tokens : 0;

  const inputPercentage =
    usage && knownTokens > 0 ? (usage.input_tokens / knownTokens) * 100 : 0;

  const outputPercentage =
    usage && knownTokens > 0 ? (usage.output_tokens / knownTokens) * 100 : 0;

  return (
    <main className="dashboardPage dashboardControlPage">
      <PageHeader
        title="Usage"
        description="Review token consumption, requests and execution performance."
        actions={
          <button
            type="button"
            className="secondaryButton usageRefreshButton"
            disabled={
              usageQuery.isFetching || providerModelUsageQuery.isFetching
            }
            onClick={() => {
              void Promise.all([
                usageQuery.refetch(),
                providerModelUsageQuery.refetch(),
              ]);
            }}
          >
            <RefreshCw
              size={16}
              className={
                usageQuery.isFetching || providerModelUsageQuery.isFetching
                  ? "usageRefreshIconSpinning"
                  : undefined
              }
              aria-hidden
            />
            Refresh
          </button>
        }
      />

      {usageQuery.isLoading ? (
        <section className="usageLoadingGrid">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="usageLoadingCard" key={index} />
          ))}
        </section>
      ) : null}

      {usageQuery.isError ? (
        <div className="formError projectPageMessage">
          {usageQuery.error instanceof Error
            ? usageQuery.error.message
            : "Unable to load usage."}
        </div>
      ) : null}

      {usage ? (
        <>
          <section className="usageSummaryGrid">
            <article className="usageSummaryCard usageSummaryCardPrimary">
              <span>
                <Sigma size={18} aria-hidden />
                Total tokens
              </span>

              <strong>{formatNumber(usage.total_tokens)}</strong>

              <small>All recorded invocations</small>
            </article>

            <article className="usageSummaryCard">
              <span>
                <Send size={18} aria-hidden />
                Requests
              </span>

              <strong>{formatNumber(usage.request_count)}</strong>

              <small>{formatNumber(usage.successful_requests)} completed</small>
            </article>

            <article className="usageSummaryCard">
              <span>
                <Activity size={18} aria-hidden />
                Success rate
              </span>

              <strong>
                {calculateSuccessRate(
                  usage.successful_requests,
                  usage.failed_requests
                )}
              </strong>

              <small>{formatNumber(usage.failed_requests)} failed</small>
            </article>

            <article className="usageSummaryCard">
              <span>
                <Clock3 size={18} aria-hidden />
                Average latency
              </span>

              <strong>{formatLatency(usage.average_latency_ms)}</strong>

              <small>{formatLatency(usage.total_latency_ms)} total</small>
            </article>
          </section>

          <div className="usageDetailsGrid">
            <section className="appPanel usagePanel">
              <div className="appPanelHeader">
                <div>
                  <span className="eyebrow">Tokens</span>
                  <h2>Token distribution</h2>
                  <p>
                    Input and output tokens reported by configured providers.
                  </p>
                </div>
              </div>

              <div className="usageTokenList">
                <div>
                  <header>
                    <span>Input tokens</span>
                    <strong>{formatNumber(usage.input_tokens)}</strong>
                  </header>

                  <div className="usageProgressTrack">
                    <span
                      style={{
                        width: `${inputPercentage}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <header>
                    <span>Output tokens</span>
                    <strong>{formatNumber(usage.output_tokens)}</strong>
                  </header>

                  <div className="usageProgressTrack usageProgressTrackOutput">
                    <span
                      style={{
                        width: `${outputPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="appPanel usagePanel">
              <div className="appPanelHeader">
                <div>
                  <span className="eyebrow">Reliability</span>
                  <h2>Request status</h2>
                  <p>Completion and usage-reporting quality.</p>
                </div>
              </div>

              <dl className="usageStatusList">
                <div>
                  <dt>Completed</dt>
                  <dd>{formatNumber(usage.successful_requests)}</dd>
                </div>

                <div>
                  <dt>Failed</dt>
                  <dd>{formatNumber(usage.failed_requests)}</dd>
                </div>

                <div>
                  <dt>Unknown token usage</dt>
                  <dd>{formatNumber(usage.unknown_usage_requests)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="appPanel usageBreakdownPanel">
            <div className="appPanelHeader">
              <div>
                <span className="eyebrow">Breakdown</span>

                <h2>Usage by provider and model</h2>

                <p>
                  Aggregated requests, tokens and latency for every model used
                  by this account.
                </p>
              </div>
            </div>

            {providerModelUsageQuery.isLoading ? (
              <div className="runsMessage">Loading provider usage…</div>
            ) : null}

            {providerModelUsageQuery.isError ? (
              <div className="formError">
                {providerModelUsageQuery.error instanceof Error
                  ? providerModelUsageQuery.error.message
                  : "Unable to load provider usage."}
              </div>
            ) : null}

            {providerModelUsageQuery.data?.length === 0 ? (
              <div className="runsMessage">
                No model usage has been recorded yet.
              </div>
            ) : null}

            {providerModelUsageQuery.data &&
            providerModelUsageQuery.data.length > 0 ? (
              <div className="usageBreakdownTableWrapper">
                <table className="usageBreakdownTable">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Model</th>
                      <th>Requests</th>
                      <th>Input</th>
                      <th>Output</th>
                      <th>Total</th>
                      <th>Avg. latency</th>
                      <th>Success</th>
                    </tr>
                  </thead>

                  <tbody>
                    {providerModelUsageQuery.data.map((item) => (
                      <tr key={JSON.stringify([item.provider, item.model_key])}>
                        <td>
                          <span className="usageProviderBadge">
                            {item.provider}
                          </span>
                        </td>

                        <td>
                          <strong className="usageModelName">
                            {item.model_key}
                          </strong>
                        </td>

                        <td>{formatNumber(item.request_count)}</td>

                        <td>{formatNumber(item.input_tokens)}</td>

                        <td>{formatNumber(item.output_tokens)}</td>

                        <td className="usageTotalCell">
                          {formatNumber(item.total_tokens)}
                        </td>

                        <td>{formatLatency(item.average_latency_ms)}</td>

                        <td>
                          {calculateSuccessRate(
                            item.successful_requests,
                            item.failed_requests
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
