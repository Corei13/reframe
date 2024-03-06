- move build inside the hook
- make client component work
- make tailwind work
- make dynamic import work in prod
- deploy

- debt
  - import.meta.main is not supported (@seemanta)

# Build inside the hook - take one

```js
// @org/name/fs.ts
export { fs };

// @org/name/runtime.ts

// @org/name/build.ts
import Runtime from "@";
import { build } from "@reframe/core/build.ts";

build({
  hook: `${Runtime.meta.org}/${Runtime.meta.name}`,
  entry: ["src/serve.ts", "src/pages/**.tsx"],
  fs: {
    source: Runtime.fs,
    target: createLocalFs(".build"),
  },
});






// $ reframe-cli run @org/name [...entry]
// deno run @reframe/core/run.ts @org/name [...entry] [...args]

import { createDynamicImporter, createFromImporter } from "@reframe/core/runtime.ts";

const moduleCache = new Map<string, Promise<Module>>();
const runFs = createRunnerFs(org, name); // todo
const runtime = createFromImporter({
  fs: runFs,
  entry,
  path: "/",
  import: createDynamicImporter(moduleCache),
  extension: {},
});

const { createRuntime: createHookRuntime } = await runtime.import(
  "/~@/@/runtime.ts",
);
const hookRuntime = createHookRuntime(runtime);

await hookRuntime.import(entry);



// $ reframe-cli build @org/name [...entry]
// deno run @reframe/core/build.ts @org/name [...entry] [...args]

import { run } from "./run.ts";

const fs = createRouterFs()
  .mount("/", () => createLocalFs("/"))
  .mount("/@", () => createLocalFs(`/${hook}`))
  .mount("/~@", () => createRunnableFs(routerFs))
  .mount("/~npm", () => createNpmFs())
  .mount("/~http", () => createHttpFs({ ssl: false }))
  .mount("/~https", () => createHttpFs({ ssl: true }));

await run({
  fs,
  hook: "@org/name",
  entry: "src/build.ts",
  args: ["-o", ".build"],
});
```
