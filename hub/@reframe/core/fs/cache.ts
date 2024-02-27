import { Base, FS } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const cacheFs = <C extends Base>(
  source: FS<C>,
  cache: FS<C>,
): FS<C> => {
  return createFs<C>("cache")
    .read(async (ctx) => {
      try {
        const [body, headers] = await Promise.all([
          ctx
            .cd((path) => path + "/.content")
            .forward(cache),
          ctx
            .cd((path) => path + "/.headers")
            .forward(cache),
        ]);

        ctx.log("HIT", ctx.path);
        return body.setHeaders(await headers.json() as Record<string, string>);
      } catch (_error) {
        ctx.log("MISS", ctx.path);
        const body = await ctx.forward(source);

        await Promise.all([
          ctx
            .cd((path) => path + "/.content")
            .write(cache, body.clone()),
          ctx
            .cd((path) => path + "/.headers")
            .write(cache, ctx.json(body.headers, {})),
        ]);

        return body;
      }
    })
    .write(async (ctx) => {
      const result = await ctx.forward(source);

      await Promise.all([
        ctx
          .cd((path) => path + "/.content")
          .write(cache, result),
        ctx
          .cd((path) => path + "/.headers")
          .write(cache, ctx.json(result.headers, {})),
      ]);
      return result;
    });
};
