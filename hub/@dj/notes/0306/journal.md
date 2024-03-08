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

// @org/name/run.ts [...entry] [...args]

import Runtime from "@";

const moduleCache = new Map<string, Promise<Module>>();
const runFs = Runtime.fs
  .mount("/~ai", createAIFs());

const runtime = Runtime
  .withFs(runFs)
  .withImport(createDynamicImporter(moduleCache))
  .withExtension({
    openai: createOpenAIExtension(),
  })
  .withArgs(args)
  .withEntry(entry);

await runtime.run();




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

await runtime
  .withArgs(args)
  .run("@org/name/run.ts")



// $ reframe-cli build @org/name [...entry]
// deno run @reframe/core/build.ts @org/name [...entry] [...args]

import Runtime from "@";
```
