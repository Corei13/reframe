import Runtime from "@";
import { createCacheFs } from "@reframe/zero/fs/cache.ts";
import { createRuntime } from "@reframe/zero/runtime/dev.ts";
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

import { cleanPath } from "@reframe/zero/utils/path.ts";
import { createLocalFsWithHeaders } from "@reframe/zero/fs/local.ts";

const createAsyncTaskQueue = <M>(
  maxConcurrency: number,
  task: (key: string) => Promise<M>
) => {
  const promises = new Map<string, Promise<M>>();
  const done = new Set<string>();

  const drain = async (concurrency: number): Promise<void> => {
    if (promises.size <= concurrency) {
      return;
    }

    const entries = Array.from(promises.entries());

    for (const key of entries.map(([key]) => key)) {
      done.add(key);
      promises.delete(key);
    }

    await Promise.all(entries.map(([_, promise]) => promise));

    return drain(concurrency);
  };

  const enqueue = async (path: string) => {
    if (done.has(path) || promises.has(path)) {
      return;
    }

    await drain(maxConcurrency);
    promises.set(path, task(path));
  };

  return { enqueue, drain, done };
};

const createDenoJson = () =>
  JSON.stringify(
    {
      imports: {
        "/": "./",
        "./": "./",
      },
    },
    null,
    2
  );

const createEntryTs = (suffix: string, paths: string[]) =>
  `
import $createRuntime from "/~@/@reframe/zero/zero/runtime.ts${suffix}";
import $createStaticImporter from "/~@/@reframe/zero/zero/importer/static.ts${suffix}";
import $path from "/~@/@reframe/zero/utils/path.ts${suffix}";

import meta from "./meta.json" with { type: "json" };

const { createRuntime } = await $createRuntime();
const { createStaticImporter } = await $createStaticImporter();
const { resolvePath } = await $path();

const require = (specifier) => {
  switch (specifier) {
    ${paths
      .map((path) => `case "${path}": return import("${path + suffix}");`)
      .join("\n\t\t")}
    default:
      throw new Error("module not found: " + specifier);
  }
}

const moduleCache = new Map();

const runtime = createRuntime({
  entry: meta.entry,
  org: meta.org,
  name: meta.name,
  fs: {},
  resolve: resolvePath,
  evaluate: () => {},
  importer: createStaticImporter(moduleCache, require),
  args: Deno.args,
  extension: {},
});

const { extendRuntime } = await runtime.import("/:" + "/~@/@/runtime/extension.ts");

await extendRuntime(runtime).run(meta.entry);
`;

const createMetaJson = (meta: unknown) => JSON.stringify(meta, null, 2);

const args = parse(Runtime.args, {
  string: ["buildPath"],
  alias: { buildPath: ["o"] },
  default: {
    buildPath: "/.build",
    entry: "/main.ts",
  },
});

const hook = String(args._[0]);

// create regex for @(<org)/(<name>)/(<path/to/entry>)
const match = /^@(?<org>[^/]+)\/(?<name>[^/]+?)(?<entry>\/.*)$/.exec(hook);

if (!match) {
  console.error("hook must be in the form of @<org>/<name>/<path/to/entry>");
  Deno.exit(1);
}
const { org, name, entry } = match.groups!;

const runtime = createRuntime([hook]);

const runnableSuffix = ".~.mjs";
const destinationFs = createLocalFsWithHeaders(
  `${cleanPath(args.buildPath)}/@${org}/${name}/`,
  (path) => ({
    content: !["/deno.json", "/meta.json", "/entry.ts"].includes(path)
      ? runnableSuffix
      : "",
    headers: ".~headers",
  })
);

console.log(
  "[build]",
  runtime.meta,
  `${cleanPath(args.buildPath)}/@${org}/${name}/`
);

const buildFs = createCacheFs(runtime.fs, destinationFs);

const queue = createAsyncTaskQueue(100, async (path) => {
  console.log("[build] read", path);
  const response = await buildFs.read(path);

  const split = (s?: string) => s?.split(",").filter((s) => s !== "") ?? [];
  const deps = [
    ...split(response.header("x-fs-runnable-imports")),
    ...split(response.header("x-fs-runnable-dynamic-imports")),
  ];

  for (const dep of deps) {
    if (dep.startsWith("node:")) {
      continue;
    }

    const resolved = runtime.resolve(dep, path);

    console.log("enqueue", dep + " from " + path + " -> " + resolved);

    queue.enqueue(resolved);
  }

  return await response.text();
});

await queue.enqueue(entry);
await queue.enqueue("/~@/@/runtime/extension.ts");
// we import the following files in /entry.ts
await queue.enqueue("/~@/@reframe/zero/zero/runtime.ts");
await queue.enqueue("/~@/@reframe/zero/zero/importer/static.ts");
await queue.enqueue("/~@/@reframe/zero/utils/path.ts");

await destinationFs.write("/deno.json", createDenoJson(), {});
await destinationFs.write("/meta.json", createMetaJson(runtime.meta), {});
await queue.drain(0);
await destinationFs.write(
  "/entry.ts",
  createEntryTs(runnableSuffix, Array.from(queue.done)),
  {}
);

export {};
