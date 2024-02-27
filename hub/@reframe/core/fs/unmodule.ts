import { createFs } from "./lib/create.ts";
import { unmodule } from "../ts/unmodule.ts";
import { Base, FS } from "../ctx/ctx.ts";

export const unmoduleFs = <C extends Base>(base: FS<C>) =>
  createFs<C>("unmodule")
    .read(async (ctx) => {
      const response = await base.read(ctx);

      const code = await response.text();
      const { transpiled, imports } = unmodule(ctx.path, code);

      return ctx.text(transpiled, {
        ...response.headers,
        "x-fs-transpiler-imports": imports.join(","),
      });
    }).write((ctx) => {
      throw ctx.notImplemented();
    });
