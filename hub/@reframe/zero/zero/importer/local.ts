import type { Module } from "../../defs.ts";
import { Runtime } from "../runtime.ts";

export const createLocalImporter = <R extends Runtime<{}, {}>>(
  moduleCache: Map<string, Promise<Module>>,
  importSuffix = "",
) =>
(runtime: R) => {
  return (specifier: string) => {
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

    const runnablePromise = import(path + importSuffix);
    const modulePromise = runnablePromise.then((moduleFn) =>
      moduleFn.default(runtime.meta.setPath(path))
    );

    moduleCache.set(path, modulePromise);

    return modulePromise;
  };
};
