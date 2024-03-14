import type { Body } from "../../body.ts";
import type { ModuleCache } from "../../module-cache.ts";
import type { Module, Path, Readable } from "../../defs.ts";
import type { Runnable, RuntimeFactory } from "../runtime-factory.ts";

export const createDynamicImporter = <
  F extends Readable,
  T extends {
    path: Path;
    fs: F;
    module: ModuleCache;
    resolve: (specifier: string, referrer: Path) => Path;
    evaluate: <M>(content: Body) => Promise<M>;
  },
>(factory: RuntimeFactory<T>) => {
  return ((specifier: string) => {
    // todo: throw error on browser
    if (specifier.startsWith("node:")) {
      return import(specifier);
    }

    const runtime = factory();
    console.log("importing", specifier, runtime.requestCounter);

    if (specifier === "@") {
      return Promise.resolve({
        default: {
          ...runtime,

          dev: {
            onReload: (fn: () => Promise<void>) =>
              runtime.module.onReload(runtime.path, fn),
          },
        },
        __esModule: true,
      });
    }

    const path = runtime.resolve(specifier, runtime.path);

    console.log("importing", path, runtime.reqestId);
    if (
      runtime.module.has(path) && (
        !runtime.requestId ||
        runtime.module.get(path)?.__requestId === runtime.requestId
      )
    ) {
      return runtime.module.get(path)!;
    }

    const sourcePromise = runtime.fs.read(path, {});
    const runnablePromise = sourcePromise.then((source) =>
      runtime.evaluate<Module<{ default: Runnable }>>(source)
    );

    const modulePromise = runnablePromise.then((moduleFn) =>
      Object.assign(
        moduleFn.default(
          runtime.extend(() => ({ path, importer: runtime.path })),
        ),
        {
          __esModule: true,
        },
      )
    );

    runtime.module.set(
      path,
      Object.assign(modulePromise, {
        __requestId: runtime.requestId,
      }),
      runtime.path,
    );

    return modulePromise;
  });
};
