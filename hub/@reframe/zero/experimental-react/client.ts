import { Readable } from "/defs.ts";
import { createFs } from "../fs/create.ts";

const split = (string: string | undefined, separator: string) =>
  string?.split(separator).filter((s) => s.length > 0) ?? [];

export const splitSpecifier = (specifier: string): {
  loaders: string[];
  segments: string[];
} => {
  // TODO: (transpile:/path/to/loader):file
  const parts = specifier.split(":");
  const path = parts.pop()!;
  const segments = path.split("/").filter(Boolean);
  while (segments[0]?.startsWith("~")) {
    parts.push(segments.shift()!.slice(1));
  }
  return {
    loaders: parts,
    segments,
  };
};

export const reactClientFs = <C extends Readable>(base: C) => {
  return createFs((ctx) => 
    ctx
      .read(async (path) => {
        const body = await base.read(`/~@/${path}`);

        const exportedNames = split(
          body.header("x-fs-unmodule-exported-names"),
          ",",
        );
        const exportedNamespaces = split(
          body.header("x-fs-unmodule-exported-namespaces"),
          ",",
        );

        const { loaders } = splitSpecifier(path);
        const prefix = "..:".repeat(loaders.length + 1);


        return ctx.text(
          [
            `import * as components from "${prefix + path}";`,
            `import { createClientComponentSlots } from "${prefix}@reframe/react/create-slot.tsx";`,
            `
  const { ${
              exportedNames.map((name) => `${name}: $__${name}`).join(", ")
            } } = createClientComponentSlots(
    "/~@${path}",
    components,
  );
  `,
            `export { ${
              exportedNames.map((name) => `$__${name} as ${name}`).join(", ")
            } };`,
            ...exportedNamespaces.map(
              (namespace) => `export * from "${namespace}";`,
            ),
          ].join("\n"),
          body.headers,
        );
      })
    .write(
      (ctx) => {
        throw new Error("Not implemented");
      },
    )
};
