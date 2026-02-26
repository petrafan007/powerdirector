export async function importNodeLlamaCpp() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<any>;
  return dynamicImport("node-llama-cpp");
}
