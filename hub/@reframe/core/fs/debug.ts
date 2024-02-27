import { Base, FS } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

const serialize = (value: unknown) => {
  return JSON.stringify(value, (_, value) => {
    if (typeof value === "function") {
      return value.toString();
    }

    return value;
  });
};

export const debugFs = <C extends Base>(
  base: FS<C>,
): FS<C> => {
  return createFs<C>("debug")
    .read(async (ctx) => {
      const content = await ctx.forward(base).text();

      const importUrl = URL.createObjectURL(
        new Blob([content], { type: "text/javascript" }),
      );

      const moduleFn = await import(importUrl) as {
        default: (_: unknown) => Promise<{
          default: (request: Request) => Promise<Response>;
        }>;
      };

      URL.revokeObjectURL(importUrl);

      const runtime = ctx.switch(base).runtime(ctx.path);
      const module = await moduleFn.default(
        runtime,
      );

      console.log(">>> module", ctx.path, module);

      return ctx.text(serialize(module), {
        "content-type": "application/json",
      });
    })
    .write((ctx) => {
      throw ctx.notImplemented();
    });
};
