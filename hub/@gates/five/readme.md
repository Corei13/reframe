```sh
$ cd hub
$ ./@reframe/core/main.ts dev serve @gates/five/~@/@/main.ts
```

In this step, we pass `@gates/five`, which allows us to import other hooks, in
this case, from `@gates/three`, `@gates/four` and even `@reframe/core` itself.

Additionally, we will also support the ability to import from own hook by
absolute path, instead of only relative path.

This is a big step, as it allows hooks to compose on each other, and also allows
us to start building a library of hooks that we can import from.

```ts
// this will import from another hook
import hook from "@org/hook/path/to/module.ts";

// this will import from own hook
import hook from "@/path/to/module.ts";
```
