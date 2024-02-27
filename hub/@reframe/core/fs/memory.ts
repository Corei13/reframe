import { Base } from "../ctx/ctx.ts";
import { createFs } from "./lib/create.ts";

export const memoryFs = <C extends Base>(contents: Record<string, string>) =>
  createFs<C>("memory")
    .read(async (ctx) => {
      const content = contents[ctx.path];

      if (!content) {
        throw ctx.notFound();
      }

      return ctx.text(content, {
        "x-import-path": ctx.path,
      });
    }).write(
      async (ctx) => {
        contents[ctx.path] = await ctx.getBody().text();

        return ctx.text(contents[ctx.path], {
          "x-import-path": ctx.path,
        });
      },
    );
