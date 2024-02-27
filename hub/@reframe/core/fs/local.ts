import { BaseCtx } from "../ctx/base.ts";
import { getContentType } from "../utils/content-type.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./fs.ts";
import { ensureDir } from "https://deno.land/std@0.188.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.188.0/path/mod.ts";

export const localFs = <Ctx extends BaseCtx>(prefix: `/${string}`) => {
  return createFs<Ctx>("local")
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
