import type { Module } from "../../defs.ts";
import { Runnable, Runtime } from "../runtime.ts";

export const createStaticImporter =
  <R extends Runtime<{}, {}>>(
    moduleCache: Map<string, Promise<Module>>,
    require: (specifier: string) => Promise<
      Module<{
        default: Runnable;
      }>
    >
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

      const modulePromise = require(path).then((moduleFn) =>
        moduleFn.default(runtime.meta.setPath(path))
      );

      moduleCache.set(path, modulePromise);

      return modulePromise;
    };
  };
