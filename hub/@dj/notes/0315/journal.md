- build the analytics dashboard
- deploy the analytics hook
- plan getting out of localhost
- implement hot module reloading
- how to solve the per-request runtime

# How do we get out of localhost?

## Database

Currently we are using local file system as our database. First action is to
move that do real databases, using @reframe.so/db, @reframe.so/kv and
@reframe.so/blob.

Later, remote is just switching to a remote database.

How would local / offline development still work with this?

We will have a separate process, say `@reframe.so/dev/watch.ts`, that will do
something like,

```ts
// watch changes in a local directory and sync with remote

const localFs = createLocalFs("/");
const remoteFs =
```

## Computation

## Editor

## Deployment

---

```ts
const cache = new Map<string, {
  runtime: Runtime | null;
  module: Module
}>();

const compute = (specifier, importer, runtime) => {
  if (specifier === "@") {
    return runtime;
  }

  if (
    cache.has(specifier) &&
    // check if runtime is same
    // ONLY if runtime gets used anywhere in the computation subtree of specifier
    runtime === cache.get(specifier).runtime
  ) {
    return cache.get(specifier);
  }

  const modulePromise = compute(specifier, importer, runtime);

  cache.set(specifier, {
    modulePromise,
    runtime: isBoundToRuntime(module) ? runtime : null
  });

  return module;
};

compute(C, B, 1) -> { C: Module<C> }
compute(C, B, 2) -> { C: Module<C> }
compute(F, B, 1) -> { F: Module<F1> }
compute(F, B, 2) -> { F: Module<F2> }
```
