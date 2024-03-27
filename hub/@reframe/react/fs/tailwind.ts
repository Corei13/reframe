import Runtime from "@";
import { createFs } from "@reframe/zero/fs/create.ts";
import { Readable } from "@reframe/zero/defs.ts";

import tailwind, { Config } from "npm:tailwindcss";
import postcss from "npm:postcss";

const extractCss = async (config: Config, code: string) => {
  const result = await postcss([
    tailwind({
      ...config,
      content: [{ raw: code, extension: "html" }],
    }),
  ]).process(
    `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
      `,
    { from: undefined },
  );

  const classes: Record<string, string[]> = {};

  result.root.walkRules((rule) => {
    if (rule.selectors.length === 1) {
      rule.walkDecls((decl) => {
        if (!classes[rule.selector]) {
          classes[rule.selector] = [];
        }

        classes[rule.selector].push(decl.toString());
      });
    }
  });

  return Object.entries(classes).map(([selector, decls]) => {
    return `${selector} { ` + decls.join("; ") + `; }`;
  });
};

export const createTailwindFs = <C extends Readable>(base: C, config: Config) =>
  createFs((ctx) =>
    ctx
      .read(async (path, headers) => {
        console.log("[tw] read", path);
        const body = await base.read(path, headers);
        const code = await body.text();
        const css = await extractCss(config, code);

        const imports = [
          ...(body.header("x-fs-runnable-imports")
            ?.split(",").filter((s) => s.length > 0) ?? []),
          ...(body.header("x-fs-runnable-dynamic-imports")
            ?.split(",").filter((s) => s.length > 0) ?? []),
        ];

        const contents = await Promise.all(
          imports
            // exclude npm for now
            .map((next) => Runtime.resolve(next, `/~tw/${path}`))
            .filter((next) =>
              !((next.includes("/~npm") && !next.includes("@tremor")) ||
                next.startsWith("/~node") ||
                next.startsWith("/~https"))
            )
            .map((next) =>
              base
                .read(next, headers)
                .then((body) => body.text())
            ),
        );

        const styles = new Set<string>(css);
        for (const content of contents) {
          for (const style of content.split("\n")) {
            styles.add(style);
          }
        }

        return ctx.text(
          Array.from(styles).sort().join("\n"),
          {},
        );
      })
  );
