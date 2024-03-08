import Runtime from "@";
import { createCacheFs } from "@reframe/zero/fs/cache.ts";
import { createRuntime } from "@reframe/zero/runtime.ts";
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

import { cleanPath } from "@reframe/zero/utils/path.ts";
import { createLocalFsWithHeaders } from "@reframe/zero/fs/local.ts";

const createAsyncTaskQueue = <M>(
  maxConcurrency: number,
  task: (key: string) => Promise<M>,
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

  return { enqueue, drain };
};

const createDenoJson = () =>
  JSON.stringify(
    {
      "imports": {
        "/": "./",
        "./": "./",
      },
    },
    null,
    2,
  );

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
    content: ![
        "/deno.json",
        "/meta.json",
        "/entry.ts",
      ].includes(path)
      ? runnableSuffix
      : "",
    headers: ".~headers",
  }),
);

console.log(
  "[build]",
  runtime.meta,
  `${cleanPath(args.buildPath)}/@${org}/${name}/`,
);

const buildFs = createCacheFs(
  runtime.fs,
  destinationFs,
);

const queue = createAsyncTaskQueue(100, async (path) => {
  console.log("[build] read", path);
  const response = await buildFs.read(path);

  const deps = response.header("x-fs-runnable-imports")
    ?.split(",").filter((s) => s !== "") ?? [];

  for (const dep of deps) {
    if (dep.startsWith("node:")) {
      continue;
    }

    const resolved = runtime.resolve(dep, path);

    console.log(
      "enqueue",
      dep + " from " + path + " -> " + resolved,
    );

    queue.enqueue(resolved);
  }

  return await response.text();
});

await queue.enqueue(entry);

await destinationFs.write("/deno.json", createDenoJson(), {});
await destinationFs.write("/meta.json", createMetaJson(runtime.meta), {});
await queue.drain(0);

export {};
