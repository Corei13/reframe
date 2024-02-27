import { Base, FS } from "./ctx/ctx.ts";
import { createBaseCtx } from "./ctx/base.ts";
import { localFs } from "./fs/local.ts";
import { moduleServerFs } from "./fs/module-server.ts";
import { npmFs } from "./fs/npm.ts";
import { routerFs } from "./fs/router.ts";
import { unmoduleFs } from "./fs/unmodule.ts";
import { cacheFs } from "./fs/cache.ts";
import { memoryFs } from "./fs/memory.ts";
import { debugFs } from "./fs/debug.ts";
import { httpFs } from "./fs/http.ts";
import { createFs } from "./fs/lib/create.ts";
import { reactClientFs } from "./fs/react/client.ts";

const withHeaders = <C extends Base>(fs: FS<C>) =>
  createFs<C>(`withHeaders<${fs.name}>`)
    .read(async (ctx) => {
      const b = await ctx.forward(fs);
      const content = [
        ...Object.entries(b.headers).map(([k, v]) =>
          `// ${k}: ${JSON.stringify(v)}`
        ),
        "",
        "",
        await b.text(),
      ].join("\n");
      return ctx.text(content, b.headers);
    }).write((ctx) => ctx.forward(fs));

export default function serve(
  org: string,
  name: string,
  _version: string,
  entry: string,
) {
  const hooksFs = localFs(`/`);
  const codeFs = localFs(`/@${org}/${name}`);

  const sourceFs: FS<Base> = cacheFs(
    routerFs()
      // all hooks
      .mount("/", () => hooksFs)
      // our app
      .mount("/@", () => codeFs)
      .mount("/~@", () => unmoduleFs(sourceFs))
      .mount("/~npm", () => npmFs())
      .mount("/~http", () => httpFs(false))
      .mount("/~https", () => httpFs())
      .mount("/~react-client", () => reactClientFs(sourceFs)),
    // localFs(`/.cache/v${_version}`),
    memoryFs({}),
  );

  const appFs = routerFs()
    .mount("/", () =>
      moduleServerFs(
        sourceFs,
        entry,
      ))
    .mount("/~", () => withHeaders(sourceFs))
    .mount("/=", () => debugFs(unmoduleFs(sourceFs)));

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
