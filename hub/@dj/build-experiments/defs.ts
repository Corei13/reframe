import { Body } from "./body.ts";

export type Path = string;

export type Hash = string & { __type: "Hash" };

export type Content = Body;

export type Deployment = {
  id: string;
  env: Record<string, string>;
  assets: Record<Path, Content>;
  entry: string;
};

export type Build = {
  assets: Record<Path, Content>;
  entry: string;
};

export type Snapshot = {
  assets: Record<Path, Content>;
};

export type Hook = {
  snapshots: Record<Hash, Snapshot>;
  // immutable
  versions: Record<string, Hash>;
  // mutable
  alias: Record<string, Hash>;
  main: Hash;
};

export type Org = {
  hooks: Record<string, Hook>;
};

export type Hub = {
  orgs: Record<string, Org>;
};

export type Readable = {
  read: (path: Path) => Promise<Content>;
};

export type Writeable = {
  write: (
    path: Path,
    content: string,
    headers: Record<string, string>,
  ) => Promise<Content>;
};

export type Transformable = {
  transform: (
    path: Path,
    transform: (content: Content) => Content | Promise<Content>,
  ) => Promise<Content>;
};

export type Listable = {
  list: (path: Path) => Promise<Path[]>;
};

export type Watchable = {
  watch: (path: Path, callback: (path: Path) => void) => () => void;
};

export type BuildFactory = (hook: Hook, builder: Path) => Build;

export type FS<
  R extends Readable | unknown = unknown,
  W extends Writeable | unknown = unknown,
  T extends Transformable | unknown = unknown,
  L extends Listable | unknown = unknown,
  Wc extends Watchable | unknown = unknown,
> = {} & R & W & T & L & Wc;

export type Runtime<F extends FS, Ext extends {} = {}> = {
  fs: F;

  meta: {
    enter: (path: Path) => Runtime<F, Ext>;

    // the original entry module
    entry: Path;
    // which module I am in
    path: Path;
  };

  resolve: (specifier: string, referrer: string) => string;
  evaluate: <M>(content: Content) => Promise<M>;
  import: <M>(
    path: Path,
  ) => Promise<Module<M>>;
  importMany: <M>(...paths: Path[]) => Promise<Record<Path, M>>;

  extend: <E extends {}>(
    _: (runtime: Runtime<F, Ext>) => E,
  ) => Runtime<F, Ext & E>;
} & Ext;

export type Module<D = unknown, E extends Record<string, unknown> = {}> = {
  default: D;
  __esModule: true;
} & E;

export type Runnable<M = unknown> = <R extends Runtime<any, any>>(
  runtime: R,
) => Promise<Module<M>>;
