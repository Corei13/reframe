import { Base } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const npmFs = <C extends Base>(cdn = "https://esm.sh") =>
  createFs<C>("npm")
    .read(async (ctx) => {
      const url = new URL(ctx.path, cdn);
      url.searchParams.set("target", "esnext");
      url.searchParams.set("external", "react,react-dom");

      const response = await fetch(url);

      if (!response.ok) {
        console.error("ERROR", await response.text());
        throw ctx.notFound(`module not found: ${ctx.path}`);
      }

      if (!response.body) {
        throw ctx.notFound(`module does not have any body: ${ctx.path}`);
      }

      return ctx.response(
        response.body,
        Object.fromEntries(response.headers.entries()),
      );
    }).write(
      (ctx) => {
        throw ctx.notImplemented();
      },
    );
