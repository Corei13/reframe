## Obstacles are the way

First thing I want to do is improve running a hook.

For that, I want to set up the database and the graph. It will look something
like this,

```ts
const fs = graphFs(
  dbFs(),
  computeFs(fs),
);
```

dbFs is a map between `hash => data`. computeFs is the underlying fs that
computes data (mostly code for now), and graphFs is the orchestrator that makes
sure no computation is done twice.

During a run, we will query graphFs with a path, if the path has already been
computed and fresh, we will return the data from dbFs, if not, we will compute
it, store it in dbFs and return it.

### graphFs

```ts
const fs = graphFs(
  dbFs(),
  createRouterFs()
    .mount("/", sourceFs()),
    // how to track the dependencies?
    .mount("/~@", runnableFs(fs))
);

const graphFs = (db, compute) => {
  const graph = new Map(); // load from localfs initially

  return createFs((ctx) =>
    ctx
      .read(async (path, headers) => {
        const referrer = headers["x-fs-graphfs-referrer"];
        if (referrer) {
          graph[referrer].deps.push(path);
        }

        const node = graph.get(path);
        if (node.fresh) {
          return db.read(hash);
        }

        const deps = [];
        const data = await compute.factory(
          db,
          {
            track: (path) => deps.push(path),
            factory: compute.factory,
          },
        ).read(path, {
          "x-fs-grapfs-referrer": path,
        });

        graph.set(path, {
          hash: data.hash(),
          timestamp: Date.now(),
          deps: data.deps,
          fresh: true,
        });
      })
  );
};
```

### How to sync the graph with local storage

The graph is a map between `path => [hash, timestamp, deps: path[]]`. We can
have something like this,

```ts
const cleanup = localFs()
  .watch((event) => graphFs.write(event.path, event.content));
```

This will keep the graph in sync with the localFs. The outcome of this is that
we can take a look at the graph and see what is fresh and what is not.

### How to hot reload modules when graph changes

Right now we have a module cache inside runtime that contains a cache of all
computed modules. Whenever a module is updated, we need to invalidate that
module in the cache and all modules that depend on it.

```ts
const cleanup = graphFs.watch((event) => {
  if (event.type === "write") {
    runtime.reload(event.path);
  }
});

// runtime.reload will look something like this
const reload = (path: string) => {
  const module = moduleCache.get(path);
  if (module) {
    cache.delete(path);
    for (const dep of module.deps) {
      reload(dep);
    }
  }
};
```

When this is implemented, if we change a file and request the server, it will
have the updated modules.

### How to hot reload modules in the client when graph changes

We can use the same mechanism to hot reload modules in the client, the only
challenge is to make sure that the client is aware of the changes in the graph.
We can use a websocket to notify the client of changes in the graph.

We will have a runtime in the client that will be isomorphic with the server
runtime. It will have a cache of modules and a way to reload them.

Oh not only that, we also need to hot reload the react components in the
client - which is a different problem.

```ts
// server
const cleanup = graphFs.watch((event) => {
  if (event.type === "write") {
    runtime.reload(event.path);
    ws.send(event);
  }
});

// client
const cleanup = domFs.watch((event) => {
  if (event.type === "write") {
    runtime.reload(event.path);
  }
});
```

### How to hot reload react components in the client

For v1, we will simply re-mount each client component if the module of the
client component changes. This is not half-ideal, because it will have
unnecessary re-renders, when only small part of the component changes.

```ts
const render = (
  root: HTMLElement,
  path: string,
  Component: React.ComponentType,
) => {
  const reload = () => {
    const NewComponent = await runtime.import(path);
    ReactDOM.render(<NewComponent />, root);
  };
  runtime.watch(path, reload);
  reload();
};
```

### How to hot reload only the changed components in the client

This is a bit more complicated. I think we should simply copy how react-refresh
does this, and then try to refactor it within our framework to understand it
better.

Here's how Dan suggests - https://github.com/facebook/react/issues/16604

There are two parts to this, first, understand what code transformations they
are doing inside react-refresh/babel. Second, understand what's going on inside
react-refresh/runtime.

For the former, we can simply run some code through react-refresh/babel and see
what transformations are happening, and then reverse engineer it with our
transformer.

For the latter, we can simply start using it and then refactor it into our
codebase
