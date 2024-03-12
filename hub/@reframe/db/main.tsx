import Runtime from "@";
import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.tsx";

import App from "./ui/app.tsx";

export default function serve(request: Request) {
  const url = new URL(request.url);

  return render(<App request={request} />);
}

// todo: make it Runtime.serve()
const server = Deno.serve(serve);
Runtime.dev.onReload(async () => {
  await server.shutdown();
});
