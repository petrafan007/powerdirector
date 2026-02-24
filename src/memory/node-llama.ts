import type * as NodeLlamaCpp from "node-llama-cpp";

type NodeLlamaApi = Pick<
  typeof NodeLlamaCpp,
  "getLlama" | "resolveModelFile" | "LlamaLogLevel"
>;

export async function importNodeLlamaCpp(): Promise<NodeLlamaApi> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<typeof NodeLlamaCpp>;
  const mod = await dynamicImport("node-llama-cpp");
  return {
    getLlama: mod.getLlama,
    resolveModelFile: mod.resolveModelFile,
    LlamaLogLevel: mod.LlamaLogLevel,
  };
}
