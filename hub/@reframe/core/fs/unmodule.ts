import { createFs } from "./lib/create.ts";
import { unmodule } from "../ts/unmodule.ts";
import { Base, FS } from "../ctx/ctx.ts";

export const unmoduleFs = <C extends Base>(base: FS<C>) =>
  createFs<C>("unmodule")
    .read(async (ctx) => {
      const response = await ctx.forward(base);

      const code = await response.text();
      const { transpiled, imports, exports } = unmodule(ctx.path, code);

      return ctx.text(transpiled, {
        ...response.headers,
        "x-fs-unmodule-imports": imports.filter((s) => s !== "@").join(","),
        "x-fs-unmodule-exported-names": exports.names.join(","),
        "x-fs-unmodule-exported-namespaces": exports.namespaces.join(","),
        "content-type": "application/javascript",
      });
    }).write((ctx) => {
      throw ctx.notImplemented();
    });
