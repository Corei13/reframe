import type { BodyPromise } from "./body.ts";
import type { Base, Ctx } from "./ctx/ctx.ts";
import { resolvePath } from "./utils/path.ts";

type Module<T, U> = { default: T } & U;

export type Runtime<C extends Base = Base> = {
  ctx: Ctx<C>;
  entry: string;
  enter: (entry: string) => Runtime<C>;
  switch: (ctx: Ctx<C>) => Runtime<C>;
  cache: {
    module: Map<string, Promise<Module<unknown, unknown>>>;
    hydrated: Set<string>;
  };
  resolve: (specifier: string, referrer: string) => string;
  read: (specifier: string) => BodyPromise;
  import: <M extends Module<unknown, unknown>>(
    specifier: string,
  ) => Promise<M>;
  importMany: (
    ...imports: string[]
  ) => Promise<Record<string, Module<unknown, unknown>>>;
  hydrate: {
    server: {
      getOnce: (specifier: string) => null | BodyPromise;
      get: (specifier: string) => BodyPromise;
      has: (specifier: string) => boolean;
    };
  };
};

export const createRuntime = <C extends Base>(
  entry: string,
  ctx: Ctx<C>,
  cache: {
    module: Map<string, Promise<Module<unknown, unknown>>>;
    hydrated: Set<string>;
  } = {
    module: new Map(),
    hydrated: new Set(),
  },
): Runtime<C> => {
  const _import = async (
    specifier: string,
  ): Promise<Module<unknown, unknown>> => {
    if (specifier === "@") {
      return { default: Runtime };
    }

    const body = await Runtime.read(specifier);

    try {
      const url = URL.createObjectURL(
        new Blob([await body.text()], { type: "application/javascript" }),
      );

      const moduleFn = await import(url);
      URL.revokeObjectURL(url);

      return await moduleFn.default(Runtime.enter(specifier));
    } catch (error) {
      console.error("import error", specifier, error);
      throw error;
    }
  };

  const Runtime: Runtime<C> = {
    ctx,

    entry,

    cache,

    enter: (entry: string) => createRuntime(entry, ctx, cache),
    switch: (ctx: Ctx<C>) => createRuntime(entry, ctx, cache),

    resolve: resolvePath,

    read: (specifier: string) => ctx.fs.read(specifier),

    hydrate: {
      server: {
        getOnce: (specifier: string) => {
          if (Runtime.cache.hydrated.has(specifier)) {
            return null;
          }

          return Runtime.hydrate.server.get(specifier);
        },
        get: (specifier: string) => {
          Runtime.cache.hydrated.add(specifier);
          return Runtime.read(specifier);
        },
        has: (specifier: string) => Runtime.cache.hydrated.has(specifier),
      },
    },

    import: <M extends Module<unknown, unknown>>(
      specifier: string,
    ): Promise<M> => {
      const resolved = Runtime.resolve(specifier, entry);

      if (!Runtime.cache.module.has(resolved)) {
        console.log(
          `%cIMPORT`,
          "color:salmon;",
          specifier,
          "FROM",
          entry,
          "=>",
          resolved,
          "MISS",
        );

        Runtime.cache.module.set(
          resolved,
          _import(resolved).then((module) => {
            return Object.assign(module, {
              // TODO: this is a hack - figure wtf this works
              __esModule: true,
              __meta: {
                specifier,
                resolved,
                referrer: [entry].concat(module.__meta?.referrer || []),
              },
            });
          }),
        );
      }

      return Runtime.cache.module.get(resolved)! as Promise<M>;
    },

    importMany: async (...imports: string[]) => {
      const specifiers = Array.from(new Set(imports));

      const modules = await Promise.all(
        specifiers.map(
          async (specifier) =>
            [specifier, await Runtime.import(specifier)] as const,
        ),
      );

      return Object.fromEntries(modules);
    },
  };

  return Runtime;
};
