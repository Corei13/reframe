const createMinimalRuntime = async () => {
  const importFromDom = async (
    specifier: string,
    runtime?: ReturnType<typeof Runtime>,
  ) => {
    const script = globalThis.document.querySelector(
      `script[data-path="${specifier}"]`,
    );

    if (!script) {
      throw new Error(`module not found: ${specifier}`);
    }

    const code = script.textContent;
    const url = URL.createObjectURL(
      new Blob([code], { type: "application/javascript" }),
    );
    const unmodule = await import(url);

    URL.revokeObjectURL(url);
    return await unmodule.default(runtime);
  };

  const { resolvePath } = await importFromDom(
    "/~@/@reframe/core/utils/path.ts",
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

const { ctx, runtime, hydrate } = await MinimalRuntime(`@:${import.meta.path}`)
  .import("./initialize.ts");

await hydrate();

export {};
