- build-experiment
  - body.ts
  - defs.ts
  - local-fs-deno-local.ts

- .build
  - entry.ts
  - runtime.ts
  - deno.json
  - ~/
    - body.ts
    - defs.ts
    - local-fs-deno-local.ts
    - ~@/
      - body.ts
      - defs.ts
      - local-fs-deno-local.ts

```ts
// /build-experiment/local-fs-deno-local.ts
// entry.ts
import runtime from "./runtime.ts";
import entry from "@/~@/local-fs-deno-local.ts";
await entry(runtime);

// deno run .build/entry.ts
```
