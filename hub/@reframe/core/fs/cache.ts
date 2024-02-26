import { Base, FS } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const cacheFs = <C extends Base>(
  source: FS<C>,
  cache: FS<C>,
): FS<C> => {
  return createFs<C>("cache")
    .read(async (ctx) => {
      try {
        const body = await ctx.forward(cache);
        ctx.log("HIT", ctx.path);
        return body;
      } catch (_error) {
        ctx.log("MISS", ctx.path);
        const body = await ctx.forward(source);
        await ctx.write(cache, body.clone());
        return body;
      }
    })
    .write(async (ctx) => {
      const result = await source.write(ctx);
      await cache.write(ctx);
      return result;
    });
};
