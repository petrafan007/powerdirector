import { shouldSuppressBuiltInModel as shouldSuppressBuiltInModelImpl } from "./model-suppression";

type ShouldSuppressBuiltInModel =
  typeof import("./model-suppression").shouldSuppressBuiltInModel;

export function shouldSuppressBuiltInModel(
  ...args: Parameters<ShouldSuppressBuiltInModel>
): ReturnType<ShouldSuppressBuiltInModel> {
  return shouldSuppressBuiltInModelImpl(...args);
}
