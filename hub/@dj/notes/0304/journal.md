## Build

What should happen if I run `reframe run @org/hook`?

It should do something like `deno run .build/@org/hook/main.ts`.

What should happen if I run `reframe build @org/hook path/to/entry.ts`?

The apparent answer here is to run something like
`deno run @org/hook/build.ts path/to/entry.ts`. Where `build.ts` can look
something like this:

```ts
// @org/hook/build.ts
export default async () => ({
  default: (snapshot: Snapshot, entry: string): Build => ({
    assets: Snapshot["assets"],
    entry,
  }),
});
```

And finally, we run it like this:

```ts
// @reframe/cli/build.ts

const build = (org: string, hook: string, entry: string) => {
  const { default: buildSnapshot } = await import(
    `@${org}/${name}/build.ts`
  );
  const hook = await getHook(org, hook);
  const snapshot = await hook.snapshots[hook.main];
  const build = await buildSnapshot(snapshot, entry);

  // write to fileSystem in .build/@org/hook
  for (const [path, content] of Object.entries(build.assets)) {
    await fs.write(`.build/@${org}/${hook}/${path}`, content);
  }
};

if (import.meta.main) {
  const [org, hook, entry] = parseArgs(Deno.args);
  await build(org, hook, entry);
}
```

This is a good start. The challenge is doing `import(@org/hook/build.ts)` when
`build.ts` might use newer capabilites that are not supported by deno itself,
hence it would need another (or more) layer(s) of macros before we move it to
deno.

It's a great time to set up some constraints for build-0 environment,

- we can run typescript directly
- we assume all code are remote, and we can't import anything from the local
  file system
- that means, there can not be any import or export statement in the code itself

There comes multi-step build process. Say we have 4 steps, build-0, build-1,
build-2, and build-3, where build-0 can be immediately imported, build-1
requires build-0, build-2 requires build-1, and build-3 requires build-2. We can
do something like this, if we were to write build.ts,

```ts
// build.ts

export default (runtime: Runtime) => {
  // import build-0
  const build0 = await runtime.import("@org/hook/build-0.ts");
  // we can not directly import build1, instead build0 gives us a runtime that can import build1
  const build1 = await build0.import("@org/hook/build-1.ts");
  const build2 = await build1.import("@org/hook/build-2.ts");
  const build3 = await build2.import("@org/hook/build-3.ts");
  return { default: build3 };
};
```

And now the cli,

```ts
// @reframe/cli/build.ts

const createRuntime = (with = {}) => {
  const runtime = {
    fs,

    with: (with = {}) => {
      return createRuntime(with);
    },

    evaluate: async (content: string) => {
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/typescript" }),
      );

      const module = await import(url);
      URL.revokeObjectURL(url);
      return module.default(runtime);
    },

    import: async (path: string) => {
      return await runtime
        .with({ filename: path })
        .evaluate(await fs.read(path));
    },
  };

  return runtime;
};

const build = (org: string, hook: string, entry: string) => {
  const runtime = createRuntime();

  const buildRuntime = await runtime.import(`@${org}/${name}/build.ts`);
  await buildRuntime.read(entry); // this should build everything else

  for (const path of await buildRuntime.fs.list()) {
    runtime.fs.write(".build/" + path, await buildRuntime.fs.read(path));
  }
};

if (import.meta.main) {
  const [org, hook, entry] = parseArgs(Deno.args);
  await build(org, hook, entry);
}
```

Wait, could this be that simple? How do we implement support for new features?
Like for example, say we want to support `import foo from "foo"` in
`build-0.ts`, so `build-1.ts` can have import statement in itself, eg:

```ts
// @org/hook/build-1.ts

import runtime from "@";
import npm from "./npm.ts";

export default {
  import: async (path: string) => {
    if (path.startsWith("npm:")) {
      return runtime.evaluate(await npm.read(path));
    }
    return await runtime.import(path);
  },
};
```

And `build-0.ts` can look like this,

```ts
// @org/hook/build-0.ts
export default (runtime: Runtime) => {
  const fs = {
    read: async (path: string) => {
      return transpile(await runtime.fs.read(path));
    },
    write: async (path: string, content: Content<string>) => {
      // ..
    },
    list: async () => {
      // ..
    },
  };
  return runtime.with({ fs });
};
```

This kinda makes sense. The challenge right now is to start. We can start with
transpile, but the problem is, it requires us to use npm modules. We can
probably get around by manually dropping `ts-morph/bootstrap` into a folder,
which should work. But, that makes me think - if we can do that, why not just -
import from npm, right? Only for the build-0, we can start with that, that will
eventually build other - or even itself, yes, that is the key. Can build-x build
itself, that we can then use to build build-(x+1).

To think out loud

- build/0.ts
  - can import from npm: through deno
  - can build itself - meaning, after it builds itself, it doesn't need to
    import from npm: anymore, this means, it needs to be able to implement both
    @: and npm: loaders. This is still not super clear.

Birds eye view again.
