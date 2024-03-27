import { Module, Path } from "./defs.ts";

// todo: we should have two separate cache for runnables and modules
// we can compute the runnables ahead of time by analyzing the graph
// and additionally, we can also compute pure modules (runnables that don't depend on runtime) ahead of time
export const createModuleCache = () => {
  const cache = new Map<Path, {
    parent?: Path;
    module: Promise<Module>;
  }>();

  const onReload = new Map<Path, () => Promise<void>>();

  const moduleCache = {
    has: (key: Path) => cache.has(key),
    get: (key: Path) => {
      console.log("[MODULE-CACHE] GET", key);
      return cache.get(key)?.module;
    },
    set: (key: Path, module: Promise<Module>, parent?: Path) =>
      cache.set(key, { module, parent: parent === key ? undefined : parent }),
    invalidate: async (key: Path): Promise<Path | undefined> => {
      const module = cache.get(key);
      if (!module) {
        return;
      }
      console.log(
        "[MODULE-CACHE] INVALIDATE",
        key,
        module?.parent,
        onReload.get(key),
      );
      await onReload.get(key)?.();
      cache.delete(key);

      if (!module?.parent || !cache.has(module.parent)) {
        return key;
      }

      return moduleCache.invalidate(module.parent);
    },
    onReload: (key: Path, fn: () => Promise<void>) => {
      onReload.set(key, fn);
    },
  };

  return moduleCache;
};

export type ModuleCache = ReturnType<typeof createModuleCache>;
