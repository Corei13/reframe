import Reframe from "@";
import React, { Suspense } from "npm:react@canary";
import { type ReactElement } from "npm:react@canary";
import { renderToReadableStream } from "npm:react-dom@canary/server";
import { Module } from "./module.tsx";

export const render = async (element: ReactElement) => {
  const bootstrap = await Reframe.hydrate.server.getOnce(
    "/~@/@reframe/react/bootstrap/runtime.ts",
  ).text();

  if (!bootstrap.startsWith("export default ")) {
    throw new Error("bootstrap must be a default export");
  }

  return new Response(
    new ReadableStream({
      type: "bytes",
      async start(controller) {
        try {
          const stream: ReadableStream = await renderToReadableStream(
            <>
              {element}
              <Suspense>
                <Module specifier="@:npm:react@canary" />
                <Module specifier="@:npm:react-dom@canary/client" />
                <Module specifier="@:@reframe/react/bootstrap/initialize.ts" />
                <script
                  type="module"
                  dangerouslySetInnerHTML={{
                    __html: [
                      bootstrap.replace("export default ", "const factory = "),
                      `window.result = factory();`,
                    ].join("\n\n"),
                  }}
                />
              </Suspense>
            </>,
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
            controller.enqueue(value);
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
