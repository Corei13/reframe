import { splitSpecifier } from "@reframe/zero/utils/path.ts";
import { createFs } from "@reframe/zero/fs/create.ts";
import { Path, Readable } from "@reframe/zero/defs.ts";

const split = (string: string | undefined, separator: string) =>
  string?.split(separator).filter((s) => s.length > 0) ?? [];

export const createProxy = <
  R extends Record<string, unknown>,
>(path: Path, components: R): R => {
  return new Proxy({} as R, {
    get: (_, name) => {
      if (typeof name !== "string") {
        throw new Error("Expected a string");
      }

      return Object.assign(components[name]!, {
        $$typeof: Symbol.for("react.client.reference"),
        $$id: path + "#" + name,
        $$async: false,
      });
    },
  });
};

export const createReactClientFs = <C extends Readable>(base: C) => {
  return createFs((ctx) =>
    ctx
      .read(async (path, headers) => {
        const body = await base.read(`/~@${path}`, headers);

        const exportedNames = split(
          body.header("x-fs-runnable-exported-names"),
          ",",
        );
        const exportedNamespaces = split(
          body.header("x-fs-runnable-exported-namespaces"),
          ",",
        );

        const { loaders } = splitSpecifier(path);
        const prefix = "..:".repeat(loaders.length + 1);

        return ctx.text(
          [
            `import * as components from "${prefix + path}";`,
            `import { createProxy } from "${prefix}@reframe/react/fs/client.ts";`,
            `const { ${
              exportedNames
                .map((name) => `${name}: $__${name}`)
                .join(", ")
            } } = createProxy("${path}", components);
`,
            `export { ${
              exportedNames
                .map((name) => `$__${name} as ${name}`)
                .join(", ")
            } };`,
            ...exportedNamespaces.map(
              (namespace) => `export * from "${namespace}";`,
            ),
          ].join("\n"),
          body.headers,
        );
      })
  );
};
