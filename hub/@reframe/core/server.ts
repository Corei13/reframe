import { Base, FS } from "./ctx/ctx.ts";
import { createBaseCtx } from "./ctx/base.ts";
import { localFs } from "./fs/local.ts";
import { moduleServerFs } from "./fs/module-server.ts";
import { npmFs } from "./fs/npm.ts";
import { routerFs } from "./fs/router.ts";
import { unmoduleFs } from "./fs/unmodule.ts";

export default function serve(
  org: string,
  name: string,
  _version: string,
  entry: string,
) {
  const codeFs = localFs(`/@${org}/${name}`);

  const sourceFs: FS<Base> = routerFs()
    .mount("/", () => codeFs)
    .mount("/~@", () => unmoduleFs(sourceFs))
    .mount("/~npm", () => npmFs());

  const appFs = routerFs()
    .mount("/", () =>
      moduleServerFs(
        sourceFs,
        entry,
      ))
    .mount("/~", () => sourceFs);

  const server = appFs.use(createBaseCtx);

  Deno.serve(
    { port: 8080 },
    async (request) => {
      // ignore favicon
      try {
        if (request.url.endsWith("/favicon.ico")) {
          return new Response(null, { status: 404 });
        }

        return await server.fetch(request);
      } catch (error) {
        console.error(error);
        return new Response(error.stack, { status: 500 });
      }
    },
  );
}
