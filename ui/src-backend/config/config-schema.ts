// @ts-nocheck
import { z } from 'zod';
import { PowerDirectorSchema as BasePowerDirectorSchema } from './zod-schema';
import {
  ModelDefinitionSchema,
  ModelProviderSchema,
  ModelsConfigSchema,
} from './zod-schema.core';

/**
 * Robustly unwrap Zod types to find the underlying schema that can be extended.
 * This handles ZodOptional, ZodNullable, ZodEffects (refinements), and ZodPipeline (transforms).
 */
/**
 * Robustly unwrap Zod types to find the underlying schema that can be extended.
 * This handles ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodEffects, and ZodPipeline.
 */
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current: any = schema;
  while (current && typeof current.extend !== 'function') {
    if (current._def?.innerType) {
      current = current._def.innerType;
    } else if (current._def?.schema) {
      current = current._def.schema;
    } else if (current._def?.in) {
      current = current._def.in;
    } else if (typeof current.unwrap === 'function') {
      current = current.unwrap();
    } else {
      break;
    }
  }
  return current;
}

/**
 * Safely extends a Zod object schema even if it contains refinements.
 * This is a workaround for Zod's limitation where .extend() fails on refined objects.
 */
function safeExtend(schema: any, shape: any): z.AnyZodObject {
  const unwrapped = unwrapSchema(schema) as z.AnyZodObject;
  const isStrict = unwrapped._def.unknownKeys === 'strict';
  
  const newSchema = z.object({
    ...unwrapped.shape,
    ...shape,
  });

  return (isStrict ? newSchema.strict() : newSchema) as any;
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
  ? safeExtend(rootBaseSchema.shape.gateway, {
    terminal: terminalSchema.optional(),
  })
  : z.object({ terminal: terminalSchema.optional() });

export const modelEntrySchema = safeExtend(ModelDefinitionSchema, {
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
    safeExtend(ModelProviderSchema, {
      baseUrl: z.string().min(1).optional(),
      models: z.array(modelEntrySchema).optional(),
    }).strict(),
  );

const modelsBaseSchema = unwrapSchema(ModelsConfigSchema) as z.AnyZodObject;
export const modelsSchema = safeExtend(modelsBaseSchema, {
  providers: z.record(z.string(), modelProviderSchema).optional(),
}).strict();

export const PowerDirectorSchema = safeExtend(rootBaseSchema, {
  gateway: gatewaySchema.optional(),
  models: modelsSchema.optional(),
}).strict();

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
