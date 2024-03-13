import Reframe from "@";
import React, { Suspense } from "npm:react@canary";
import { createClient } from "npm:@tursodatabase/api";

const turso = createClient({
  org: Reframe.env.TURSO_API_ORG,
  token: Reframe.env.TURSO_API_TOKEN,
});

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

const ListDatabase = async () => {
  const databases = await turso.databases.list();
  console.log(databases);

  return (
    <pre>
      {
        JSON.stringify(databases, null, 2)
      }
    </pre>
  );
};

export default function App({ request }: { request: Request }) {
  return (
    <Shell>
      <div>hello from {request.url}</div>
      <ListDatabase />
    </Shell>
  );
}
