import type { Module, Readable } from "../../defs.ts";
import { ModuleCache } from "../../module-cache.ts";
import type { Runnable, Runtime } from "../runtime.ts";

export const createDynamicImporter = <
  F extends Readable,
  R extends Runtime<F, {}>,
>(
  moduleCache: ModuleCache,
) =>
(runtime: R) => {
  return ((
    specifier: string,
  ) => {
    if (specifier === "@") {
      // todo: move this to extend()
      return Promise.resolve({
        default: {
          ...runtime,

          dev: {
            onReload: (fn: () => Promise<void>) => {
              moduleCache.onReload(runtime.meta.path, fn);
            },
          },
        },
        __esModule: true,
      });
    }

    // todo: throw error on browser
    if (specifier.startsWith("node:")) {
      return import(specifier);
    }

    const path = runtime.resolve(specifier, runtime.meta.path);
    console.log("I am here with", path);

    if (moduleCache.has(path)) {
      return moduleCache.get(path)!;
    }

    const sourcePromise = runtime.fs.read(path, {});
    const runnablePromise = sourcePromise.then((source) =>
      runtime.evaluate<Module<{ default: Runnable }>>(source)
    );

    const modulePromise = runnablePromise.then((moduleFn) =>
      moduleFn.default(runtime.meta.setPath(path))
    );

    moduleCache.set(path, modulePromise, runtime.meta.path);

    return modulePromise;
  });
};
