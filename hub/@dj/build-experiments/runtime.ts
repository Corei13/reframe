import type { FS, Module, Readable, Runnable, Runtime } from "./defs.ts";

const reduceDotDot = (path: string[]): string[] => {
  return path.reduce((slice, p) => {
    if (p === ".." && slice.length > 0 && slice[slice.length - 1] !== "..") {
      slice.pop();
    } else {
      slice.push(p);
    }
    return slice;
  }, [] as Array<string>);
};

export function splitPath(path: string): string[] {
  return reduceDotDot(
    path
      .split(/[\/\\]+/g)
      .filter((p) => p !== "" && p !== "."),
  );
}

export function cleanPath(path: string): string {
  return "/" + splitPath(path).join("/");
}

export const splitSpecifier = (specifier: string): {
  loaders: string[];
  segments: string[];
} => {
  // TODO: (transpile:/path/to/loader):file
  const parts = specifier.split(":");
  const path = parts.pop()!;
  const segments = path.split("/").filter(Boolean);
  while (segments[0]?.startsWith("~")) {
    parts.push(segments.shift()!.slice(1));
  }
  return {
    loaders: parts,
    segments,
  };
};

export const joinSpecifier = (
  loaders: string[],
  segments: string[],
): string => {
  return (loaders.length === 0 ? "" : loaders.join(":") + ":") +
    segments.join("/");
};

export const mergeSpecifiers = (a: string, b: string) => {
  const mergeLoaders = (a: string[], b: string[]): string[] => {
    if (b[0] === "/") {
      return reduceDotDot(b.slice(1));
    }

    return reduceDotDot([...a, ...b]);
  };

  const mergeSegments = (a: string[], b: string[]): string[] => {
    if (b[0] === "." || b[0] === "..") {
      a.pop(); // remove the file name

      for (const segment of b) {
        if (segment === "..") {
          if (a.length === 0) {
            throw new Error(`Invalid specifier: ${b}`);
          }

          a.pop();
        } else if (segment !== ".") {
          a.push(segment);
        }
      }

      return a;
    }

    return b;
  };

  const A = splitSpecifier(a);
  const B = splitSpecifier(b);

  return joinSpecifier(
    mergeLoaders(A.loaders, B.loaders),
    mergeSegments(A.segments, B.segments),
  );
};

export const absolute = (specifier: string): string => {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    throw new Error(`Expected a normalized specifier: ${specifier}`);
  }

  const parts = splitSpecifier(specifier);
  return cleanPath(
    "/" + parts.loaders.map((l) => "~" + l).join("/") + "/" +
      parts.segments.join("/"),
  );
};

export const resolvePath = (specifier: string, referrer: string): string => {
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

export const createLocalImporter = <F extends FS>(
  moduleCache: Map<string, Promise<Module>>,
  importSuffix = "",
) => {
  return (specifier: string, runtime: Runtime<F>) => {
    if (specifier === "@") {
      return Promise.resolve({ default: runtime, __esModule: true });
    }

    // todo: throw error on browser
    if (specifier.startsWith("node:")) {
      return import(specifier);
    }

    const path = runtime.resolve(specifier, runtime.meta.path);
    if (moduleCache.has(path)) {
      return moduleCache.get(path)!;
    }

    const runnablePromise = import(path + importSuffix);
    const modulePromise = runnablePromise.then((moduleFn) =>
      moduleFn.default(runtime.meta.enter(path))
    );

    moduleCache.set(path, modulePromise);

    return modulePromise;
  };
};

export const createDynamicImporter = <F extends Readable>(
  moduleCache: Map<string, Promise<Module>>,
) => {
  return ((
    specifier: string,
    runtime: Runtime<F>,
  ) => {
    if (specifier === "@") {
      return Promise.resolve({ default: runtime, __esModule: true });
    }

    // todo: throw error on browser
    if (specifier.startsWith("node:")) {
      return import(specifier);
    }

    const path = runtime.resolve(specifier, runtime.meta.path);

    if (moduleCache.has(path)) {
      return moduleCache.get(path)!;
    }

    const sourcePromise = runtime.fs.read(path);
    const runnablePromise = sourcePromise.then((source) =>
      runtime.evaluate<Module<Runnable>>(source)
    );

    const modulePromise = runnablePromise.then((moduleFn) =>
      moduleFn.default(runtime.meta.enter(path))
    );

    moduleCache.set(path, modulePromise);

    return modulePromise;
  });
};

export const createFromImporter = <F extends FS, E extends {}>(opts: {
  fs: F;
  entry: string;
  path: string;
  import: <M>(path: string, runtime: Runtime<F>) => Promise<{
    default: M;
    __esModule: true;
  }>;
  extension: E;
}) => {
  const runtime: Runtime<F, E> = {
    ...opts.extension,

    fs: opts.fs,

    meta: {
      entry: opts.entry,
      path: opts.path,
      enter: (path) => createFromImporter({ ...opts, path }),
    },

    resolve: (specifier, referrer) => {
      return resolvePath(specifier, referrer);
    },

    evaluate: async (content) => {
      const url = URL.createObjectURL(
        new Blob([await content.text()], { type: "text/javascript" }),
      );

      const module = await import(url);
      URL.revokeObjectURL(url);

      return module;
    },

    import: (specifier) => opts.import(specifier, runtime),

    importMany: async (...specifiers) => {
      return Object.fromEntries(
        await Promise.all(
          specifiers.map(async (specifier) => [
            specifier,
            await runtime.import(specifier),
          ]),
        ),
      );
    },

    extend: (extension) =>
      createFromImporter({
        ...opts,
        extension: { ...runtime, ...extension(runtime) },
      }),
  };

  return runtime;
};

export const createRuntime = <F extends FS>({
  entry,
  fs,
  moduleCache,
  importSuffix = "",
}: {
  entry: string;
  fs: F;
  moduleCache: Map<string, Promise<Module>>;
  importSuffix?: string;
}): Runtime<F> =>
  createFromImporter({
    fs,
    entry,
    path: entry,
    import: createLocalImporter(moduleCache, importSuffix),
    extension: {},
  });
