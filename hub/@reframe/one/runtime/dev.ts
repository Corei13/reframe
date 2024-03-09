import { createRuntime as createZeroRuntime } from "@reframe/zero/runtime/dev.ts";

export const createRuntime = (args: string[]) => {
  return createZeroRuntime(args);
};
