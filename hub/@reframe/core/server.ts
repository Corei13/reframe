import { createBaseCtx } from "./ctx/base.ts";
import { localFs } from "./fs/local.ts";
import { moduleServerFs } from "./fs/module-server.ts";

export default function serve(
  org: string,
  name: string,
  _version: string,
  entry: string,
) {
  const sourceFs = localFs(`/@${org}/${name}`);

  const appFs = moduleServerFs(
    sourceFs,
    entry,
  );

  Deno.serve(
    { port: 8080 },
    (request) => {
      // ignore favicon
      if (request.url.endsWith("/favicon.ico")) {
        return new Response(null, { status: 404 });
      }
      return appFs.use(createBaseCtx).fetch(request);
    },
  );
}
