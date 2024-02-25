import type { Base, Ctx, FS } from "../../ctx/ctx.ts";
import { type Body, createBodyPromise } from "../../body.ts";

export const createFs = <C extends Base>(name: string) => ({
  read: (read: (ctx: Ctx<C>) => Promise<Body>) => ({
    write: (write: (ctx: Ctx<C>) => Promise<Body>) => {
      const fs: FS<C> = {
        name,
        read: (ctx) => createBodyPromise(read(ctx)),
        write: (ctx) => createBodyPromise(write(ctx)),

        use: (createCtx: (request: Request, fs: FS<C>) => Ctx<C>) => ({
          fetch: async (request: Request) => {
            const ctx = createCtx(request, fs);
            const operation = ctx.operation === "read" ? read : write;
            const body = await operation(ctx);
            return body.response();
          },
        }),
      };

      return fs;
    },
  }),
});
