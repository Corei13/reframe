import { createFs } from "./create.ts";

export const createNpmFs = ({
  cdn = "https://esm.sh",
  ...params
}: {
  cdn?: string;
  target?: string;
  external?: string;
  conditions?: string;
}) =>
  createFs((ctx) =>
    ctx
      .read(async (path) => {
        const url = new URL(path, cdn);

        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }

        const response = await fetch(url);

        if (!response.ok) {
          console.error("ERROR", await response.text());
          //   throw ctx.notFound(`module not found: ${path}`);
          throw new Error(`module not found: ${path}`);
        }

        if (!response.body) {
          //   throw ctx.notFound(`module does not have any body: ${path}`);
          throw new Error(`module does not have any body: ${path}`);
        }

        return ctx.response(
          response.body,
          Object.fromEntries(response.headers.entries()),
        );
      })
  );
