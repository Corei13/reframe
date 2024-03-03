import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.tsx";
import { Style } from "@reframe/react/module.tsx";

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
        <Style path={"/~tw/~@" + import.meta.path} />
        <div className="w-[200px] h-[200px] bg-primary-100 rounded-[10px]">
          tailwind
        </div>
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
