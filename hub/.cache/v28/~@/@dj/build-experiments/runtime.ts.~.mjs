export default async () => {
    import.meta.path = "/@dj/build-experiments/runtime.ts";
    ;
    let exports_yg8hndkvmmj = {};
    exports_yg8hndkvmmj[Symbol.toStringTag] = "Module";
    const reduceDotDot = (path) => {
        return path.reduce((slice, p) => {
            if (p === ".." && slice.length > 0 && slice[slice.length - 1] !== "..") {
                slice.pop();
            }
            else {
                slice.push(p);
            }
            return slice;
        }, []);
    };
    function splitPath(path) {
        return reduceDotDot(path
            .split(/[\/\\]+/g)
            .filter((p) => p !== "" && p !== "."));
    }
    exports_yg8hndkvmmj["splitPath"] = splitPath;
    function cleanPath(path) {
        return "/" + splitPath(path).join("/");
    }
    exports_yg8hndkvmmj["cleanPath"] = cleanPath;
    const splitSpecifier = (specifier) => {
        // TODO: (transpile:/path/to/loader):file
        const parts = specifier.split(":");
        const path = parts.pop();
        const segments = path.split("/").filter(Boolean);
        while (segments[0]?.startsWith("~")) {
            parts.push(segments.shift().slice(1));
        }
        return {
            loaders: parts,
            segments,
        };
    };
    exports_yg8hndkvmmj["splitSpecifier"] = splitSpecifier;
    const joinSpecifier = (loaders, segments) => {
        return (loaders.length === 0 ? "" : loaders.join(":") + ":") +
            segments.join("/");
    };
    exports_yg8hndkvmmj["joinSpecifier"] = joinSpecifier;
    const mergeSpecifiers = (a, b) => {
        const mergeLoaders = (a, b) => {
            if (b[0] === "/") {
                return reduceDotDot(b.slice(1));
            }
            return reduceDotDot([...a, ...b]);
        };
        const mergeSegments = (a, b) => {
            if (b[0] === "." || b[0] === "..") {
                a.pop(); // remove the file name
                for (const segment of b) {
                    if (segment === "..") {
                        if (a.length === 0) {
                            throw new Error(`Invalid specifier: ${b}`);
                        }
                        a.pop();
                    }
                    else if (segment !== ".") {
                        a.push(segment);
                    }
                }
                return a;
            }
            return b;
        };
        const A = splitSpecifier(a);
        const B = splitSpecifier(b);
        return joinSpecifier(mergeLoaders(A.loaders, B.loaders), mergeSegments(A.segments, B.segments));
    };
    exports_yg8hndkvmmj["mergeSpecifiers"] = mergeSpecifiers;
    const absolute = (specifier) => {
        if (specifier.startsWith(".") || specifier.startsWith("/")) {
            throw new Error(`Expected a normalized specifier: ${specifier}`);
        }
        const parts = splitSpecifier(specifier);
        return cleanPath("/" + parts.loaders.map((l) => "~" + l).join("/") + "/" +
            parts.segments.join("/"));
    };
    exports_yg8hndkvmmj["absolute"] = absolute;
    const resolvePath = (specifier, referrer) => {
        if (specifier === "@") {
            return "@";
        }
        // TODO: this is a hack, should be fixed with import maps
        if (specifier === "react" || specifier === "react-dom") {
            return resolvePath(specifier + "@canary", referrer);
        }
        const resolved = absolute(mergeSpecifiers(referrer, specifier));
        return resolved;
    };
    exports_yg8hndkvmmj["resolvePath"] = resolvePath;
    const createFromImport = (opts) => {
        const runtime = {
            fs: opts.fs,
            meta: {
                path: opts.entry,
            },
            resolve: (specifier, referrer) => {
                return resolvePath(specifier, referrer);
            },
            evaluate: async (content) => {
                const url = URL.createObjectURL(new Blob([await content.text()], { type: "text/javascript" }));
                const module = await import(url);
                URL.revokeObjectURL(url);
                return module;
            },
            import: opts.import,
            importMany: async (...specifiers) => {
                return Object.fromEntries(await Promise.all(specifiers.map(async (specifier) => [
                    specifier,
                    await runtime.import(specifier),
                ])));
            },
        };
        return runtime;
    };
    exports_yg8hndkvmmj["createFromImport"] = createFromImport;
    const createRuntime = ({ entry, fs, moduleCache, importSuffix = "", }) => {
        const runtime = createFromImport({
            fs,
            entry,
            import: (specifier) => {
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
            },
        });
        return runtime;
    };
    exports_yg8hndkvmmj["createRuntime"] = createRuntime;
    return exports_yg8hndkvmmj;
};
