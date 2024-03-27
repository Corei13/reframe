const createMinimalRuntime = async () => {
  const moduleCache = new Map();

  const importFromDom = async (
    specifier: string,
    runtime?: ReturnType<typeof Runtime>,
  ) => {
    if (moduleCache.has(specifier)) {
      return moduleCache.get(specifier)!;
    }

    const code = await self.__reframe.modules.source.get(specifier);
    const url = URL.createObjectURL(
      new Blob([code], { type: "application/javascript" }),
    );
    const unmodule = await import(url);

    const module = await unmodule.default(runtime);
    // URL.revokeObjectURL(url);

    moduleCache.set(specifier, module);
    return module;
  };

  const { resolvePath } = await importFromDom(
    "/~@/@reframe/zero/utils/path.ts",
  );

  const resolve = (specifier: string, referrer: string) => {
    return resolvePath(specifier, referrer);
  };

  const Runtime = (entry: string) => ({
    import: (specifier: string) =>
      importFromDom(
        resolve(specifier, entry),
        Runtime(resolve(specifier, entry)),
      ),

    importMany: async (...imports: string[]) => {
      const specifiers = Array.from(new Set(imports));

      const modules = await Promise.all(
        specifiers.map(
          async (specifier) =>
            [specifier, await Runtime(entry).import(specifier)] as const,
        ),
      );

      return Object.fromEntries(modules);
    },
  });

  return Runtime;
};

export const MinimalRuntime = await createMinimalRuntime();

declare global {
  interface ImportMeta {
    path: string;
  }
}

const { hydrate } = await MinimalRuntime(`@:${import.meta.path}`)
  .import("./initialize.ts");

await hydrate();

export {};
