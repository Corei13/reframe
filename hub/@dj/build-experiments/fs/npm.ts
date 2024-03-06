import { createFs } from "./create.ts";

export const createNpmFs = (cdn = "https://esm.sh") =>
  createFs((ctx) =>
    ctx
      .read(async (path) => {
        const url = new URL(path, cdn);
        url.searchParams.set("target", "denonext");
        url.searchParams.set("external", "react,react-dom");

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
