import { createRuntime as createZeroRuntime } from "@reframe/zero/runtime/dev.ts";
import { extendRuntime } from "./extension.ts";

export const createRuntime = (args: string[]) => {
  return extendRuntime(createZeroRuntime(args));
};
