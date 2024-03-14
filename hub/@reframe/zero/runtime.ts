import {
  Module,
  Path,
  Readable,
  Routable,
  Watchable,
  Writeable,
} from "./defs.ts";
import { createCacheFs } from "./fs/cache.ts";
import { createGraph, createGraphFs } from "./fs/graph.ts";
import { createHttpFs } from "./fs/http.ts";
import { createLocalFs, createLocalFsWithHeaders } from "./fs/local.ts";
import { createNpmFs } from "./fs/npm.ts";
import { createRouterFs } from "./fs/router.ts";
import { createRunnableFs } from "./fs/runnable.ts";
import { createDynamicImporter } from "./zero/importer/dynamic.ts";
import { evaluate } from "./zero/evaluator/data-url.ts";
import { resolvePath } from "./utils/path.ts";
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { createModuleCache } from "./module-cache.ts";
import { createBaseRuntime, InferFactory } from "./zero/runtime-factory.ts";

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

export const createInnerFs = <F extends Readable>(
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

const createOuterFs = (
  { org, name }: { org: string; name: string },
  graph: ReturnType<typeof createGraph>,
  innerFs: ReturnType<typeof createInnerFs>,
) => {
  const runFs: Readable & Writeable & Watchable = createGraphFs(
    graph,
    createLocalFsWithHeaders("/.cache/blob", () => ({
      content: ".content.mjs",
      headers: ".headers.json",
    })),
    createCacheFs(
      innerFs,
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

  return runFs;
};

export function createRuntime(_args: string[]) {
  const { org, name, entry } = parseArgs(_args);

  const graph = createGraph(`/.run/@${org}/${name}/graph`);

  const innerFs = createInnerFs(() => outerFs, { org, name });
  const outerFs = createOuterFs({ org, name }, graph, innerFs);

  const moduleCache = createModuleCache();

  const base = createBaseRuntime()
    .extend(() => ({
      path: entry,
      entry: {
        org,
        name,
        path: entry,
      },
      module: moduleCache,
      args: _args,
      fs: outerFs,
      resolve: resolvePath,
      evaluate,
    }))
    .extend((factory) => ({
      setImporter: (
        _importer: (
          _: typeof factory,
        ) => <M extends Record<string, unknown>>(
          specifier: string,
        ) => Promise<Module<M>>,
      ) => {
        return factory().extend((factory2) => {
          const _import = <M extends {}>(specifier: string) =>
            _importer(factory2)<M>(specifier);

          return {
            import: _import,
            importMany: async (...paths: Path[]) => {
              return Object.fromEntries(
                await Promise.all(
                  paths.map(async (path) => [
                    path,
                    await _import(path),
                  ]),
                ),
              );
            },
          };
        });
      },
    }))
    .setImporter(createDynamicImporter)
    .extend((factory) => ({
      run: (_path?: Path) => {
        const runtime = factory();
        const path = _path ?? runtime.path;
        console.log("running", path);
        return runtime.import(`/:${path}`);
      },
    }))
    .extend((factory) => {
      type T = InferFactory<typeof factory>;

      return {
        setFs: (createFs: (fs: unknown) => unknown) => {
          const newInnerFs = createFs(
            createInnerFs(() => newOuterFs, { org, name }),
          );
          const newOuterFs = createOuterFs({ org, name }, graph, newInnerFs);

          return factory().extend((factory) => ({
            fs: newOuterFs,
          }));
        },
      };
    });

  return base;
}
