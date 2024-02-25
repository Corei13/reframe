import { type ReactElement } from "npm:react@canary";
import { renderToReadableStream } from "npm:react-dom@canary/server";

export const render = (element: ReactElement) =>
  new Response(
    new ReadableStream({
      type: "bytes",
      async start(controller) {
        try {
          const stream: ReadableStream = await renderToReadableStream(
            element,
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
