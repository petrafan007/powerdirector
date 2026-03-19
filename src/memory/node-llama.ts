export async function importNodeLlamaCpp() {
  try {
    return await import("node-llama-cpp");
  } catch {
    return null;
  }
}
