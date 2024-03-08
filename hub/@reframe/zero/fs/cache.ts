import { Readable, Writeable } from "../defs.ts";
import { createFs } from "./create.ts";

export const createCacheFs = <
  S extends Readable & (Writeable | {}),
  C extends Readable & Writeable,
>(
  source: S,
  cache: C,
) => {
  return createFs((ctx) =>
    ctx
      .read(async (path) => {
        try {
          const body = await cache.read(path);

          //   ctx.log("HIT", path);
          console.log("[cache] HIT", path);
          return body;
        } catch (_error) {
          //   ctx.log("MISS", path);
          console.log("[cache] MISS", path);
          //   const body = await ctx.forward(source);
          const body = await source.read(path);

          await cache.write(path, await body.clone().text(), body.headers);

          return body;
        }
      })
      .write(async (path, content, headers) => {
        if (!("write" in source)) {
          throw new Error("source does not support write");
        }

        const result = await source.write(path, content, headers);

        await cache.write(path, content, headers);

        return result;
      })
  );
};
