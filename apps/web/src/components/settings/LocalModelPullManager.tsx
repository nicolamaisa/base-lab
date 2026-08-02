import { useEffect, useRef, useState, type FormEvent } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AlertTriangle, Check, Download, LoaderCircle } from "lucide-react";

import {
  createLlmModelPull,
  listLlmModelPulls,
  type LlmModelPull,
} from "../../api/llm-model-pulls.api";

type LocalModelPullManagerProps = {
  providerId: string;

  disabled?: boolean;
};

function modelPullsQueryKey(providerId: string) {
  return ["llm-model-pulls", providerId] as const;
}

function providerModelsQueryKey(providerId: string) {
  return ["llm-provider-models", providerId] as const;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function isActivePull(pull: LlmModelPull): boolean {
  return pull.status === "pending" || pull.status === "running";
}

function parseBytes(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const result = typeof value === "number" ? value : Number(value);

  return Number.isFinite(result) && result >= 0 ? result : null;
}

function formatBytes(value: string | number | null): string | null {
  const bytes = parseBytes(value);

  if (bytes === null) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];

  let amount = bytes;

  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;

    unitIndex += 1;
  }

  const precision = amount >= 10 || unitIndex === 0 ? 0 : 1;

  return `${amount.toFixed(precision)} ${units[unitIndex]}`;
}

function getPullStatusLabel(pull: LlmModelPull): string {
  switch (pull.status) {
    case "pending":
      return "Queued";

    case "running":
      return "Downloading";

    case "completed":
      return "Completed";

    case "failed":
      return "Failed";
  }
}

export function LocalModelPullManager({
  providerId,
  disabled = false,
}: LocalModelPullManagerProps) {
  const queryClient = useQueryClient();

  const lastRefreshedPullId = useRef<string | null>(null);

  const [model, setModel] = useState("");

  const pullsQuery = useQuery({
    queryKey: modelPullsQueryKey(providerId),

    queryFn: () =>
      listLlmModelPulls({
        provider: providerId,

        limit: 8,
      }),

    enabled: providerId.length > 0,

    refetchInterval: (query) => {
      const pulls = query.state.data ?? [];

      return pulls.some(isActivePull) ? 1_000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: createLlmModelPull,

    onSuccess: async () => {
      setModel("");

      await queryClient.invalidateQueries({
        queryKey: modelPullsQueryKey(providerId),
      });
    },
  });

  const pulls = pullsQuery.data ?? [];

  const latestCompletedPullId =
    pulls.find((pull) => pull.status === "completed")?.id ?? null;

  useEffect(() => {
    if (
      !latestCompletedPullId ||
      lastRefreshedPullId.current === latestCompletedPullId
    ) {
      return;
    }

    lastRefreshedPullId.current = latestCompletedPullId;

    void queryClient.invalidateQueries({
      queryKey: providerModelsQueryKey(providerId),
    });
  }, [latestCompletedPullId, providerId, queryClient]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedModel = model.trim();

    if (disabled || !providerId || !normalizedModel) {
      return;
    }

    createMutation.mutate({
      provider: providerId,

      model: normalizedModel,
    });
  }

  return (
    <div className="localModelPullPanel">
      <div className="localModelPullHeader">
        <div>
          <h3>Download a model</h3>

          <p>Pull a model through the selected local provider.</p>
        </div>

        <span>Persistent task</span>
      </div>

      <form className="localModelPullForm" onSubmit={handleSubmit}>
        <label>
          <span>Model name</span>

          <input
            type="text"
            value={model}
            placeholder="qwen3:1.7b"
            autoComplete="off"
            maxLength={200}
            required
            disabled={disabled || !providerId}
            onChange={(event) => {
              setModel(event.target.value);
            }}
          />
        </label>

        <button
          type="submit"
          className="primaryButton"
          disabled={
            disabled || !providerId || !model.trim() || createMutation.isPending
          }
        >
          <Download size={16} aria-hidden />

          {createMutation.isPending ? "Starting…" : "Download"}
        </button>
      </form>

      {createMutation.isError ? (
        <div className="formError" role="alert">
          {getErrorMessage(createMutation.error)}
        </div>
      ) : null}

      {pullsQuery.isError ? (
        <div className="formError" role="alert">
          {getErrorMessage(pullsQuery.error)}
        </div>
      ) : null}

      {pulls.length > 0 ? (
        <div className="localModelPullList" aria-live="polite">
          {pulls.map((pull) => {
            const active = isActivePull(pull);

            const percent =
              pull.layer_percent === null
                ? null
                : Math.min(100, Math.max(0, pull.layer_percent));

            const completedBytes = formatBytes(pull.layer_completed_bytes);

            const totalBytes = formatBytes(pull.layer_total_bytes);

            return (
              <article
                className={`localModelPullRow localModelPullRow-${pull.status}`}
                key={pull.id}
              >
                <div className="localModelPullIdentity">
                  <div className="localModelPullTitle">
                    <strong>{pull.model_key}</strong>

                    <span>
                      {active ? (
                        <LoaderCircle
                          size={13}
                          aria-hidden
                          className="localModelPullSpinner"
                        />
                      ) : pull.status === "completed" ? (
                        <Check size={13} aria-hidden />
                      ) : (
                        <AlertTriangle size={13} aria-hidden />
                      )}

                      {getPullStatusLabel(pull)}
                    </span>
                  </div>

                  <p>{pull.progress_status ?? "Waiting for worker…"}</p>

                  {pull.status === "running" ? (
                    <div className="localModelLayerProgress">
                      <div className="localModelLayerProgressHeader">
                        <span>Current layer</span>

                        <span>
                          {percent !== null
                            ? `${Math.round(percent)}%`
                            : "Preparing…"}
                        </span>
                      </div>

                      <div className="localModelLayerProgressTrack">
                        {percent !== null ? (
                          <span
                            style={{
                              width: `${percent}%`,
                            }}
                          />
                        ) : (
                          <span className="localModelLayerProgressIndeterminate" />
                        )}
                      </div>

                      {completedBytes || totalBytes ? (
                        <small>
                          {completedBytes ?? "0 B"}
                          {totalBytes ? ` / ${totalBytes}` : ""}
                        </small>
                      ) : null}
                    </div>
                  ) : null}

                  {pull.status === "failed" && pull.error_message ? (
                    <div className="localModelPullError">
                      {pull.error_message}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
