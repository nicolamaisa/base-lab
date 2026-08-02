import { useMemo, useState, type FormEvent } from "react";

import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

import {
  AlertTriangle,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { createBaseRun, fetchBaseRunById } from "../api/base-run.api";

import {
  listLlmProviderModels,
  listLlmProviders,
  type LlmModelOption,
  type LlmProvider,
  type LlmProviderType,
} from "../api/llm-providers.api";

import {
  SelectCombobox,
  type SelectComboboxOption,
} from "../components/inputs/SelectCombobox";

import { PageHeader } from "../components/layout/PageHeader";
import { constants } from "../config/constants";

const providerTypeOptions: SelectComboboxOption[] = [
  {
    value: "local",
    label: "Local",
    description: "Models running on this machine",
  },
  {
    value: "remote",
    label: "Remote",
    description: "Configured cloud providers",
  },
];

type ModelChoice = {
  key: string;
  provider: LlmProvider;
  model: LlmModelOption;
};

function createModelChoiceKey(providerId: string, modelId: string): string {
  return JSON.stringify([providerId, modelId]);
}

function isActiveStatus(status: string): boolean {
  return status === "pending" || status === "running";
}

export function HomePage() {
  const [providerType, setProviderType] = useState<LlmProviderType>("local");

  const [selectedModelKey, setSelectedModelKey] = useState("");

  const [prompt, setPrompt] = useState("");

  const [temperature, setTemperature] = useState(0.7);

  const [maxTokens, setMaxTokens] = useState(800);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const providersQuery = useQuery({
    queryKey: ["llm-providers"],
    queryFn: listLlmProviders,
    staleTime: 30_000,
  });

  const providersByType = useMemo(
    () =>
      (providersQuery.data ?? []).filter(
        (provider) => provider.type === providerType
      ),
    [providerType, providersQuery.data]
  );

  const providerModelQueries = useQueries({
    queries: providersByType.map((provider) => ({
      queryKey: ["llm-provider-models", provider.id],
      queryFn: () => listLlmProviderModels(provider.id),
      staleTime: 15_000,
      retry: false,
    })),
  });

  const modelChoices = useMemo<ModelChoice[]>(
    () =>
      providerModelQueries.flatMap((query) => {
        if (!query.data) {
          return [];
        }

        return query.data.models.map((model) => ({
          key: createModelChoiceKey(query.data.provider.id, model.model_id),

          provider: query.data.provider,

          model,
        }));
      }),
    [providerModelQueries]
  );

  const selectedModel =
    modelChoices.find(
      (choice) => choice.key === selectedModelKey && choice.model.selectable
    ) ??
    modelChoices.find(
      (choice) => choice.model.is_default && choice.model.selectable
    ) ??
    modelChoices.find((choice) => choice.model.selectable);

  const modelOptions = useMemo<SelectComboboxOption[]>(
    () =>
      modelChoices.map((choice) => ({
        value: choice.key,

        label: choice.model.display_name,

        description: `${choice.provider.label} · ${
          choice.model.source === "curated" ? "Configured" : "Discovered"
        }`,

        disabled: !choice.model.selectable,
      })),
    [modelChoices]
  );

  const modelsLoading = providerModelQueries.some((query) => query.isPending);

  const modelsError = providerModelQueries.find(
    (query) => query.isError
  )?.error;

  const createRunMutation = useMutation({
    mutationFn: createBaseRun,

    onSuccess: (run) => {
      setActiveRunId(run.id);
    },
  });

  const activeRunQuery = useQuery({
    queryKey: ["base-run", activeRunId],

    queryFn: () => fetchBaseRunById(activeRunId as string),

    enabled: activeRunId !== null,

    refetchInterval: (query) => {
      const run = query.state.data;

      return run && isActiveStatus(run.status) ? 2_000 : false;
    },
  });

  const currentRun = activeRunQuery.data ?? createRunMutation.data ?? null;

  function handleProviderTypeChange(value: string): void {
    setProviderType(value as LlmProviderType);
    setSelectedModelKey("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt || !selectedModel) {
      return;
    }

    createRunMutation.mutate({
      prompt: normalizedPrompt,
      provider: selectedModel.provider.id,
      model: selectedModel.model.model_id,
      temperature,
      max_tokens: maxTokens,
    });
  }

  return (
    <main className="dashboardPage dashboardControlPage">
      <PageHeader
        eyebrow={constants.appName}
        title="Console"
        description="Select an available model, send a prompt and inspect the generated response."
      />

      <section className="appPanel consolePanel">
        <div className="appPanelHeader">
          <div>
            <span className="eyebrow">Execution</span>
            <h2>New run</h2>
            <p>
              Models are loaded from the providers discovered by the LLM
              gateway.
            </p>
          </div>

          <div className="consolePanelIcon">
            <Sparkles size={20} aria-hidden />
          </div>
        </div>

        <form className="consoleForm" onSubmit={handleSubmit}>
          <div className="consoleModelGrid">
            <SelectCombobox
              label="Location"
              value={providerType}
              options={providerTypeOptions}
              onChange={handleProviderTypeChange}
            />

            <SelectCombobox
              label="Model"
              value={selectedModel?.key ?? ""}
              options={modelOptions}
              placeholder={modelsLoading ? "Loading models…" : "Select a model"}
              disabled={
                providersQuery.isPending ||
                modelsLoading ||
                modelOptions.length === 0
              }
              onChange={setSelectedModelKey}
            />
          </div>

          {providersQuery.isError ? (
            <div className="formError">
              {providersQuery.error instanceof Error
                ? providersQuery.error.message
                : "Unable to load providers."}
            </div>
          ) : null}

          {!providersQuery.isPending && providersByType.length === 0 ? (
            <div className="consoleNotice">
              <AlertTriangle size={17} aria-hidden />
              <span>No {providerType} providers are currently available.</span>
            </div>
          ) : null}

          {modelsError ? (
            <div className="formError">
              {modelsError instanceof Error
                ? modelsError.message
                : "Unable to load models."}
            </div>
          ) : null}

          <label className="consolePromptField">
            <span>Prompt</span>

            <textarea
              value={prompt}
              rows={8}
              maxLength={4000}
              placeholder="Write your prompt…"
              onChange={(event) => setPrompt(event.target.value)}
            />

            <small>{prompt.length} / 4000</small>
          </label>

          <details className="consoleAdvanced">
            <summary>
              <SlidersHorizontal size={16} aria-hidden />
              Advanced parameters
            </summary>

            <div className="consoleAdvancedGrid">
              <label>
                <span>Temperature</span>

                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(event) =>
                    setTemperature(Number(event.target.value))
                  }
                />
              </label>

              <label>
                <span>Maximum tokens</span>

                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(Number(event.target.value))}
                />
              </label>
            </div>
          </details>

          {createRunMutation.isError ? (
            <div className="formError">
              {createRunMutation.error instanceof Error
                ? createRunMutation.error.message
                : "Unable to create the run."}
            </div>
          ) : null}

          <div className="consoleSubmitRow">
            <div>
              {selectedModel ? (
                <>
                  <strong>{selectedModel.model.display_name}</strong>

                  <span>
                    {selectedModel.provider.label} ·{" "}
                    {selectedModel.model.model_id}
                  </span>
                </>
              ) : (
                <span>Select an available model to continue.</span>
              )}
            </div>

            <button
              className="primaryButton consoleSubmitButton"
              type="submit"
              disabled={
                !prompt.trim() ||
                !selectedModel ||
                createRunMutation.isPending ||
                (currentRun !== null && isActiveStatus(currentRun.status))
              }
            >
              <SendHorizontal size={17} aria-hidden />

              {createRunMutation.isPending
                ? "Creating…"
                : currentRun && isActiveStatus(currentRun.status)
                  ? "Generating…"
                  : "Generate"}
            </button>
          </div>
        </form>
      </section>

      <section className="appPanel consoleResultPanel">
        <div className="appPanelHeader">
          <div>
            <span className="eyebrow">Output</span>
            <h2>Response</h2>
            <p>
              The result is updated automatically while the worker processes the
              run.
            </p>
          </div>

          {currentRun ? (
            <span
              className={`consoleStatus consoleStatus-${currentRun.status}`}
            >
              {currentRun.status}
            </span>
          ) : null}
        </div>

        {!currentRun ? (
          <div className="appEmptyInline">
            Run a prompt to see the model response.
          </div>
        ) : currentRun.status === "failed" ? (
          <div className="formError">
            {currentRun.error_message ??
              "The generation failed without an error message."}
          </div>
        ) : currentRun.response ? (
          <pre className="consoleResponse">{currentRun.response}</pre>
        ) : (
          <div className="consoleGenerating">
            <span className="spinner" />
            <div>
              <strong>Generating response</strong>
              <span>Run {currentRun.id}</span>
            </div>
          </div>
        )}

        {activeRunQuery.isError ? (
          <div className="formError">Unable to refresh the current run.</div>
        ) : null}
      </section>
    </main>
  );
}
