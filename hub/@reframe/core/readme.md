In this step, we pass @gates/two, which contains multiple typescript files that
can import from each other. The most significant change here is to introduce
runtime to ctx, which can import modules and evaluate them while maintaining
referential integrity.

### Runtime

Runtime has three primary function, `resolve`, `import` and `importMany`.

- `resolve` takes a path and returns the normalized path where app FS will give
  us its content
- `import` takes a path, fetches the content and evaluates it
- `importMany` takes multiple paths, calls `import` on each of them and returns
  the result as an object. Example:

```ts
const imports = await Runtime.importMany("react", "./math.ts");
const { useState } = imports["react"];
const { add, subtract } = imports["./math.ts"];
```
