// AUTOMATICALLY GENERATED Documentation Component for models
import React from 'react';

const MODELS_CONFIGS = [
    {
        path: 'models.mode',
        label: 'Mode',
        type: 'Enum: merge | replace',
        description: 'Governs how PowerDirector aggregates the physical lists of AI Models available across all API Providers. `merge` allows the system to combine discovered models with your local configuration. `replace` completely forces the engine to only acknowledge explicitly hardcoded mappings within its own logic, protecting from unexpected upstream deprecations.'
    },
    {
        path: 'models.providers',
        label: 'Providers',
        type: 'record',
        description: 'An immense matrix explicitly mapping API keys, base URLs, and custom header payloads for OpenAI, Anthropic, Bedrock, Groq, local Ollama endpoints, and everything in between.'
    },
    {
        path: 'models.providers.{key}.baseUrl',
        label: 'Base Url',
        type: 'string',
        description: 'The primary API endpoint for the model provider. If empty, the system utilizes the standard default URL for that specific vendor.'
    },
    {
        path: 'models.providers.{key}.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'The authentication token required to authorize requests. For security, it is highly recommended to inject this via environment variables.'
    },
    {
        path: 'models.providers.{key}.authHeader',
        label: 'Auth Header',
        type: 'boolean',
        description: 'Specifies whether to inject an Authorization header into every outgoing request. Essential for providers like Ollama that require a GUI login token or specific bearer authentication.'
    },
    {
        path: 'models.providers.{key}.retrieveLocalModels',
        label: 'Retrieve Local Models',
        type: 'boolean',
        description: 'Toggles dynamic model discovery. If enabled, PowerDirector will attempt to query the provider\'s `/api/tags` endpoint to catalog available models automatically. This disables manual model configuration for this provider to ensure consistency with the local environment.'
    },
    {
        path: 'models.providers.{key}.models',
        label: 'Models List',
        type: 'array',
        description: 'A collection of specific model definitions supported by this provider, including their names, IDs, and capability metadata.'
    },
    {
        path: 'models.bedrockDiscovery',
        label: 'Bedrock Discovery',
        type: 'object',
        description: 'Because AWS Amazon Bedrock contains hundreds of distinct models spanning multiple families (Claude, Llama, Titan), this specialized engine allows PowerDirector to dynamically query AWS natively using standard Boto3/IAM roles to catalog exactly which models the physical EC2 Instance has rights to utilize.'
    },
    {
        path: 'models.bedrockDiscovery.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the AWS REST catalog crawler.'
    },
    {
        path: 'models.bedrockDiscovery.region',
        label: 'Region',
        type: 'string',
        description: 'Explicit AWS data center boundary (e.g. `us-east-1` or `eu-west-3`) since Bedrock model availability fluctuates wildly between geographic constraints.'
    },
    {
        path: 'models.bedrockDiscovery.providerFilter',
        label: 'Provider Filter',
        type: 'array',
        description: 'An array of strings (e.g. `["Anthropic", "Meta"]`) instructing the discovering loop to completely ignore AWS-native Amazon Titan models or Cohere models that you don\'t want cluttering up the PowerDirector UI.'
    },
    {
        path: 'models.bedrockDiscovery.refreshInterval',
        label: 'Refresh Interval',
        type: 'string',
        description: 'Cron syntax instructing the crawler precisely how often it should ping the AWS Identity center searching for freshly spawned Foundational Models.'
    },
    {
        path: 'models.bedrockDiscovery.defaultContextWindow',
        label: 'Default Context Window',
        type: 'number',
        description: 'Failsafe boundary definition used exclusively if the AWS API drops the context limit when fetching the model\'s metadata packet.'
    },
    {
        path: 'models.bedrockDiscovery.defaultMaxTokens',
        label: 'Default Max Tokens',
        type: 'number',
        description: 'Failsafe upper limit defining maximum allowed generation.'
    }
];

export default function ModelsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">AI Model Backends Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep parameters bridging the core PowerDirector orchestration layer specifically to external LLM providers. Controls how AWS Bedrock models are auto-discovered and maps granular configuration vectors per API provider.</p>
            </div>
            <div className="space-y-6">
                {MODELS_CONFIGS.map((config) => (
                    <div key={config.path} id={config.path} className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                        <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{config.label}</h3>
                        <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Path: <span className="text-[var(--pd-text-main)] font-semibold">{config.path}</span>
                            </span>
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Type: <span className="text-[var(--pd-text-main)] font-semibold">{config.type}</span>
                            </span>
                        </div>
                        <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                            <p>{config.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
