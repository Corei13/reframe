import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.ts";

import App from "./app.tsx";

const Shell = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
};

export default function serve(request: Request) {
  const url = new URL(request.url);
  const partial = url.pathname !== "/";
  const element = !partial
    ? (
      <Shell>
        <App path={url.pathname} />
      </Shell>
    )
    : (
      <div>
        <App path={url.pathname} />
      </div>
    );

  return render(element);
}

if (import.meta.main) {
  Deno.serve(
    { port: 8082 },
    serve,
  );
}
