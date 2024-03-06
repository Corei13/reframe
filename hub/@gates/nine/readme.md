This hook contains a single file with a server.

```md
- nine - single ts file
  - main.ts
  - build.ts
  - .build
    - runtime.ts
    - ~
      - main.ts
- ten - multiple files
  - main.ts
  - server.ts
  - .build.ts
  - .build
    - runtime.ts
    - ~
      - main.ts
      - server.ts
      - @
        - main.ts
        - server.ts
- eleven - npm
```

```ts
// build.ts
```

```ts
// runtime.ts
const createRuntime = () => {
  const runtime = {
    import: async (path: string) => {
      const url = new URL(path, import.meta.url);
      const module = await import(url.href);
      return module.default(runtime);
    },
  };

  return runtime;
};

export const runtime = createRuntime();

if (import.meta.main) {
  const entry = Deno.args[0];
  await runtime.import(entry);
}
```

```ts
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

```ts
import build0 from "@org/hook/build-0.ts";
const build1 = await build0.import("@org/hook/build-1.ts");
const build2 = await build1.import("@org/hook/build-2.ts");
const build3 = await build2.import("@org/hook/build-3.ts");
export default build3;
```
