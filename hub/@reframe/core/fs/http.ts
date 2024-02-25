import { Base } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const httpFs = <C extends Base>(https = true) =>
  createFs<C>("http")
    .read(async (ctx) => {
      const url = (https ? "https:/" : "http:/") + ctx.path;

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
