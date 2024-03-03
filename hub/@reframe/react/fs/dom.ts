import type { Base } from "@reframe/core/ctx/ctx.ts";
import { createFs } from "@reframe/core/fs/lib/create.ts";

export const domFs = <C extends Base>() =>
  createFs<C>("dom")
    .read(async (ctx) => {
      const script = globalThis.document.querySelector(
        `script[type="reframe/module"][data-path="${ctx.path}"]`,
      );

      if (!script) {
        throw ctx.notFound();
      }

      const code = script.textContent;

      return ctx.text(
        code,
        Object.fromEntries(
          Array.from(script.attributes)
            .filter((attr) => attr.name.startsWith("data-header-"))
            .map((attr) => [attr.name, attr.value]),
        ),
      );
    })
    .write(async (ctx) => {
      const script = globalThis.document.querySelector(
        `script[data-path="${ctx.path}"]`,
      );

      if (script) {
        script.remove();
      }

      if (!ctx.body) {
        throw ctx.badRequest("missing body");
      }

      const newScript = globalThis.document.createElement("script");
      newScript.setAttribute("type", "text/module");
      newScript.setAttribute("data-path", ctx.path);
      newScript.textContent = await ctx.body.text();
      globalThis.document.head.appendChild(newScript);

      for (const [key, value] of ctx.request.headers.entries()) {
        newScript.setAttribute(`data-header-${key}`, value);
      }

      return ctx.text(newScript.textContent, ctx.body.headers);
    });
