import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

import { Module, Readable, Writeable } from "./defs.ts";
import { createCacheFs } from "./fs/cache.ts";
import { createHttpFs } from "./fs/http.ts";
import { createLocalFs } from "./fs/local.ts";
import { createNpmFs } from "./fs/npm.ts";
import { createRouterFs } from "./fs/router.ts";
import { createRunnableFs } from "./fs/runnable.ts";
import { cleanPath } from "./utils/path.ts";

import { createMemoryFs } from "./fs/memory.ts";

const args = parse(Deno.args, {
  string: ["buildPath", "entry"],
  alias: { buildPath: ["o"] },
  default: {
    buildPath: "/.build",
    entry: "/main.ts",
  },
});

const hook = String(args._[0]);

if (!hook?.match(/^@.+\/.+$/)) {
  console.error("hook must be in the form of @<org>/<name>");
  Deno.exit(1);
}

const entry = cleanPath(args.entry);

const runFs: Readable & Writeable = createCacheFs(
  createRouterFs()
    .mount("/", () => createLocalFs("/"))
    .mount("/@", () => createLocalFs(`/${hook}`))
    .mount("/~@", () => createRunnableFs(runFs))
    .mount("/~npm", () => createNpmFs())
    .mount("/~http", () => createHttpFs({ ssl: false }))
    .mount("/~https", () => createHttpFs({ ssl: true })),
  createMemoryFs({}),
);

import { createDynamicImporter, createFromImporter } from "./runtime.ts";

const moduleCache = new Map<string, Promise<Module>>();
const runtime = createFromImporter({
  fs: runFs,
  entry,
  path: "/",
  import: createDynamicImporter(moduleCache),
  extension: {},
});

const { createRuntime } = await runtime.import(
  "/~@/@/runtime.ts",
);

const hookRuntime = createRuntime(runtime);

await hookRuntime.import(entry);

export {};
