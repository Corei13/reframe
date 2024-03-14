import Runtime from "@";
import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.tsx";

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
    const body = await Runtime.fs.read(url.pathname.slice(2), {});
    return body.setHeader("content-type", "text/javascript").response();
  }

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
