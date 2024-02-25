import { Base, Ctx } from "./ctx/ctx.ts";
import { resolve } from "./utils/path.ts";

type Module<T, U> = { default: T } & U & {
  __meta?: {
    specifier: string;
    resolved: string;
    referrer: string[];
  };
};

export type Runtime = {
  entry: string;
  enter: (entry: string) => Runtime;
  moduleCache: Map<string, Promise<Module<unknown, unknown>>>;
  resolve: (specifier: string, referrer: string) => string;
  import: <M extends Module<unknown, unknown>>(
    specifier: string,
  ) => Promise<M>;
  importMany: (
    ...imports: string[]
  ) => Promise<Record<string, Module<unknown, unknown>>>;
};

export const createRuntime = <C extends Base>(
  entry: string,
  ctx: Ctx<C>,
  moduleCache: Map<string, Promise<Module<unknown, unknown>>> = new Map(),
): Runtime => {
  const Runtime = {
    entry,

    moduleCache,

    enter: (entry: string) => createRuntime(entry, ctx, moduleCache),

    resolve: (specifier: string, referrer: string) => {
      // TODO: this is a hack, should be fixed with import maps
      if (specifier === "react" || specifier === "react-dom") {
        return resolve(specifier + "@canary", referrer);
      }

      return resolve(specifier, referrer);
    },

    _import: async (
      specifier: string,
    ): Promise<Module<unknown, unknown>> => {
      const body = await ctx.fs.read(specifier).text();

      try {
        const url = URL.createObjectURL(
          new Blob([body], { type: "application/javascript" }),
        );

        const module = await import(url);
        URL.revokeObjectURL(url);

        return module.default(Runtime.enter(specifier));
      } catch (error) {
        console.error("import error", specifier, error);
        throw error;
      }
    },

    import: <M extends Module<unknown, unknown>>(
      specifier: string,
    ): Promise<M> => {
      const resolved = Runtime.resolve(specifier, entry);

      if (!Runtime.moduleCache.has(resolved)) {
        console.log(
          `%cIMPORT`,
          "color:salmon;",
          resolved,
          specifier,
          entry,
          "MISS",
        );

        Runtime.moduleCache.set(
          resolved,
          Runtime._import(resolved).then((module) => {
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

      return Runtime.moduleCache.get(resolved)! as Promise<M>;
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
