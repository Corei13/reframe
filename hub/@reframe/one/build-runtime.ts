import { Module } from "@reframe/zero/defs.ts";
import * as R from "@reframe/zero/zero/runtime.ts";
import { evaluate } from "@reframe/zero/zero/evaluator/data-url.ts";
import { resolvePath } from "@reframe/zero/utils/path.ts";

import { createLocalImporter } from "@reframe/zero/zero/importer/local.ts";

export default function ({ entry }: { entry: string }) {
  const moduleCache = new Map<string, Promise<Module>>();

  const runtime = R.createRuntime({
    entry,
    fs: {},
    resolve: resolvePath,
    evaluate,
    importer: createLocalImporter(moduleCache),
    args: Deno.args,
    extension: {},
  });

  return runtime;
}
