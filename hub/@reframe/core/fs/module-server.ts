import { Base, Ctx, FS } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const moduleServerFs = <C extends Base>(
  base: FS<C>,
  entry: string,
): FS<C> => {
  const serve = async (ctx: Ctx<C>) => {
    const content = await ctx.cd(entry).forward(base).text();

    const importUrl = URL.createObjectURL(
      new Blob([content], { type: "text/javascript" }),
    );

    const moduleFn = await import(importUrl) as {
      default: (_: unknown) => Promise<{
        default: (request: Request) => Promise<Response>;
      }>;
    };

    URL.revokeObjectURL(importUrl);

    const module = await moduleFn.default(
      ctx.switch(base).runtime(entry),
    );

    const result = await module.default(ctx.request);

    if (result instanceof Response) {
      return ctx.response(result.body, Object.fromEntries(result.headers));
    }

    throw ctx.badRequest("expected a response, got: " + JSON.stringify(result));
  };

  return createFs<C>("module-server")
    .read(serve)
    .write(serve);
};
