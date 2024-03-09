import { Readable } from "../defs.ts";
import { createFs } from "./create.ts";
import { runnable } from "../ts/runnable.ts";

export const createRunnableFs = <C extends Readable>(base: C) =>
  createFs((ctx) =>
    ctx
      .read(async (path) => {
        const response = await base.read(path);

        const code = await response.text();

        const { transpiled, imports, dynamicImports, exports } = runnable(
          path,
          code,
        );

        const body = ctx.text(transpiled, {
          ...response.headers,
          "x-fs-runnable-imports": imports.filter((s) => s !== "@").join(","),
          "x-fs-runnable-dynamic-imports": dynamicImports.filter((s) =>
            s !== "@"
          ).join(","),
          "x-fs-runnable-exported-names": exports.names.join(","),
          "x-fs-runnable-exported-namespaces": exports.namespaces.join(","),
          "content-type": "application/javascript",
        });

        return body;
      })
  );
