export async function importNodeLlamaCpp() {
  try {
    return await import(/* webpackIgnore: true */ "node-llama-cpp");
  } catch {
    return null;
  }
}
