```sh
$ cd hub
$ ./@reframe/core/main.ts dev serve @gates/one/@/main.ts
```

In this step, we create two new fs implementations,

- routerFs, which can route requests to different fs implementations
- unmoduleFs, which takes an fs with esm modules, and transforms them into js
  files that convert import/export statements into a function.

### unmoduleFs

Here's an example of how unmodule transformer transforms an esm module into a js
file.

```ts
// /path/to/module.ts
import Foo, { bar as baz, foo } from "./foo.ts";
import * as Bar from "./bar.ts";

export { Bar, baz, Foo, foo };

export const qux = 42;

export default function () {
  console.log("Hello, world!");
}
```

```js
export default async (Reframe) => {
  const imports = await Reframe.importMany(
    "./foo.ts",
    "./bar.ts",
  );
  let exports = {};

  const { default: Foo, foo, bar: baz } = imports["./foo.ts"];
  const Bar = imports["./bar.ts"];

  exports["Foo"] = Foo;
  exports["foo"] = foo;
  exports["baz"] = baz;
  exports["Bar"] = Bar;

  const qux = 42;
  exports["qux"] = qux;

  exports["default"] = function () {
    console.log("Hello, world!");
  };
};
```

There are a few more details in the actual implementation (like, instead of
`imports`, `exports` or `Reframe`, we use random variable names to avoid
conflicts), but this is the basic idea.

Why?

Because we want to be able to control loading and caching of modules, and hence
instead of using the native `import` and `export` statements, we use a function
that can be called to load and cache modules.
