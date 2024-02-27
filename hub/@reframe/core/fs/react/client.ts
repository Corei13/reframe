import { Base, FS } from "../../ctx/ctx.ts";
import { joinSpecifier } from "../../utils/path.ts";
import { splitSpecifier } from "../../utils/path.ts";
import { createFs } from "../lib/create.ts";

const split = (string: string | undefined, separator: string) =>
  string?.split(separator).filter((s) => s.length > 0) ?? [];

export const reactClientFs = <C extends Base>(base: FS<C>) => {
  return createFs<C>("react-client")
    .read(async (ctx) => {
      const body = await ctx
        .cd((path) => "/~@" + path)
        .forward(base);

      const exportedNames = split(
        body.header("x-fs-unmodule-exported-names"),
        ",",
      );
      const exportedNamespaces = split(
        body.header("x-fs-unmodule-exported-namespaces"),
        ",",
      );

      const { loaders } = splitSpecifier(ctx.path);
      const prefix = "..:".repeat(loaders.length + 1);

      return ctx.text(
        [
          `import * as components from "${prefix + ctx.path}";`,
          `import { createClientComponentSlots } from "${prefix}@reframe/react/create-slot.tsx";`,
          `
const { ${
            exportedNames.map((name) => `${name}: $__${name}`).join(", ")
          } } = createClientComponentSlots(
  "/~@${ctx.path}",
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
        throw ctx.notImplemented();
      },
    );
};
