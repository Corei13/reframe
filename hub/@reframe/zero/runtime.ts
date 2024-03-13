import { Path, Readable, Watchable, Writeable } from "./defs.ts";
import { createCacheFs } from "./fs/cache.ts";
import { createGraphFs } from "./fs/graph.ts";
import { createHttpFs } from "./fs/http.ts";
import { createLocalFs, createLocalFsWithHeaders } from "./fs/local.ts";
import { createNpmFs } from "./fs/npm.ts";
import { createRouterFs } from "./fs/router.ts";
import { createRunnableFs } from "./fs/runnable.ts";
import * as R from "./zero/runtime.ts";
import { createDynamicImporter } from "./zero/importer/dynamic.ts";
import { evaluate } from "./zero/evaluator/data-url.ts";
import { resolvePath } from "./utils/path.ts";
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { createModuleCache } from "./module-cache.ts";

export const parseArgs = (_args: string[]) => {
  const args = parse(_args, {});

  const hook = String(args._[0]);

  // create regex for @(<org)/(<name>)/(<path/to/entry>)
  const match = /^@(?<org>[^/]+)\/(?<name>[^/]+?)(?<entry>\/.*)$/.exec(hook);

  if (!match) {
    console.error("hook must be in the form of @<org>/<name>/<path/to/entry>");
    Deno.exit(1);
  }
  const { org, name, entry } = match.groups!;

  return { org, name, entry: entry as Path };
};

export const createSomethingFs = <F extends Readable>(
  rootFs: () => F,
  { org, name }: {
    org: string;
    name: string;
  },
) => {
  return createRouterFs()
    .mount("/", () => createLocalFs("/"))
    .mount("/@", () => createLocalFs(`/@${org}/${name}`))
    .mount("/~@", () => createRunnableFs(rootFs()))
    .mount(
      "/~npm",
      () =>
        createCacheFs(
          createNpmFs(),
          createLocalFsWithHeaders("/.cache/npm", () => ({
            content: ".content.mjs",
            headers: ".headers.json",
          })),
        ),
    )
    .mount("/~http", () => createHttpFs({ ssl: false }))
    .mount("/~https", () =>
      createCacheFs(
        createHttpFs({ ssl: true }),
        createLocalFsWithHeaders("/.cache/https", () => ({
          content: ".content.mjs",
          headers: ".headers.json",
        })),
      ));
};

export function createRuntime(_args: string[]) {
  const { org, name, entry } = parseArgs(_args);

  const runFs: Readable & Writeable & Watchable = createGraphFs(
    `/.run/@${org}/${name}/graph`,
    createLocalFsWithHeaders("/.cache/blob", () => ({
      content: ".content.mjs",
      headers: ".headers.json",
    })),
    createCacheFs(
      createSomethingFs(() => runFs, { org, name }),
      createLocalFsWithHeaders(`/.run/@${org}/${name}`, () => ({
        content: ".content.mjs",
        headers: ".headers.json",
      })),
      (path) =>
        [
          "/~npm",
          "/~https",
          "/~@/~npm",
          "/~@/~https",
        ].some((prefix) => path.startsWith(prefix)),
    ),
  );

  const moduleCache = createModuleCache();

  const runtime = R.createRuntime({
    entry,
    org,
    name,
    fs: runFs,
    resolve: resolvePath,
    evaluate,
    importer: createDynamicImporter(moduleCache),
    args: _args.slice(1),
    extension: {
      temp_moduleCache: moduleCache,
    },
  });

  return runtime;
}
