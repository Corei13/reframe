export type Path = string & { __type: "Path" };

export type Hash = string & { __type: "Hash" };

export type Content<T = string> = {
  __type: "Content";
  content: T;
  hash: Hash;
  timestamp: number;
};

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

export type Readable<T> = {
  read: (path: Path) => Promise<Content<T>>;
};

export type Writeable<T> = {
  write: (path: Path, content: Content<T>) => Promise<Content<T>>;
};

export type Transformable<T> = {
  transform: (
    path: Path,
    transform: (content: Content<T>) => Content<T>,
  ) => Promise<Content<T>>;
};

export type Listable = {
  list: (path: Path) => Promise<Path[]>;
};

export type Watchable = {
  watch: (path: Path, callback: (path: Path) => void) => () => void;
};

export type BuildFactory = (hook: Hook, builder: Path) => Build;

export type Runtime = {
  fs:
    & Readable<string>
    & Writeable<string>
    & Transformable<string>
    & Listable
    & Watchable;

  meta: {
    filename: Path;
  };
  evaluate: (content: Content) => Promise<unknown>;
  import: <M>(path: Path) => Promise<M>;
};

export type Module<M> = (runtime: Runtime) => M;
