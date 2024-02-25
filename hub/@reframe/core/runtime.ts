import { Base, Ctx } from "./ctx/ctx.ts";

type Module<T, U> = { default: T } & U;

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
): Runtime => {
  const Runtime = {
    entry,

    enter: (entry: string) => ({
      ...Runtime,
      entry,
    }),

    moduleCache: new Map<string, Promise<Module<unknown, unknown>>>(),

    resolve: (specifier: string, referrer: string) => {
      if (specifier.startsWith(".")) {
        // get the absolute path compared to the current file
        const segments = referrer.split("/").filter(Boolean);
        segments.pop(); // remove the file name

        const specifierSegments = specifier.split("/").filter(Boolean);

        for (const segment of specifierSegments) {
          if (segment === "..") {
            if (segments.length === 0) {
              throw new Error(`Invalid specifier: ${specifier}`);
            }

            segments.pop();
          } else if (segment !== ".") {
            segments.push(segment);
          }
        }

        return "/" + segments.join("/");
      }

      return specifier;
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
        console.log(`%cIMPORT`, "color:salmon;", resolved, "MISS");

        Runtime.moduleCache.set(
          resolved,
          Runtime._import(resolved).then((module) => {
            // TODO: this is a hack - figure wtf this works

            return {
              ...module,
              __esModule: true,
            };
          }),
        );
      }

      console.log("IMPORT", resolved, "HIT");

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

      console.log("IMPORT MANY", Runtime.moduleCache);

      return Object.fromEntries(modules);
    },
  };

  return Runtime;
};
