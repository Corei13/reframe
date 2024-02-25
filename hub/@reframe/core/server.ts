import { createBaseCtx } from "./ctx/ctx.ts";
import { localFs } from "./fs/local.ts";
import { moduleServerFs } from "./fs/module-server.ts";
import { routerFs } from "./fs/router.ts";
import { unmoduleFs } from "./fs/unmodule.ts";

export default function serve(
  org: string,
  name: string,
  _version: string,
  entry: string,
) {
  const codeFs = localFs(`/@${org}/${name}`);

  const sourceFs = routerFs()
    .mount("/", () => codeFs)
    .mount("/@", () => unmoduleFs(codeFs));

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
    (request) => {
      // ignore favicon
      if (request.url.endsWith("/favicon.ico")) {
        return new Response(null, { status: 404 });
      }

      return server.fetch(request);
    },
  );
}
