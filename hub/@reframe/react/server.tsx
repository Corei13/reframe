import Reframe from "@";
import React, {
  ComponentType,
  PropsWithChildren,
  type ReactElement,
  Suspense,
  use,
} from "npm:react@canary";
import { renderToReadableStream } from "npm:react-dom@canary/server";
import type { Path } from "@reframe/zero/defs.ts";

async function Module2(
  { specifier, referrer, added, evaluate }: {
    specifier: string;
    referrer?: Path;
    added: Set<string>;
    evaluate?: boolean;
  },
) {
  const resolvedPath = Reframe.resolve(specifier, referrer ?? "/");

  if (added.has(resolvedPath)) {
    console.log("[Module2] already added", resolvedPath);

    return null;
  }

  added.add(resolvedPath);

  console.log("[Module2] newly added", resolvedPath);
  // append to file, create if not exists

  const response = await Reframe.fs.read(resolvedPath, {});

  if (!response) {
    throw new Error(`Module not found: ${resolvedPath}`);
  }

  const imports = response.header("x-fs-runnable-imports")?.split(",").filter(
    (s) => s.length > 0 && !s.startsWith("node:"),
  ) ??
    [];

  const element = (
    <>
      {imports.map((path) => (
        <Module2
          added={added}
          specifier={path}
          referrer={resolvedPath}
        />
      ))}
      <script
        data-path={resolvedPath}
        data-referrer={referrer}
        data-imports={imports.join(",")}
        dangerouslySetInnerHTML={{
          __html: `
            self.__reframe.modules.source.register(
              "${resolvedPath}",
              ${JSON.stringify(await response.text()).replace(/</g, "\\u003c")}
            );
          `,
        }}
      />
      {evaluate && (
        <script
          // type="module"
          data-evaluate={resolvedPath}
          dangerouslySetInnerHTML={{
            __html: `
              const load = async () => {
                // read from dom
                console.warn("[Module2] loading");
                const code = await self.__reframe.modules.source.get("${resolvedPath}");
                
                const url = URL.createObjectURL(
                  new Blob([code], { type: "application/javascript" }),
                );

                console.warn("[Module2] evaluated");
                const unmodule = await import(url);

                const module = await unmodule.default({});
                self["__module:${resolvedPath}"] = module;
              }
              load();
            `,
          }}
        />
      )}
    </>
  );

  return referrer
    ? element
    : <modules hidden specifier={resolvedPath}>{element}</modules>;
}

const Stream = async ({ id, reader, added }) => {
  const { done, value } = await reader.read();
  if (done) {
    return null;
  }

  const decoder = new TextDecoder();
  const content = decoder.decode(value);

  const module = /(^|\n)[a-zA-Z0-9]+:I\["([^"]+)",\[\],"([^"]+)"\]/.exec(
    content,
  );

  return (
    <>
      {module && <Module2 added={added} specifier={`@:${module[2]}`} />}
      <script
        data-length={Number(value.length).toString(16)}
        dangerouslySetInnerHTML={{
          __html: `
            self.__reframe.rsc.push([
              ${id},
              ${JSON.stringify(content).replace(/</g, "\\u003c")},
            ]);
          `,
        }}
      />
      <Suspense>
        <Stream added={added} id={id + 1} reader={reader} />
      </Suspense>
    </>
  );
};

