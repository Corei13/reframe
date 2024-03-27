import { createRuntime } from "./runtime.ts";
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

const runtime = createRuntime(Deno.args);

const mod = await runtime
  .import<{
    createRuntime: () => typeof runtime;
  }>("/@/runtime.ts");

const {
  createRuntime: createHookRuntime,
} = mod;

console.log("createHookRuntime", mod.createRuntime.toString());
let hookRuntime = createHookRuntime()
  .extend(() => ({ path: runtime.path }));

console.log(
  "hookRuntime",
  hookRuntime,
  Deno.args,
  runtime,
);

await hookRuntime.run();

const { watch } = parse(Deno.args);

if (watch) {
  const _listener = hookRuntime.fs.watch("/", async (event) => {
    console.log("EVENT", event);
    const root = await hookRuntime.module.invalidate(event.path);

    console.log("ROOT", event.path, root);
    if (root) {
      await hookRuntime.run(root);
    }
  });
}

export {};
