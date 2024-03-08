import type { Module, Readable } from "../../defs.ts";
import type { Runnable, Runtime } from "../runtime.ts";

export const createDynamicImporter = <
  F extends Readable,
  R extends Runtime<F, {}>,
>(
  moduleCache: Map<string, Promise<Module>>,
) =>
(runtime: R) => {
  return ((
    specifier: string,
  ) => {
    if (specifier === "@") {
      return Promise.resolve({ default: runtime, __esModule: true });
    }

    // todo: throw error on browser
    if (specifier.startsWith("node:")) {
      return import(specifier);
    }

    const path = runtime.resolve(specifier, runtime.meta.path);

    if (moduleCache.has(path)) {
      return moduleCache.get(path)!;
    }

    const sourcePromise = runtime.fs.read(path);
    const runnablePromise = sourcePromise.then((source) =>
      runtime.evaluate<Module<{ default: Runnable }>>(source)
    );

    const modulePromise = runnablePromise.then((moduleFn) =>
      moduleFn.default(runtime.meta.setPath(path))
    );

    moduleCache.set(path, modulePromise);

    return modulePromise;
  });
};
