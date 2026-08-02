import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Check, HardDrive, RefreshCw } from "lucide-react";

import {
  listLlmProviderModels,
  listLlmProviders,
  type LlmProvider,
} from "../../api/llm-providers.api";

import { SelectCombobox } from "../inputs/SelectCombobox";
import { LocalModelPullManager } from "./LocalModelPullManager";

const providersQueryKey = ["llm-providers"] as const;

function providerModelsQueryKey(providerId: string) {
  return ["llm-provider-models", providerId] as const;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function readMetadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.length > 0 ? value : null;
}

function readMetadataNumber(
  metadata: Record<string, unknown>,
  key: string
): number | null {
  const value = metadata[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes < 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];

  let value = bytes;

  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;

    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatModifiedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

export function LocalModelsSettings() {
  const [preferredProviderId, setPreferredProviderId] = useState("");

  const providersQuery = useQuery({
    queryKey: providersQueryKey,

    queryFn: listLlmProviders,
  });

  const localProviders = useMemo(
    () =>
      (providersQuery.data ?? []).filter(
        (provider) => provider.type === "local"
      ),
    [providersQuery.data]
  );

  const selectedProvider: LlmProvider | undefined =
    localProviders.find((provider) => provider.id === preferredProviderId) ??
    localProviders[0];

  const selectedProviderId = selectedProvider?.id ?? "";

  const modelsQuery = useQuery({
    queryKey: providerModelsQueryKey(selectedProviderId),

    queryFn: () => listLlmProviderModels(selectedProviderId),

    enabled: selectedProviderId.length > 0,
  });

  const models = modelsQuery.data?.models ?? [];

  return (
    <section className="settingsSection localModelsSettings">
      <header>
        <span className="settingsSectionIcon">
          <HardDrive size={20} aria-hidden />
        </span>

        <div>
          <h2>Local models</h2>

          <p>
            Models discovered from local providers connected to the gateway.
          </p>
        </div>
      </header>

      {providersQuery.isError ? (
        <div className="formError" role="alert">
          {getErrorMessage(providersQuery.error)}
        </div>
      ) : null}

      <div className="localModelsToolbar">
        <SelectCombobox
          label="Provider"
          value={selectedProviderId}
          disabled={providersQuery.isPending || localProviders.length === 0}
          placeholder={
            providersQuery.isPending
              ? "Loading providers…"
              : "No local providers"
          }
          options={localProviders.map((provider) => ({
            value: provider.id,

            label: provider.label,

            description: provider.configured
              ? "Local · Connected"
              : "Local · Not configured",
          }))}
          onChange={(providerId) => {
            setPreferredProviderId(providerId);
          }}
        />

        <button
          type="button"
          className="secondaryButton localModelsRefreshButton"
          disabled={!selectedProviderId || modelsQuery.isFetching}
          onClick={() => {
            void modelsQuery.refetch();
          }}
        >
          <RefreshCw
            size={15}
            aria-hidden
            className={
              modelsQuery.isFetching
                ? "localModelsRefreshIconSpinning"
                : undefined
            }
          />

          {modelsQuery.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <LocalModelPullManager
        providerId={selectedProviderId}
        disabled={!selectedProvider || !selectedProvider.configured}
      />

      {selectedProviderId && modelsQuery.isPending ? (
        <p className="localModelsMessage" role="status">
          Loading installed models…
        </p>
      ) : null}

      {modelsQuery.isError ? (
        <div className="formError" role="alert">
          {getErrorMessage(modelsQuery.error)}
        </div>
      ) : null}

      {selectedProviderId && modelsQuery.isSuccess && models.length === 0 ? (
        <div className="localModelsEmpty">
          <HardDrive size={20} aria-hidden />

          <div>
            <strong>No local models installed</strong>

            <p>
              Install a model in the selected provider and refresh this list.
            </p>
          </div>
        </div>
      ) : null}

      {models.length > 0 ? (
        <div className="localModelsCatalog">
          <div className="localModelsCatalogHeader">
            <div>
              <h3>Installed models</h3>

              <p>
                {models.length} {models.length === 1 ? "model" : "models"}
              </p>
            </div>

            {selectedProvider ? (
              <span className="remoteModelsProviderBadge">
                {selectedProvider.label}
              </span>
            ) : null}
          </div>

          <div className="localModelsList">
            {models.map((model) => {
              const parameterSize = readMetadataString(
                model.metadata,
                "parameter_size"
              );

              const quantization = readMetadataString(
                model.metadata,
                "quantization_level"
              );

              const family = readMetadataString(model.metadata, "family");

              const size = formatBytes(
                readMetadataNumber(model.metadata, "size_bytes")
              );

              const modifiedAt = formatModifiedAt(
                readMetadataString(model.metadata, "modified_at")
              );

              const metadataItems = [
                parameterSize,
                quantization,
                family,
                size,
                modifiedAt,
              ].filter((item): item is string => item !== null);

              return (
                <article
                  className="localModelRow"
                  key={`${model.provider}:${model.model_id}`}
                >
                  <div className="localModelIdentity">
                    <div className="localModelTitle">
                      <strong>{model.display_name}</strong>

                      {model.is_default ? (
                        <span className="remoteModelDefaultBadge">
                          <Check size={12} aria-hidden />
                          Default
                        </span>
                      ) : null}
                    </div>

                    <code>{model.model_id}</code>

                    {metadataItems.length > 0 ? (
                      <div className="localModelMetadata">
                        {metadataItems.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <span
                    className={
                      model.selectable
                        ? "localModelStatus localModelStatusReady"
                        : "localModelStatus"
                    }
                  >
                    {model.selectable ? "Ready" : "Unavailable"}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
