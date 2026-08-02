import { useMemo, useState, type FormEvent } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Check, Cloud, Plus, Power, Star, Trash2 } from "lucide-react";

import {
  createRemoteLlmModel,
  deleteRemoteLlmModel,
  listRemoteLlmModels,
  updateRemoteLlmModel,
  type LlmModelCatalogEntry,
  type UpdateLlmModelInput,
} from "../../api/llm-models.api";

import {
  listLlmProviders,
  type LlmProvider,
} from "../../api/llm-providers.api";

import { ConfirmDialog } from "../feedback/ConfirmDialog";
import { SelectCombobox } from "../inputs/SelectCombobox";

const providersQueryKey = ["llm-providers"] as const;

function remoteModelsQueryKey(providerId: string) {
  return ["llm-model-catalog", providerId] as const;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function RemoteModelsSettings() {
  const queryClient = useQueryClient();

  const [preferredProviderId, setPreferredProviderId] = useState("");

  const [modelKey, setModelKey] = useState("");

  const [displayName, setDisplayName] = useState("");

  const [makeDefault, setMakeDefault] = useState(false);

  const [pendingDelete, setPendingDelete] =
    useState<LlmModelCatalogEntry | null>(null);

  const providersQuery = useQuery({
    queryKey: providersQueryKey,

    queryFn: listLlmProviders,
  });

  const remoteProviders = useMemo(
    () =>
      (providersQuery.data ?? []).filter(
        (provider) => provider.type === "remote"
      ),
    [providersQuery.data]
  );

  const selectedProvider: LlmProvider | undefined =
    remoteProviders.find((provider) => provider.id === preferredProviderId) ??
    remoteProviders[0];

  const selectedProviderId = selectedProvider?.id ?? "";

  const modelsQuery = useQuery({
    queryKey: remoteModelsQueryKey(selectedProviderId),

    queryFn: () => listRemoteLlmModels(selectedProviderId),

    enabled: selectedProviderId.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: createRemoteLlmModel,

    onSuccess: async () => {
      setModelKey("");
      setDisplayName("");
      setMakeDefault(false);

      await queryClient.invalidateQueries({
        queryKey: remoteModelsQueryKey(selectedProviderId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      modelId,
      input,
    }: {
      modelId: string;
      input: UpdateLlmModelInput;
    }) => updateRemoteLlmModel(modelId, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: remoteModelsQueryKey(selectedProviderId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRemoteLlmModel,

    onSuccess: async () => {
      setPendingDelete(null);

      await queryClient.invalidateQueries({
        queryKey: remoteModelsQueryKey(selectedProviderId),
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!selectedProviderId) {
      return;
    }

    const normalizedModelKey = modelKey.trim();

    const normalizedDisplayName = displayName.trim();

    if (!normalizedModelKey || !normalizedDisplayName) {
      return;
    }

    createMutation.mutate({
      provider: selectedProviderId,
      model_key: normalizedModelKey,
      display_name: normalizedDisplayName,
      is_default: makeDefault,
    });
  }

  function updateModel(modelId: string, input: UpdateLlmModelInput): void {
    updateMutation.mutate({
      modelId,
      input,
    });
  }

  const models = modelsQuery.data ?? [];

  return (
    <>
      <section className="settingsSection remoteModelsSettings">
        <header>
          <span className="settingsSectionIcon">
            <Cloud size={20} aria-hidden />
          </span>

          <div>
            <h2>Remote models</h2>

            <p>Manage the OpenRouter models available to this account.</p>
          </div>
        </header>

        {providersQuery.isError ? (
          <div className="formError" role="alert">
            {getErrorMessage(providersQuery.error)}
          </div>
        ) : null}

        <form className="remoteModelsForm" onSubmit={handleSubmit}>
          <div className="remoteModelsFormGrid">
            <SelectCombobox
              label="Provider"
              value={selectedProviderId}
              disabled={
                providersQuery.isPending || remoteProviders.length === 0
              }
              placeholder={
                providersQuery.isPending
                  ? "Loading providers…"
                  : "No remote providers"
              }
              options={remoteProviders.map((provider) => ({
                value: provider.id,

                label: provider.label,

                description: provider.configured
                  ? "Remote · Ready"
                  : "Remote · Not configured",
              }))}
              onChange={(providerId) => {
                setPreferredProviderId(providerId);

                createMutation.reset();
                updateMutation.reset();
              }}
            />
            <label>
              <span>Model ID</span>

              <input
                type="text"
                value={modelKey}
                placeholder="openai/gpt-4.1-mini"
                autoComplete="off"
                maxLength={300}
                required
                onChange={(event) => {
                  setModelKey(event.target.value);
                }}
              />
            </label>

            <label>
              <span>Display name</span>

              <input
                type="text"
                value={displayName}
                placeholder="GPT-4.1 Mini"
                autoComplete="off"
                maxLength={200}
                required
                onChange={(event) => {
                  setDisplayName(event.target.value);
                }}
              />
            </label>
          </div>

          <div className="remoteModelsFormFooter">
            <label className="remoteModelsDefaultChoice">
              <input
                className="remoteModelsCheckboxInput"
                type="checkbox"
                checked={makeDefault}
                onChange={(event) => {
                  setMakeDefault(event.target.checked);
                }}
              />

              <span className="remoteModelsCheckboxBox" aria-hidden>
                {makeDefault ? <Check size={12} strokeWidth={3} /> : null}
              </span>

              <span className="remoteModelsCheckboxLabel">
                <Star size={15} aria-hidden />
                Set as default
              </span>
            </label>

            <button
              type="submit"
              className="primaryButton remoteModelsAddButton"
              disabled={
                createMutation.isPending ||
                !selectedProviderId ||
                !modelKey.trim() ||
                !displayName.trim()
              }
            >
              <Plus size={16} aria-hidden />

              {createMutation.isPending ? "Adding…" : "Add model"}
            </button>
          </div>

          {createMutation.isError ? (
            <div className="formError" role="alert">
              {getErrorMessage(createMutation.error)}
            </div>
          ) : null}
        </form>

        <div className="remoteModelsCatalog">
          <div className="remoteModelsCatalogHeader">
            <div>
              <h3>Configured models</h3>

              <p>
                {models.length} {models.length === 1 ? "model" : "models"}
              </p>
            </div>

            {selectedProvider ? (
              <span className="remoteModelsProviderBadge">
                {selectedProvider.label}

                {!selectedProvider.configured ? " · Not configured" : ""}
              </span>
            ) : null}
          </div>

          {selectedProviderId && modelsQuery.isPending ? (
            <p className="remoteModelsMessage" role="status">
              Loading models…
            </p>
          ) : null}

          {modelsQuery.isError ? (
            <div className="formError" role="alert">
              {getErrorMessage(modelsQuery.error)}
            </div>
          ) : null}

          {updateMutation.isError ? (
            <div className="formError" role="alert">
              {getErrorMessage(updateMutation.error)}
            </div>
          ) : null}

          {selectedProviderId &&
          modelsQuery.isSuccess &&
          models.length === 0 ? (
            <div className="remoteModelsEmpty">
              <Cloud size={20} aria-hidden />

              <div>
                <strong>No remote models configured</strong>

                <p>Add the first OpenRouter model using the form above.</p>
              </div>
            </div>
          ) : null}

          {models.length > 0 ? (
            <div className="remoteModelsList">
              {models.map((model) => {
                const updatingThisModel =
                  updateMutation.isPending &&
                  updateMutation.variables?.modelId === model.id;

                return (
                  <article className="remoteModelRow" key={model.id}>
                    <div className="remoteModelIdentity">
                      <div className="remoteModelTitle">
                        <strong>{model.display_name}</strong>

                        {model.is_default ? (
                          <span className="remoteModelDefaultBadge">
                            <Check size={12} aria-hidden />
                            Default
                          </span>
                        ) : null}

                        {!model.enabled ? (
                          <span className="remoteModelDisabledBadge">
                            Disabled
                          </span>
                        ) : null}
                      </div>

                      <code>{model.model_key}</code>
                    </div>

                    <div className="remoteModelActions">
                      {!model.is_default ? (
                        <button
                          type="button"
                          className="secondaryButton"
                          disabled={updatingThisModel}
                          onClick={() => {
                            updateModel(model.id, {
                              is_default: true,
                            });
                          }}
                        >
                          <Star size={14} aria-hidden />
                          Set default
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="secondaryButton"
                        disabled={updatingThisModel}
                        onClick={() => {
                          updateModel(model.id, {
                            enabled: !model.enabled,
                          });
                        }}
                      >
                        <Power size={14} aria-hidden />

                        {model.enabled ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        className="remoteModelDeleteButton"
                        disabled={updatingThisModel}
                        onClick={() => {
                          deleteMutation.reset();
                          setPendingDelete(model);
                        }}
                      >
                        <Trash2 size={14} aria-hidden />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete remote model?"
        description={
          pendingDelete
            ? `${pendingDelete.display_name} will be removed from your model catalog.`
            : ""
        }
        confirmLabel="Delete model"
        busy={deleteMutation.isPending}
        error={
          deleteMutation.isError ? getErrorMessage(deleteMutation.error) : null
        }
        onClose={() => {
          if (!deleteMutation.isPending) {
            deleteMutation.reset();
            setPendingDelete(null);
          }
        }}
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.id);
          }
        }}
      />
    </>
  );
}
