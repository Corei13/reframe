import { createRuntime as createZeroRuntime } from "@reframe/zero/runtime.ts";

export const createRuntime = (args: string[]) => {
  return createZeroRuntime(args);
};
