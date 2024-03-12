import { Readable } from "/@reframe/zero/defs.ts";
import type { Runtime } from "/@reframe/zero/zero/runtime.ts";

export const extendRuntime = <R extends Runtime<Readable, {}>>(runtime: R) => {
  const hydrateRuntime = runtime.extend({
    hydrate: {
      cache: new Set(),
      server: {
        getOnce: (specifier: string) => {
          if (hydrateRuntime.hydrate.cache.has(specifier)) {
            return null;
          }

          return hydrateRuntime.hydrate.server.get(specifier);
        },
        get: (specifier: string) => {
          hydrateRuntime.hydrate.cache.add(specifier);
          return hydrateRuntime.fs.read(specifier);
        },
        has: (specifier: string) => hydrateRuntime.hydrate.cache.has(specifier),
      },
    },
  });
  return hydrateRuntime;
};
