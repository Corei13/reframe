import { Base, Ctx } from "../ctx/base.ts";
import { createFs, FS } from "./fs.ts";

export const moduleServerFs = <CtxBase extends Base>(
  base: FS<CtxBase>,
  entry: string,
): FS<CtxBase> => {
  const serve = async (ctx: Ctx<CtxBase>) => {
    const content = await base.read(ctx.cd(entry)).text();

    const importUrl = URL.createObjectURL(
      new Blob([content], { type: "text/javascript" }),
    );

    const module = await import(importUrl) as {
      default: (request: Request) => Promise<Response>;
    };

    URL.revokeObjectURL(importUrl);

    const result = await module.default(ctx.request);

    if (result instanceof Response) {
      return ctx.response(result.body, Object.fromEntries(result.headers));
    }

    throw ctx.badRequest("expected a response, got: " + JSON.stringify(result));
  };

  return createFs<CtxBase>("server")
    .read(async (ctx) => {
      return await serve(ctx);
    })
    .write(async (ctx) => {
      return await serve(ctx);
    });
};
