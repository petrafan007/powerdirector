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
  // Keep unwrapping as long as we don't have an .extend method (which means it's a raw ZodObject)
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
  .strict()
  .optional();

const updateBaseSchema = unwrapSchema(rootBaseSchema.shape.update) as z.AnyZodObject;
export const updateSchema = updateBaseSchema.strict().optional();

const authBaseSchema = unwrapSchema(rootBaseSchema.shape.auth) as z.AnyZodObject;
export const authSchema = authBaseSchema
  .safeExtend({
    profiles: z
      .record(
        z.string(),
        z
          .object({
            provider: z.string(),
            mode: z.union([
              z.literal('api_key'),
              z.literal('api-key'),
              z.literal('oauth'),
              z.literal('token'),
            ]),
            email: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .strict()
  .optional();

const agentsBaseSchema = unwrapSchema(rootBaseSchema.shape.agents) as z.AnyZodObject;
const agentDefaultsBaseSchema = unwrapSchema((agentsBaseSchema as any).shape.defaults) as z.AnyZodObject;
const imageGenModelCompatSchema = z
  .object({
    primary: z.string().optional(),
    fallbacks: z.array(z.string()).optional(),
  })
  .strict()
  .optional();
const agentDefaultsCompatSchema = agentDefaultsBaseSchema
  .safeExtend({
    imageGenModel: imageGenModelCompatSchema,
    maxTurns: z.number().int().positive().optional(),
  })
  .strict()
  .optional();
export const agentsSchema = agentsBaseSchema
  .safeExtend({
    defaults: agentDefaultsCompatSchema,
  })
  .strict()
  .optional();

const uiBaseSchema = unwrapSchema(rootBaseSchema.shape.ui) as z.AnyZodObject;
export const uiSchema = uiBaseSchema
  .safeExtend({
    theme: z.enum(['dark', 'light', 'system']).optional(),
    fontSize: z.number().int().min(10).max(24).optional(),
    fontFamily: z.string().optional(),
    sidebarWidth: z.number().int().min(180).max(600).optional(),
    showTimestamps: z.boolean().optional(),
    showToolCalls: z.boolean().optional(),
    codeHighlighting: z.boolean().optional(),
    markdownRendering: z.boolean().optional(),
    maxSidebarChats: z.number().int().min(1).max(20).optional(),
    chatTabs: z.boolean().optional(),
    maxChatTabs: z.number().int().min(1).max(20).optional(),
  })
  .strict()
  .optional();

export const modelEntrySchema = (unwrapSchema(ModelDefinitionSchema) as z.AnyZodObject).safeExtend({
  alias: z.string().optional(),
  rateLimit: z.number().optional(),
  timeoutOverride: z.number().optional(),
}).strict();

export const modelProviderSchema = (unwrapSchema(ModelProviderSchema) as z.AnyZodObject).safeExtend({
  baseUrl: z.string().min(1).optional(),
  models: z.array(modelEntrySchema).optional(),
}).strict();

const modelsBaseSchema = unwrapSchema(ModelsConfigSchema) as z.AnyZodObject;
export const modelsSchema = modelsBaseSchema
  .safeExtend({
    providers: z.record(z.string(), modelProviderSchema).optional(),
  })
  .strict()
  .optional();

const mediaBaseSchema = unwrapSchema(rootBaseSchema.shape.media) as z.AnyZodObject;
export const mediaSchema = mediaBaseSchema
  .safeExtend({
    imageGeneration: z
      .object({
        enabled: z.boolean().optional(),
        provider: z.enum(['openai', 'stability', 'google', 'gemini']).optional(),
        model: z.string().optional(),
        defaultSize: z.enum(['256x256', '512x512', '1024x1024']).optional(),
      })
      .strict()
      .optional(),
    maxUploadSize: z.number().int().min(1).max(500).optional(),
    allowedMimeTypes: z.array(z.string()).optional(),
    storageDir: z.string().optional(),
  })
  .strict()
  .optional();

export const configSchema = rootBaseSchema
  .safeExtend({
    update: updateSchema,
    auth: authSchema,
    agents: agentsSchema,
    ui: uiSchema,
    models: modelsSchema,
    media: mediaSchema,
    terminal: terminalSchema,
  })
  .strict();

export type PowerDirectorConfig = z.infer<typeof configSchema>;

const rawAgentsObject = unwrapSchema(agentsSchema) as z.AnyZodObject;
export const agentDefaultsSchema =
  (rawAgentsObject?.shape?.defaults as z.ZodTypeAny | undefined) ?? z.object({}).strict().optional();

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

export const sectionSchemas: Record<SectionName, z.ZodTypeAny> = {
  env: (configSchema as any).shape.env,
  wizard: (configSchema as any).shape.wizard,
  update: updateSchema,
  auth: authSchema,
  agents: agentsSchema,
  channels: (configSchema as any).shape.channels,
  messages: (configSchema as any).shape.messages,
  commands: (configSchema as any).shape.commands,
  terminal: terminalSchema,
  hooks: (configSchema as any).shape.hooks,
  skills: (configSchema as any).shape.skills,
  tools: (configSchema as any).shape.tools,
  gateway: (configSchema as any).shape.gateway,
  meta: (configSchema as any).shape.meta,
  diagnostics: (configSchema as any).shape.diagnostics,
  logging: (configSchema as any).shape.logging,
  browser: (configSchema as any).shape.browser,
  ui: uiSchema,
  models: modelsSchema,
  nodeHost: (configSchema as any).shape.nodeHost,
  bindings: (configSchema as any).shape.bindings,
  broadcast: (configSchema as any).shape.broadcast,
  audio: (configSchema as any).shape.audio,
  media: mediaSchema,
  approvals: (configSchema as any).shape.approvals,
  session: (configSchema as any).shape.session,
  cron: (configSchema as any).shape.cron,
  web: (configSchema as any).shape.web,
  discovery: (configSchema as any).shape.discovery,
  canvasHost: (configSchema as any).shape.canvasHost,
  talk: (configSchema as any).shape.talk,
  memory: (configSchema as any).shape.memory,
  plugins: (configSchema as any).shape.plugins,
};

export const SECRET_FIELDS = [
  'apiKey',
  'api_key',
  'api-key',
  'oauthToken',
  'refreshToken',
  'token',
  'password',
  'secret',
  'botToken',
  'accessToken',
  'authToken',
  'privateKey',
  'signingSecret',
  'appPassword',
  'imapPass',
  'smtpPass',
  'pushToken',
  'webhookToken',
];
