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
const gatewaySchema = rootBaseSchema.shape.gateway || z.any();
const terminalSchema = rootBaseSchema.shape.terminal || z.any();

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
export const configSchema = PowerDirectorSchema;

export type PowerDirectorConfig = z.infer<typeof PowerDirectorSchema>;

export const SECTION_NAMES = [
  'env',
  'wizard',
  'update',
  'auth',
  'agents',
  'channels',
  'messages',
  'commands',
  'terminal',
  'hooks',
  'skills',
  'tools',
  'gateway',
  'meta',
  'diagnostics',
  'logging',
  'browser',
  'ui',
  'models',
  'nodeHost',
  'bindings',
  'broadcast',
  'audio',
  'media',
  'approvals',
  'session',
  'cron',
  'web',
  'discovery',
  'canvasHost',
  'talk',
  'memory',
  'plugins',
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

export const SECTION_ALIASES = {
  environment: 'env',
  setupWizard: 'wizard',
  updates: 'update',
  authentication: 'auth',
} as const satisfies Record<string, SectionName>;

export function normalizeSectionName(section: string): string {
  return SECTION_ALIASES[section as keyof typeof SECTION_ALIASES] ?? section;
}

export function isSectionName(section: string): section is SectionName {
  return SECTION_NAMES.includes(section as SectionName);
}

export const sectionSchemas: Record<SectionName, z.ZodTypeAny> = {
  env: rootBaseSchema.shape.env || z.any(),
  wizard: rootBaseSchema.shape.wizard || z.any(),
  update: rootBaseSchema.shape.update || z.any(),
  auth: rootBaseSchema.shape.auth || z.any(),
  agents: rootBaseSchema.shape.agents || z.any(),
  channels: rootBaseSchema.shape.channels || z.any(),
  messages: rootBaseSchema.shape.messages || z.any(),
  commands: rootBaseSchema.shape.commands || z.any(),
  terminal: terminalSchema,
  hooks: rootBaseSchema.shape.hooks || z.any(),
  skills: rootBaseSchema.shape.skills || z.any(),
  tools: rootBaseSchema.shape.tools || z.any(),
  gateway: gatewaySchema,
  meta: rootBaseSchema.shape.meta || z.any(),
  diagnostics: rootBaseSchema.shape.diagnostics || z.any(),
  logging: rootBaseSchema.shape.logging || z.any(),
  browser: rootBaseSchema.shape.browser || z.any(),
  ui: rootBaseSchema.shape.ui || z.any(),
  models: modelsSchema,
  nodeHost: rootBaseSchema.shape.nodeHost || z.any(),
  bindings: rootBaseSchema.shape.bindings || z.any(),
  broadcast: rootBaseSchema.shape.broadcast || z.any(),
  audio: rootBaseSchema.shape.audio || z.any(),
  media: rootBaseSchema.shape.media || z.any(),
  approvals: rootBaseSchema.shape.approvals || z.any(),
  session: rootBaseSchema.shape.session || z.any(),
  cron: rootBaseSchema.shape.cron || z.any(),
  web: rootBaseSchema.shape.web || z.any(),
  discovery: rootBaseSchema.shape.discovery || z.any(),
  canvasHost: rootBaseSchema.shape.canvasHost || z.any(),
  talk: rootBaseSchema.shape.talk || z.any(),
  memory: rootBaseSchema.shape.memory || z.any(),
  plugins: rootBaseSchema.shape.plugins || z.any(),
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
