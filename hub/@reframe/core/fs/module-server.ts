import { Base, Ctx, FS } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const moduleServerFs = <C extends Base>(
  base: FS<C>,
  entry: string,
): FS<C> => {
  const serve = async (ctx: Ctx<C>) => {
    const content = await base.read(ctx.cd(entry)).text();

    const importUrl = URL.createObjectURL(
      new Blob([content], { type: "text/javascript" }),
    );

    const moduleFn = await import(importUrl) as {
      default: (_: unknown) => Promise<{
        default: (request: Request) => Promise<Response>;
      }>;
    };

    URL.revokeObjectURL(importUrl);

    const module = await moduleFn.default({
      // todo: implement
      importMany: async () => {
        return {};
      },
    });

    const result = await module.default(ctx.request);

    if (result instanceof Response) {
      return ctx.response(result.body, Object.fromEntries(result.headers));
    }

    throw ctx.badRequest("expected a response, got: " + JSON.stringify(result));
  };

  return createFs<C>("server")
    .read(async (ctx) => {
      return await serve(ctx);
    })
    .write(async (ctx) => {
      return await serve(ctx);
    });
};
