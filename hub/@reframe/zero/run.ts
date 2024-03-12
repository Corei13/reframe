import { createRuntime } from "./runtime.ts";

const runtime = createRuntime(Deno.args);

const { createRuntime: createHookRuntime } = await runtime
  .import<{
    createRuntime: (args: string[]) => typeof runtime;
  }>("/@/runtime.ts");

// we send the full args to the hook runtime, it's up to the hook to parse them and send down the relevant ones
const hookRuntime = createHookRuntime(Deno.args)
  .meta.setEntry(runtime.meta.entry);

console.log(
  "hookRuntime",
  hookRuntime.meta,
  Deno.args,
  runtime.meta,
);
await hookRuntime.run();

const listener = hookRuntime.fs.watch("/", async (event) => {
  console.log("EVENT", event);
  const root = await hookRuntime.temp_moduleCache.invalidate(event.path);
  console.log("ROOT", event.path, root);
  if (root) {
    await hookRuntime.run(root);
  }
});

export {};
