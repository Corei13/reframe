import React, { Suspense } from "npm:react@canary";

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

export default function App({ request }: { request: Request }) {
  return (
    <Shell>
      <div>hello from {request.url}</div>
    </Shell>
  );
}
