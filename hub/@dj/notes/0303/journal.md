# CLI

I will create a new hook, `@reframe/cli`, and start with the following commands:

```sh
# builds a hook from reframe.json, creates one if it doesn't exist
$ reframe build @org/hook [--watch]

# runs a hook
$ reframe run @org/hook [path]

# deploys a hook to deno
$ reframe deploy @org/hook

# publishes a new version of a hook to the hub
$ reframe publish @org/hook

# runs a hook in development mode
$ reframe dev @org/hook
```

## build

Running `build` needs to give us a bunch of files that we can send to deno
deploy, and also run with `run`.

Building requires an `FS`. But the question is, how do we build the FS itself?

```ts
// a.ts

import b from "./b.ts";

export default b;

// b.ts

import c from "./c.ts";

export default c;

// c.ts

export default "c";

// ~@/a.ts
export default async (runtime) => {
  const b = await runtime.import("./b.ts");
  const exports = {};
  exports["default"] = b.default;
  return exports;
};

// entry.ts
import a from "./a.ts";
```
