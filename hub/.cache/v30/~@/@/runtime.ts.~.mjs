export default async (reframe_mgwalcc43f7) => {
    import.meta.path = "/@/runtime.ts";
    const imports_jcm1tcite4e = await reframe_mgwalcc43f7.importMany("@dj/build-experiments/runtime.ts", "https://deno.land/x/python/mod.ts");
    let exports_2je3zrryi51 = {};
    exports_2je3zrryi51[Symbol.toStringTag] = "Module";
    const { createFromImport: createFromImport } = imports_jcm1tcite4e["@dj/build-experiments/runtime.ts"];
    const { python: python } = imports_jcm1tcite4e["https://deno.land/x/python/mod.ts"];
    const dynamicImport = (name, source) => {
        const util = python.import("importlib.util");
        const sys = python.import("sys");
        const spec = util.spec_from_loader(name, null);
        const module = util.module_from_spec(spec);
        python.builtins.exec(source, module.__dict__);
        sys.modules[name] = module;
        return module;
    };
    const createRuntime = ({ entry, fs, moduleCache, importSuffix, }) => {
        const runtime = {
            ...createFromImport({
                fs,
                entry,
                import: (specifier) => {
                    if (!specifier.endsWith(".py")) {
                        if (specifier === "@") {
                            return Promise.resolve({ default: runtime, __esModule: true });
                        }
                        // todo: throw error on browser
                        if (specifier.startsWith("node:")) {
                            return import(specifier);
                        }
                        const path = runtime.resolve(specifier, entry);
                        if (moduleCache.has(path)) {
                            return moduleCache.get(path);
                        }
                        const runnablePromise = import(path + importSuffix);
                        const modulePromise = runnablePromise.then((moduleFn) => moduleFn.default(createRuntime({ fs, entry: path, moduleCache, importSuffix })));
                        moduleCache.set(path, modulePromise);
                        return modulePromise;
                    }
                    const path = runtime.resolve(specifier, entry);
                    console.log("[PYTHON] path", path, import.meta.dirname);
                    // reaad the file from the fs
                    const content = Deno.readTextFileSync(import.meta.dirname + "/../.." + path + importSuffix);
                    const module = dynamicImport(path, content);
                    return Promise.resolve({ default: module });
                },
            }),
            python: {
                runtime: python,
                toJS: (obj) => {
                    return JSON.parse(python.import("json").dumps(obj).toString());
                },
            },
        };
        return runtime;
    };
    exports_2je3zrryi51["createRuntime"] = createRuntime;
    return exports_2je3zrryi51;
};
