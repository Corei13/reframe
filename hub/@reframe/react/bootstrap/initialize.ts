import { createRouterFs } from "@reframe/zero/fs/router.ts";
import { createDomFs } from "../fs/dom.ts";
import { createBaseRuntime } from "@reframe/zero/base-runtime.ts";
import { Path } from "@reframe/zero/defs.ts";
import { createModuleCache } from "@reframe/zero/module-cache.ts";
import { createDynamicImporter } from "@reframe/zero/zero/importer/dynamic.ts";

const appFs = createRouterFs()
  .mount("/", () => createDomFs());

const moduleCache = createModuleCache();

const runtime = createBaseRuntime({
  entry: {
    org: "todo",
    name: "todo",
    path: import.meta.path as Path,
  },
  args: [],
  moduleCache,
  fs: appFs,
})
  .setImporter(createDynamicImporter);

declare global {
  var __reframe: {
    rsc: {
      push: (_: [string, string]) => void;
      forEach: (_: (_: [string, string]) => void) => void;
    };
  };
}

export const hydrate = async () => {
  console.warn("[hydrate] bootstrap");
  self.__DEV__ = true;
  self.process = { env: { NODE_ENV: "development" } };

  const { createElement, use, lazy, Suspense } = await runtime.import(
    "@:npm:react@canary",
  );
  self.__webpack_require__ = (module: string) => {
    console.log("[__webpack_require__]", module);

    return new Proxy(runtime.import(`/~@/${module}`), {
      get(target, property) {
        console.log("[__wb__] read", property, "from", target);
        if (property === "then") {
          return undefined;
        }

        // return (props) =>
        //   target.then(
        //     ({ [property]: Component }) => createElement(Component, props),
        //   );
        const Component = (props) => {
          const Component = use(
            target.then(({ [property]: Component }) => Component),
          );
          return createElement(Component, props);
        };

        return (props) =>
          createElement(Suspense, {}, createElement(Component, props));
      },
    });
  };

  const { hydrateRoot } = await runtime.import("@:npm:react-dom@canary/client");
  const { createFromReadableStream } = await runtime.import(
    "@:npm:react-server-dom-webpack@canary/client.edge",
  );

  console.warn("[hydrate] create stream");

  const element = await createFromReadableStream(
    new ReadableStream({
      start: (controller) => {
        self
          .__reframe.rsc
          // todo
          // .filter(([id]) => id >= 1000)
          .forEach(([, chunk]) => controller.enqueue(chunk));

        // controller.close();

        self.__reframe.rsc = {
          push: ([id, chunk]) => {
            // if (id >= 1000) {
            controller.enqueue(chunk);
            // }
          },
          forEach: () => {
            throw new Error("not implemented");
          },
        };
      },
    })
      .pipeThrough(
        new TransformStream({
          transform: (chunk, controller) => {
            self.__reframe.rscCount ??= 0;
            self.__reframe.rscCount++;
            console.log("[hydrate] read", chunk.substr(0, 100));
            controller.enqueue(chunk);
          },
        }),
      )
      .pipeThrough(new TextEncoderStream()),
    {
      ssrManifest: {},
    },
  );

  console.warn("[hydrate] start");
  const root = document.getElementById("reframe-root")!;
  window.prev = root.innerHTML;

  await hydrateRoot(root, element, {
    onRecoverableError: (error) => {
      console.warn("Logged recoverable error: " + error.message);
    },
  });
};
