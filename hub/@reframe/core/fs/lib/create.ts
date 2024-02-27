import type { Base, Ctx, FS } from "../../ctx/ctx.ts";
import { type Body, createBodyPromise } from "../../body.ts";

export const createFs = <C extends Base>(name: string, opts?: {
  base?: string;
}) => ({
  read: (read: (ctx: Ctx<C>) => Promise<Body>) => ({
    write: (write: (ctx: Ctx<C>) => Promise<Body>) => {
      const base = opts?.base ?? "https://localhost";
      const fsRead = (ctx: Ctx<C>) => createBodyPromise(read(ctx));
      const fsWrite = (ctx: Ctx<C>) => createBodyPromise(write(ctx));

      const fs: FS<C> = {
        name,
        base,

        read: fsRead,
        write: fsWrite,

        use: (createCtx: (request: Request, fs: FS<C>) => Ctx<C>) => ({
          name,
          read: (path: string, headers?: Record<string, string>) =>
            fsRead(
              createCtx(
                new Request(new URL(path, base), {
                  headers,
                }),
                fs,
              ),
            ),
          write: (path: string, body: Body, headers?: Record<string, string>) =>
            fsWrite(
              createCtx(
                new Request(new URL(path, base), {
                  method: "POST",
                  body: body.underlying,
                  headers,
                }),
                fs,
              ),
            ),
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
