import { Base } from "../ctx/ctx.ts";
import { getContentType } from "../utils/content-type.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./lib/create.ts";
import { ensureDir } from "https://deno.land/std@0.188.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.188.0/path/mod.ts";

export const localFs = <C extends Base>(prefix: `/${string}`) => {
  return createFs<C>("local")
    .read(async (ctx) => {
      const content = Deno.readTextFileSync(
        Deno.cwd() + cleanPath(prefix + ctx.path),
      );

      return ctx.text(content, {
        "x-fs-local-cwd": Deno.cwd(),
        "x-fs-abs-path": Deno.cwd() + cleanPath(prefix + ctx.path),
        "x-fs-local-stat-size": String(content.length),
        "content-type": getContentType(ctx.path),
      });
    })
    .write(async (ctx) => {
      const path = Deno.cwd() + cleanPath(prefix + ctx.path);

      await ensureDir(dirname(path));

      if (!ctx.body) {
        throw ctx.badRequest("missing body");
      }

      const content = await ctx.body.text();
      Deno.writeFileSync(path, new TextEncoder().encode(content));

      return ctx.text(
        content,
        {
          "x-fs-local-cwd": Deno.cwd(),
          "x-fs-abs-path": Deno.cwd() + cleanPath(prefix + ctx.path),
          "x-fs-local-stat-size": String(content.length),
          "content-type": getContentType(ctx.path),
        },
      );
    });
};
