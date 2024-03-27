import Runtime from "@";
import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.tsx";

import { App as Test } from "./test/app.tsx";
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

export default async function serve(request: Request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/~/")) {
    const body = await Runtime.fs.read(`/${url.pathname.slice(3)}`, {});
    return body.setHeader("content-type", "text/javascript").response();
  }

  const Inner = () => (
    <Suspense>
      <Test />
      <App path={url.pathname} />
    </Suspense>
  );

  if (url.pathname.endsWith(".ico")) {
    return new Response(null, { status: 404 });
  }

  return render(Inner, Shell);
}
