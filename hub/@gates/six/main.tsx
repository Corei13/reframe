import Runtime from "@";
import { createModuleCache } from "@reframe/zero/module-cache.ts";

const server = Deno.serve(
  {
    onError: (error) => {
      if (error instanceof Error) {
        return new Response(error.stack, { status: 500 });
      }

      return new Response(JSON.stringify(error), { status: 500 });
    },
  },
  async (request) => {
    const cache = new Set<string>();
    const requestId = crypto.randomUUID();
    const requestRuntime = Runtime
      .extend((factory) => ({
        requestId,
        request,
        hydrate: {
          server: {
            getOnce: (specifier: string) => {
              console.log("getOnce17", specifier, requestRuntime.requestId);
              if (cache.has(specifier)) {
                return null;
              }

              return requestRuntime.hydrate.server.get(specifier);
            },
            get: (specifier: string) => {
              console.log("[get]", specifier, requestRuntime.requestId);
              cache.add(specifier);
              return requestRuntime.fs.read(specifier, {});
            },
            has: (specifier: string) => cache.has(specifier),
          },
        },
      }));

    console.log("requestRuntime START", requestRuntime.requestId);
    const { default: server } = await requestRuntime.import("/@/server.tsx");
    console.log(
      "requestRuntime STOP",
      requestRuntime.requestId,
    );

    return server(request);
  },
);

Runtime.dev.onReload(async () => {
  await server.shutdown();
});
