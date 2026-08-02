import { z } from "zod";

export const discoveredProviderIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Invalid provider identifier");

export const discoveredProviderTypeSchema = z.enum(["local", "remote"]);

export const discoveredProviderSchema = z.object({
  id: discoveredProviderIdSchema,

  label: z.string().trim().min(1).max(100),

  type: discoveredProviderTypeSchema,

  configured: z.boolean(),

  default_model: z.string().trim().min(1).nullable(),

  requires_explicit_model: z.boolean(),
});

export const discoveredProvidersResponseSchema = z.object({
  providers: z.array(discoveredProviderSchema),
});

export const discoveredModelSourceSchema = z.enum(["discovered", "curated"]);

export const discoveredModelSchema = z.object({
  model_id: z.string().trim().min(1).max(300),

  display_name: z.string().trim().min(1).max(300),

  provider: discoveredProviderIdSchema,

  provider_type: discoveredProviderTypeSchema,

  source: discoveredModelSourceSchema,

  selectable: z.boolean(),

  is_default: z.boolean(),

  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const discoveredProviderModelsResponseSchema = z.object({
  provider: discoveredProviderSchema,

  models: z.array(discoveredModelSchema),
});

export type DiscoveredProvider = z.infer<typeof discoveredProviderSchema>;

export type DiscoveredProviderType = z.infer<
  typeof discoveredProviderTypeSchema
>;

export type DiscoveredProvidersResponse = z.infer<
  typeof discoveredProvidersResponseSchema
>;

export type DiscoveredModel = z.infer<typeof discoveredModelSchema>;

export type DiscoveredModelSource = z.infer<typeof discoveredModelSourceSchema>;

export type DiscoveredProviderModelsResponse = z.infer<
  typeof discoveredProviderModelsResponseSchema
>;
