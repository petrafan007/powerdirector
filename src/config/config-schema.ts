// @ts-nocheck
import { z } from 'zod';
import { PowerDirectorSchema as BasePowerDirectorSchema } from './zod-schema.js';
import {
  ModelDefinitionSchema,
  ModelProviderSchema,
  ModelsConfigSchema,
} from './zod-schema.core.js';

/**
 * Robustly unwrap Zod types to find the underlying schema that can be extended.
 * This handles ZodOptional, ZodNullable, ZodEffects (refinements), and ZodPipeline (transforms).
 */
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current: any = schema;
  while (current) {
    if (current && typeof current.extend === 'function') {
      return current;
    }
    
    // Zod internal structure can vary between versions and build environments (swc/webpack)
    const def = current._def;
    if (!def) {
      // If we don't have a _def, we might have a direct wrapper
      if (current.schema) {
        current = current.schema;
        continue;
      }
      if (current.innerType) {
        current = current.innerType;
        continue;
      }
      break;
    }

    if (def.schema) {
      current = def.schema;
    } else if (def.innerType) {
      current = def.innerType;
    } else if (def.effects && Array.isArray(def.effects) && def.effects.length > 0) {
      // Some versions of ZodEffects store the inner schema in _def.schema, others elsewhere
      // If we got here and didn't find .schema, it's a dead end unless we find another way
      break;
    } else if (def.in) {
      current = def.in;
    } else if (typeof current.unwrap === 'function') {
      current = current.unwrap();
    } else {
      break;
    }
  }
  return current;
}

const rootBaseSchema = unwrapSchema(BasePowerDirectorSchema) as z.AnyZodObject;

const terminalSchema = z
  .object({
    shell: z.enum(['bash', 'zsh']).optional(),
    autoTimeoutMinutes: z.number().int().positive().optional(),
    port: z.number().int().positive().optional(),
    bind: z
      .union([
        z.literal('auto'),
        z.literal('lan'),
        z.literal('loopback'),
        z.literal('custom'),
        z.literal('tailnet'),
      ])
      .optional(),
  })
  .strict();

const gatewaySchema = rootBaseSchema.shape.gateway
  ? (unwrapSchema(rootBaseSchema.shape.gateway) as z.AnyZodObject).extend({
    terminal: terminalSchema.optional(),
  })
  : z.object({ terminal: terminalSchema.optional() });

export const modelEntrySchema = (unwrapSchema(ModelDefinitionSchema) as z.AnyZodObject).extend({
  alias: z.string().optional(),
  rateLimit: z.number().optional(),
  timeoutOverride: z.number().optional(),
}).strict();

export const modelProviderSchema = z
  .preprocess(
    (val: any) => {
      if (val && typeof val === 'object' && val.baseURL) {
        if (!val.baseUrl) val.baseUrl = val.baseURL;
        delete val.baseURL;
      }
      return val;
    },
    (unwrapSchema(ModelProviderSchema) as z.AnyZodObject).extend({
      baseUrl: z.string().min(1).optional(),
      models: z.array(modelEntrySchema).optional(),
    }),
  )
  .strict();

const modelsBaseSchema = unwrapSchema(ModelsConfigSchema) as z.AnyZodObject;
export const modelsSchema = modelsBaseSchema
  .extend({
    providers: z.record(z.string(), modelProviderSchema).optional(),
  })
  .strict();

export const PowerDirectorSchema = rootBaseSchema
  .extend({
    gateway: gatewaySchema.optional(),
    models: modelsSchema.optional(),
  })
  .strict();

export type PowerDirectorConfig = z.infer<typeof PowerDirectorSchema>;

export const SECTION_NAMES = [
  'gateway',
  'models',
  'env',
  'agents',
  'skills',
  'tools',
  'hooks',
  'broadcast',
  'update',
  'browser',
  'logging',
  'canvasHost',
  'nodeHost',
  'discovery',
  'approvals',
  'bindings',
  'messages',
  'session',
  'channels',
  'auth',
  'ui',
  'web',
  'wizard',
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

export const sectionSchemas: Record<SectionName, z.ZodTypeAny> = {
  gateway: gatewaySchema,
  models: modelsSchema,
  env: rootBaseSchema.shape.env || z.any(),
  agents: rootBaseSchema.shape.agents || z.any(),
  skills: rootBaseSchema.shape.skills || z.any(),
  tools: rootBaseSchema.shape.tools || z.any(),
  hooks: rootBaseSchema.shape.hooks || z.any(),
  broadcast: rootBaseSchema.shape.broadcast || z.any(),
  update: rootBaseSchema.shape.update || z.any(),
  browser: rootBaseSchema.shape.browser || z.any(),
  logging: rootBaseSchema.shape.logging || z.any(),
  canvasHost: rootBaseSchema.shape.canvasHost || z.any(),
  nodeHost: rootBaseSchema.shape.nodeHost || z.any(),
  discovery: rootBaseSchema.shape.discovery || z.any(),
  approvals: rootBaseSchema.shape.approvals || z.any(),
  bindings: rootBaseSchema.shape.bindings || z.any(),
  messages: rootBaseSchema.shape.messages || z.any(),
  session: rootBaseSchema.shape.session || z.any(),
  channels: rootBaseSchema.shape.channels || z.any(),
  auth: rootBaseSchema.shape.auth || z.any(),
  ui: rootBaseSchema.shape.ui || z.any(),
  web: rootBaseSchema.shape.web || z.any(),
  wizard: rootBaseSchema.shape.wizard || z.any(),
};

export const SECRET_FIELDS = [
  'apiKey',
  'token',
  'password',
  'secret',
  'key',
  'privateKey',
  'clientSecret',
  'accessToken',
  'refreshToken',
];
