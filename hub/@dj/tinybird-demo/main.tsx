import Reframe from "@";
import { Readable } from "@reframe/zero/defs.ts";

export const hack = () => import("./script.ts");

const corsHeaders = {
  "access-control-allow-credentials": "true",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const serve = async (request: Request) => {
  // cors

  if (request.method === "OPTIONS") {
    // allow freaking everything

    return new Response(null, {
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const origin = url.origin;

  if (url.pathname !== "/") {
    return new Response(
      `
      <!doctype html>
      <html lang="en">
        <head>
          <script
            defer
            async
            src="${origin}"
            tb_user="dj"
          >
          </script>
        </head>
        <body>
          hello world
        </body>
      </html>    
    `,
      {
        headers: {
          "content-type": "text/html",
        },
      },
    );
  }

  if (request.method === "GET") {
    const response = await (Reframe.fs as Readable).read("/~@/@/script.ts", {});
    const code = await response.text();
    return new Response(
      code
        .replace(/^export default /, "window.__setup = ")
        .replace("import.meta.path", "window.__path") +
        "\nwindow.__setup();\n",
      {
        headers: {
          "content-type": "text/javascript",
          ...corsHeaders,
        },
      },
    );
  }

  const response = await fetch(
    `https://api.us-east.tinybird.co/v0/events?name=analytics_events`,
    {
      method: "POST",
      body: request.body,
      headers: {
        "Authorization": `Bearer ${Reframe.env.TINYBIRD_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    console.error(response.status, response.statusText);
    return response;
  }

  return new Response(response.body, {
    headers: {
      ...corsHeaders,
      "content-type": response.headers.get("content-type")!,
    },
  });
};

const server = Deno.serve({
  onError: (error) => {
    console.error(error);
    if (!(error instanceof Error)) {
      return new Response(JSON.stringify(error), {
        status: 500,
      });
    }

    return new Response(error.stack, {
      status: 500,
    });
  },
}, serve);

Reframe.dev?.onReload(async () => {
  await server.shutdown();
});
