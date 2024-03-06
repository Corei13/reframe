import {
  createDynamicImporter,
  createFromImporter,
} from "@dj/build-experiments/runtime.ts";
import { python } from "https://deno.land/x/python/mod.ts";
import type { Module, Runnable } from "@dj/build-experiments/defs.ts";

const dynamicImport = (name: string, source: string) => {
  const util = python.import("importlib.util");
  const sys = python.import("sys");

  const spec = util.spec_from_loader(name, null);
  const module = util.module_from_spec(spec);
  python.builtins.exec(source, module.__dict__);
  sys.modules[name] = module;
  return module;
};

export const createRuntime = ({
  entry,
  fs,
  moduleCache,
  importSuffix = "",
}: {
  entry: string;
  fs: {};
  moduleCache: Map<string, Promise<Module>>;
  importSuffix?: string;
}) => {
  const runtime = {
    ...createFromImporter({
      fs,
      entry,
      path: "/",
      import: (specifier, runtime) => {
        if (!specifier.endsWith(".py")) {
          //   if (specifier === "@") {
          //     return Promise.resolve({ default: runtime, __esModule: true });
          //   }

          //   // todo: throw error on browser
          //   if (specifier.startsWith("node:")) {
          //     return import(specifier);
          //   }

          //   const path = runtime.resolve(specifier, entry);
          //   if (moduleCache.has(path)) {
          //     return moduleCache.get(path)!;
          //   }

          //   const runnablePromise = import(path + importSuffix) as Promise<
          //     Module<Runnable>
          //   >;
          //   const modulePromise = runnablePromise.then((moduleFn) =>
          //     moduleFn.default(runtime.meta.enter(path))
          //   );

          //   moduleCache.set(path, modulePromise);

          //   return modulePromise;
          return createDynamicImporter(moduleCache)(specifier, runtime);
        }

        const path = runtime.resolve(specifier, entry);
        console.log("[PYTHON] path", path, import.meta, Deno.cwd());
        // reaad the file from the fs
        return runtime.fs.read(path).then(async (response) => {
          const content = await response.text();
          console.log("[PYTHON] content", content);
          return { default: dynamicImport(path, content) };
        });
      },
    }),
    python: {
      runtime: python,
      toJS: (obj: unknown) => {
        return JSON.parse(python.import("json").dumps(obj).toString());
      },
    },
  };

  return runtime;
};
