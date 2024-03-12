import type { Content, FS, Module, Path } from "../defs.ts";

export type Runnable<
  M extends Record<string, unknown> = Record<string, unknown>,
> = <
  R extends Runtime<{}, {}>,
>(
  runtime: R,
) => Promise<Module<M>>;

export type Resolver = (specifier: string, referrer: Path) => Path;

export type Runtime<F extends FS = {}, E extends {} = {}> = E & {
  fs: F;
  resolve: Resolver;
  evaluate: <M>(content: Content) => Promise<M>;
  meta: {
    entry: Path;
    path: Path;
    main: boolean;
    setPath: (path: Path) => Runtime<F, E>;
    setEntry: (entry: Path) => Runtime<F, E>;
  };
  run: <M extends Record<string, unknown>>(path?: Path) => Promise<Module<M>>;
  import: <M extends {}>(path: Path) => Promise<Module<M>>;
  importMany: <M extends {}>(
    ...paths: Path[]
  ) => Promise<Record<Path, Module<M>>>;
  args: string[];
  extend: <E2>(extension2: E2) => Runtime<F, E & E2>;
  setFs: <F2 extends F>(fs: F2) => Runtime<F2, E>;
  setArgs: (args: string[]) => Runtime<F, E>;
};

export const createRuntime = <F extends FS, E extends {}>({
  entry,
  org,
  name,
  path = entry,
  fs,
  importer,
  resolve,
  evaluate,
  args,
  extension,
}: {
  entry: Path;
  org: string;
  name: string;
  path?: Path;
  fs: F;
  resolve: Resolver;
  evaluate: <M>(content: Content) => Promise<M>;
  importer: (
    runtime: Runtime<F, E>,
  ) => <M extends Record<string, unknown>>(
    specifier: string,
  ) => Promise<Module<M>>;
  args: string[];
  extension: E;
}) => {
  const runtime: Runtime<F, E> = {
    ...extension,
    fs,
    resolve,
    evaluate,
    args,
    meta: {
      entry,
      org,
      name,
      path,

      main: true,
      setPath: (newPath: Path) =>
        createRuntime({
          entry,
          org,
          name,
          path: newPath,
          fs,
          resolve,
          evaluate,
          importer,
          args,
          extension,
        }),

      setEntry: (path: Path) =>
        createRuntime({
          entry: path,
          org,
          name,
          fs,
          resolve,
          evaluate,
          importer,
          args,
          extension,
        }),
    },
    run: (_path?: Path) => {
      const path = _path ?? runtime.meta.path;
      console.log("running", path);
      return runtime.import(`/:${path}`);
    },
    setFs: <F2 extends F>(fs2: F2) =>
      createRuntime<F2, E>({
        entry,
        org,
        name,
        path,
        fs: fs2,
        resolve,
        evaluate,
        importer,
        args,
        extension,
      }),
    setArgs: (args: string[]) =>
      createRuntime({
        entry,
        org,
        name,
        path,
        fs,
        resolve,
        evaluate,
        importer,
        args,
        extension,
      }),
    extend: <E2>(extension2: E2) => {
      return createRuntime({
        entry,
        org,
        name,
        path,
        fs,
        resolve,
        evaluate,
        importer,
        args,
        extension: { ...extension, ...extension2 },
      });
    },
    import: (specifier) => importer(runtime)(specifier),
    importMany: async (...paths: Path[]) => {
      return Object.fromEntries(
        await Promise.all(
          paths.map(async (path) => [
            path,
            await runtime.import(path),
          ]),
        ),
      );
    },
  };

  return runtime;
};

// declare a RuntimeExtension interface that can be extensible from importing modules

export default new Proxy({}, {
  get: (_target, prop) => {
    throw new Error(`Runtime.${String(prop)} is not available in this context`);
  },
}) as Runtime;
