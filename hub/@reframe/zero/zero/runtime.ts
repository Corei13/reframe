import type { Content, FS, Module, Path } from "../defs.ts";

export type Runnable<
  M extends Record<string, unknown> = Record<string, unknown>,
> = <
  R extends Runtime<{}, {}>,
>(
  runtime: R,
) => Promise<Module<M>>;

export type Resolver = (specifier: string, referrer: string) => string;

export type Runtime<F extends FS, E extends {}> = E & {
  fs: F;
  resolve: Resolver;
  evaluate: <M>(content: Content) => Promise<M>;
  meta: {
    entry: Path;
    path: Path;
    main: boolean;
    setPath: (path: string) => Runtime<F, E>;
    setEntry: (entry: string) => Runtime<F, E>;
  };
  run: <M extends Record<string, unknown>>() => Promise<Module<M>>;
  import: <M extends {}>(path: Path) => Promise<Module<M>>;
  importMany: <M extends {}>(
    ...paths: Path[]
  ) => Promise<Record<Path, Module<M>>>;
  args: string[];
  extend: <E2>(extension2: E2) => Runtime<F, E & E2>;
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
      setPath: (path: string) =>
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

      setEntry: (path: string) =>
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
    run: () => {
      console.log("running", runtime.meta.path);
      return runtime.meta
        .setEntry(runtime.meta.path)
        .import("/:" + runtime.meta.path);
    },
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
