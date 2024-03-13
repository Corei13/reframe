import Runtime from "@";
import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.tsx";

import App from "./ui/app.tsx";

export default function serve(request: Request) {
  const url = new URL(request.url);

  return render(<App request={request} />);
}

// todo: make it Runtime.serve()
const server = Deno.serve({
  onError: (error) => {
    if (!(error instanceof Error)) {
      return new Response("unknown error", {
        status: 500,
      });
    }

    return new Response(error.stack, {
      status: 500,
    });
  },
}, serve);

Runtime.dev.onReload(async () => {
  await server.shutdown();
});
