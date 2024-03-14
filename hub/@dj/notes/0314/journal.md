## extensible runtime

```ts
// @reframe/zero/zero/create-runtime.ts

type Runtime<T = {}> = {
  import: (path: string) => {};
  importMany: (paths: string[]) => {};
  extend: <E>(
    createExtension: (factory: RuntimeFactory<T>) => E,
  ) => RuntimeFactory<T & E>;
} & T;

type RuntimeFactory<T> = () => Runtime<T>;

type RuntimePayload<T> = {
  importer: (factory: RuntimeFactory<T>) => (specifier: string) => {};
  extension: (factory: RuntimeFactory<T>) => T;
};

export const createRuntimeFactory = <T>(
  payload: RuntimePayload<T>,
): RuntimeFactory<T> => {
  const factory = (): Runtime<T> => {
    const runtime = {
      ...payload.extension(factory),
      import: (specifier) => payload.importer(factory)(specifier),
      importMany: (specifiers) => Promise.all(specifiers.map(runtime.import)),
      extend: (createExtension) => {
        return createRuntimeFactory({
          importer: payload.importer,
          extension: factory => {
            ...payload.extension(factory),
            ...createExtension(factory),
          },
        });
      },
    };
  };

  return factory;
};

const aFactory = createRuntimeFactory({
  importer: () => () => {
    throw new Error("not implemented");
  },
  extension: () => ({}),
});
const a = aFactory(); // { import, importMany, extend }

const bFactory = a.extend((factory) => ({
  b: "b",
}));
const b = bFactory(); // { import, importMany, extend, b: "b" }

const cFactory = b.extend((factory) => ({
  c: () => factory().b,
}));

const c = cFactory(); // { import, importMany, extend, b: "b", c: () => "b" }

const dFactory = c.extend((factory) => ({
  b: "b2",
}));

const d = dFactory(); // { import, importMany, extend, b: "b2", c: () => "b2" }
```

```ts
// @reframe/zero/runtime.ts

import * as Factory from "@reframe/zero/zero/create-runtime";

export const createRuntime = () => {
  const sourceFs = createRouterFs()
    .mount("/", ...)
    .mount("/@", ...);
  
  const runFs = createRunFs(sourceFs);


  return Factory.createRuntime({
    setFs: (create) => {
      const x = create({
        read: runFs.read,
        write: runFs.write,
        mount: sourceFs.mount,
      })
      const wrappedFs = createRunFs(x);

      return 
    }
  });
}
```

```ts
// @gates/six/runtime.ts
import Runtime from "@";

export const createRuntime = () => {
  return Runtime
    .setFs((fs) => {
      fs.mount("~/client", reactClientFs(fs));
    });
};
```
