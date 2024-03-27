import { createModuleCache } from "./module-cache.ts";
import { resolvePath } from "./utils/path.ts";
import { createZeroRuntime } from "./zero/runtime-factory.ts";
import { evaluate } from "./zero/evaluator/data-url.ts";
import { Module, Path, Readable } from "./defs.ts";

export const createBaseRuntime = <
  FS extends {},
>({
  entry,
  moduleCache,
  args,
  fs,
}: {
  entry: { org: string; name: string; path: Path };
  moduleCache: ReturnType<typeof createModuleCache>;
  args: string[];
  fs: FS;
}) =>
  createZeroRuntime()
    .extend(() => ({
      path: entry.path,
      entry,
      module: moduleCache,
      args,
      fs,
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
    }));

type BaseRuntime = ReturnType<typeof createBaseRuntime<Readable>>;

export default new Proxy({}, {
  get: (_, key: string) => {
    throw new Error(`BaseRuntime.${key} is not defined`);
  },
}) as BaseRuntime;
