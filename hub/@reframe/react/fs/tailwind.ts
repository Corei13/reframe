import { createFs } from "@reframe/zero/fs/create.ts";
import tailwind from "npm:tailwindcss";
import postcss from "npm:postcss";
import { Readable } from "@reframe/zero/defs.ts";
import { resolvePath } from "@reframe/zero/utils/path.ts";

const config = {
  theme: {
    colors: {
      white: "white",
      transparent: "transparent",
      primary: {
        50: "#e9ecff",
        100: "#d7dcff",
        200: "#b6bdff",
        300: "#8b92ff",
        400: "#635dff",
        500: "#5038ff",
        600: "#4616ff",
        700: "#3f0cf6",
        800: "#330dc6",
        900: "#2e159a",
        950: "#170a48",
      },
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      serif: ["Inter", "serif"],
    },
    extend: {
      borderRadius: {
        inherit: "inherit",
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

const extractCss = async (code: string) => {
  const result = await postcss([
    tailwind({
      ...config,
      content: [{ raw: code, extension: "html" }],
    }),
  ]).process(
    `
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

// todo: support tailwind.config
export const tailwindFs = <C extends Readable>(base: C) => {
  return createFs((ctx) =>
    ctx
      .read(async (path, headers) => {
        const body = await base.read(`/~@${path}`, headers);
        const code = await body.text();
        const css = await extractCss(code);

        const imports = body.header("x-fs-runnable-imports")
          ?.split(",").filter((s) => s.length > 0) ?? [];
        
        const contents = await Promise.all(
          imports.map(async (importPath) => {
            return resolvePath(importPath, path).text();
          }),
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
    .write(async (path, body) => { 
      throw new Error("Not implemented");
    })
  );
};