import { Base, FS } from "./ctx/ctx.ts";
import { createBaseCtx } from "./ctx/base.ts";
import { localFs } from "./fs/local.ts";
import { moduleServerFs } from "./fs/module-server.ts";
import { npmFs } from "./fs/npm.ts";
import { routerFs } from "./fs/router.ts";
import { unmoduleFs } from "./fs/unmodule.ts";
import { cacheFs } from "./fs/cache.ts";
import { httpFs } from "./fs/http.ts";
import { reactClientFs } from "./fs/react/client.ts";
import { tailwindFs } from "./fs/react/tailwind.ts";
import { resolvePath } from "./utils/path.ts";

export default async function build(
  org: string,
  name: string,
  _version: string,
  entry: string,
) {
  const hubFs = localFs(`/`);
  const codeFs = localFs(`/@${org}/${name}`);

  const sourceFs: FS<Base> = cacheFs(
    routerFs()
      // all hooks
      .mount("/", () => hubFs)
      // our app
      .mount("/@", () => codeFs)
      .mount("/~@", () => unmoduleFs(sourceFs))
      .mount("/~npm", () => npmFs())
      .mount("/~http", () => httpFs(false))
      .mount("/~https", () => httpFs())
      .mount("/~react-client", () => reactClientFs(sourceFs))
      .mount("/~tw", () => tailwindFs(sourceFs)),
    localFs(`/.build/${org}/${name}/${_version}`),
    // memoryFs({}),
  );

  const server = sourceFs.use(createBaseCtx);

  const queue = [entry];
  while (queue.length > 0) {
    const path = queue.pop()!;
    const body = await server.read(path);
    const imports = body.header("x-fs-unmodule-imports")
      ?.split(",").filter((s) => s.length > 0) ?? [];
    queue.push(...imports.map((i) => resolvePath(i, path)));
  }
}
