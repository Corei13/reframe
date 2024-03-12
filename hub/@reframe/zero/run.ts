import { createRuntime, parseArgs } from "./runtime/dev.ts";

const runtime = createRuntime(Deno.args);

const { createRuntime: createHookRuntime } = await runtime.import<{
  createRuntime: (args: string[]) => typeof runtime;
}>("/@/runtime/dev.ts");

// we send the full args to the hook runtime, it's up to the hook to parse them and send down the relevant ones
const hookRuntime = createHookRuntime(Deno.args);

console.log("hookRuntime", hookRuntime.meta, Deno.args, runtime.meta);

await hookRuntime.run();

export {};
