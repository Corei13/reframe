```sh
$ cd hub
$ ./@reframe/core/main.ts dev serve @gates/four/~@/main.ts
```

In this step, we pass @gates/four, which is same as @gates/three, but to pass
this gate, we need to be able to cache read computations - like transpilation or
fetching from npm - so that we don't repeat any computation.

For this, we create two new fs, `cacheFs` and `memoryFs`.

- `cacheFs(storage, source)`
  - takes two fs, storage and source, and caches each read from source to
    storage.
- `memoryFs`
  - a simple in-memory fs to use as the storage for cacheFs, although note that
    any compatible fs can be used as storage since FSes are composable.
