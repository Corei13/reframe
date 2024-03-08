import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";

import { Readable, Writeable } from "./defs.ts";
import { createCacheFs } from "./fs/cache.ts";
import { createHttpFs } from "./fs/http.ts";
import { createLocalFs } from "./fs/local.ts";
import { createNpmFs } from "./fs/npm.ts";
import { createRouterFs } from "./fs/router.ts";
import { createRunnableFs } from "./fs/runnable.ts";
import { cleanPath, resolvePath } from "./utils/path.ts";
import { createLocalFsWithHeaders } from "./fs/local.ts";

const build = async (
  { hook, entry, buildPath }: {
    hook: `@${string}/${string}`;
    entry: string;
    buildPath: `/${string}`;
  },
) => {
  const MAX_CONCURRENCY = 100;
  const hubFs = createLocalFs("/");
  const hookFs = createLocalFs(`/${hook}`);

  const runnableSuffix = ".~.mjs";
  const buildFs = createLocalFsWithHeaders(
    buildPath,
    (path) => ({
      content: ![
          "/deno.json",
          "/entry.ts",
        ].includes(path)
        ? runnableSuffix
        : "",
      headers: ".~headers",
    }),
  );

  const routerFs: Readable & Writeable = createCacheFs(
    createRouterFs()
      .mount("/", () => hubFs)
      .mount("/@", () => hookFs)
      .mount("/~@", () => createRunnableFs(routerFs))
      .mount("/~npm", () => createNpmFs())
      .mount("/~http", () => createHttpFs({ ssl: false }))
      .mount("/~https", () => createHttpFs({ ssl: true })),
    buildFs,
  );

  // read entry, then recursively read all dependencies

  const promises = new Map<string, Promise<string>>();

  const drain = async (concurrency: number): Promise<void> => {
    if (promises.size <= concurrency) {
      return;
    }
    const pending = Array.from(promises.values());
    promises.clear();
    await Promise.all(pending);
    return drain(concurrency);
  };

  const buildOne = async (path: string) => {
    await drain(MAX_CONCURRENCY);

    const response = await routerFs.read(path);

    const deps = response.header("x-fs-runnable-imports")
      ?.split(",").filter((s) => s !== "") ?? [];

    for (const dep of deps) {
      if (dep.startsWith("node:")) {
        continue;
      }

      const resolved = resolvePath(dep, path);

      console.log(
        "enqueue",
        dep + " from " + path + " -> " + resolved,
      );

      if (promises.has(resolved)) {
        continue;
      }

      promises.set(resolved, buildOne(resolvePath(dep, path)));
    }

    return await response.text();
  };

  const buildRuntime = "/~@/@dj/build-experiments/runtime.ts";
  const hookRuntime = "/~@/@/runtime.ts";

  for (
    const path of [
      buildRuntime,
      hookRuntime,
      entry,
    ]
  ) {
    if (!promises.has(path)) {
      promises.set(path, buildOne(path));
    }
  }

  await Promise.all([
    drain(0),

    buildFs.write(
      "/deno.json",
      JSON.stringify(
        {
          "imports": {
            "/": "./",
            "./": "./",
          },
        },
        null,
        2,
      ),
      {},
    ),

    buildFs.write(
      "/entry.ts",
      `
  import createBuildRuntimeRunnable from ".${buildRuntime + runnableSuffix}";

  const { createRuntime: createBuildRuntime } = await createBuildRuntimeRunnable();

  const buildRuntime = createBuildRuntime({
    entry: "/",
    importSuffix: "${runnableSuffix}",
    fs: {},
    moduleCache: new Map()
  });

  const { createRuntime } = await buildRuntime.import("${hookRuntime}");

  const runtime = createRuntime({
    entry: "/",
    importSuffix: "${runnableSuffix}",
    fs: {},
    moduleCache: new Map(),
  });

  await runtime.import("${entry}");
      `,
      {},
    ),
  ]);

  // return buildFs.list();
  return buildFs;
};

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

const buildFs = await build({
  hook: hook as `@${string}/${string}`,
  entry: cleanPath(args.entry),
  buildPath: cleanPath(args.buildPath),
});