export const render = async (
  Inner: ComponentType<{}>,
  Shell: ComponentType<PropsWithChildren<{}>>,
) => {
  globalThis.__webpack_require__ = (module: string) => {
    console.log("[__webpack_require__]", module);

    return new Proxy(Reframe.import(module), {
      get(target, property) {
        if (property === "then") {
          return undefined;
        }

        const Component = (props) => {
          const Component = use(
            target.then(({ [property]: Component }) => Component),
          );
          return <Component {...props} />;
        };

        return (props) => (
          <Suspense>
            <Component {...props} />
          </Suspense>
        );
      },
    });
  };

  const { renderToReadableStream: createRscStream } = await Reframe.import(
    "rsc:react-server-dom-webpack@canary/server.edge",
  );

  const { createFromReadableStream } = await Reframe.import(
    "npm:react-server-dom-webpack@canary/client.edge",
  );

  const element = <Inner />;

  const stream = await createRscStream(
    element,
    new Proxy({}, {
      get(target, property) {
        if (typeof property === "string" && property.includes("#")) {
          const [module, name] = property.split("#");
          console.log("[proxy]", name, module);
          return { name, id: module, chunks: [] };
        }

        return undefined;
      },
    }),
    {
      onError(error: Error) {
        console.error(error);
      },
    },
  );

  const [r1, r2] = stream.tee();

  const elem = await createFromReadableStream(r1, {
    ssrManifest: {},
  });

  const added = new Set<string>();
  return new Response(
    new ReadableStream({
      type: "bytes",
      async start(controller) {
        try {
          const stream: ReadableStream = await renderToReadableStream(
            <Shell>
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    const cache = new Map();
                    const resolvers = new Map();

                    self.__reframe = {
                      rsc: [],
                      modules: {
                        source: {
                          cache,
                          resolvers,
                          register: (path, source) => {
                            if (!resolvers.has(path)) {
                              cache.set(
                                path, 
                                Promise.resolve(source)
                              );
                            } else {
                              const resolve = resolvers.get(path);
                              resolve(source);
                            }
                          },
                          get: async (path) => {
                            if (!cache.has(path)) {
                              cache.set(path, new Promise((resolve) => {
                                resolvers.set(path, resolve);
                              }));
                            }

                            return cache.get(path);
                          }
                        }
                      },
                    }
                  `,
                }}
              />
              <div id="reframe-root">
                {elem}
              </div>
              <Suspense>
                <Module2 added={added} specifier="@:npm:react@canary" />
                <Module2
                  added={added}
                  specifier="@:npm:react-dom@canary/client"
                />
                <Module2
                  added={added}
                  specifier="@:npm:react-server-dom-webpack@canary/client.edge"
                />
                <Module2
                  added={added}
                  specifier="@:@reframe/react/bootstrap/initialize.ts"
                />
                <Module2
                  added={added}
                  specifier="@:@reframe/react/bootstrap/runtime.ts"
                  evaluate
                />
                <Stream
                  added={added}
                  id={0}
                  reader={r2
                    // .pipeThrough(new SplitRscPayloadTransformer())
                    .getReader()}
                />
              </Suspense>
            </Shell>,
            {
              onError(error: Error) {
                controller.enqueue(new TextEncoder().encode(`
            <script>
              console.error(${JSON.stringify(error.stack)});
            </script>
          `));
              },
            },
          );

          const reader = stream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            try {
              controller.enqueue(value);
            } catch (error) {
              console.log("[error]", error, new TextDecoder().decode(value));
              throw error;
            }
          }

          controller.close();
        } catch (error) {
          console.log("[error]", error);
          controller.error(error);
        }
      },
    }, { highWaterMark: 0 }),
    {
      headers: { "content-type": "text/html" },
    },
  );
};

class SplitRscPayloadTransformer
  extends TransformStream<Uint8Array, Uint8Array> {
  constructor() {
    let buffer: {
      remaining: number;
      array: Uint8Array;
    } | undefined;

    const decoder = new TextDecoder();

    super({
      transform(chunk, controller) {
        let index = 0;

        while (index < chunk.length) {
          let nextIndex = chunk.indexOf(
            "\n".charCodeAt(0),
            index,
          ) + 1;

          if (nextIndex === 0) {
            nextIndex = chunk.length;
          }

          if (buffer) {
            buffer.array.set(
              chunk.slice(index, nextIndex),
              buffer.array.length - buffer.remaining,
            );

            buffer.remaining -= nextIndex - index;

            if (buffer.remaining === 0) {
              controller.enqueue(buffer.array);
              buffer = undefined;
            }
          } else {
            // <id>:<type>
            // find the :
            const colonIndex = chunk.indexOf(
              ":".charCodeAt(0),
              index,
            );

            // check if chunk[colonIndex + 1] is T
            if (
              colonIndex !== -1 &&
              chunk[colonIndex + 1] === "T".charCodeAt(0)
            ) {
              // find the next comma
              const commaIndex = chunk.indexOf(
                ",".charCodeAt(0),
                colonIndex,
              );

              if (commaIndex === -1) {
                throw new Error(
                  "invalid chunk" + decoder.decode(chunk),
                );
              }

              const hexSize = decoder.decode(
                chunk.slice(colonIndex + 2, commaIndex),
              );

              const size = parseInt(hexSize, 16);

              controller.enqueue(
                chunk.slice(index, commaIndex + 1),
              );

              buffer = {
                remaining: size,
                array: new Uint8Array(size),
              };
            } else {
              // check for module here
              controller.enqueue(
                chunk.slice(
                  index,
                  nextIndex,
                ),
              );
            }
          }

          index = nextIndex;
        }
      },
    });
  }
}
