import React, { Suspense } from "npm:react@canary";
import { render } from "@reframe/react/server.tsx";
import { Style } from "@reframe/react/module.tsx";
import App from "react-client:./app.tsx";

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
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
};

export default async function serve(request: Request) {
  const url = new URL(request.url);

  if (url.pathname.endsWith(".ico")) {
    return new Response(null, { status: 404 });
  }

  return render(
    <Suspense>
      {/* <Style path={"/~tw/~@" + import.meta.path} /> */}
      <App path={url.pathname} />
    </Suspense>,
    Shell,
  );
}
