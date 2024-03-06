import { getContentType } from "../utils/content-type.ts";
import { createFs } from "./create.ts";

export const createMemoryFs = (
  memory: Record<string, {
    content: string;
    headers: Record<string, string>;
  }>,
) =>
  createFs((ctx) =>
    ctx
      .read(async (path) => {
        const resource = memory[path];

        if (!resource) {
          // todo: implement notFound etc error handlers and ctx.log
          throw new Error(`not found: ${path}`);
        }

        return ctx.text(resource.content, resource.headers);
      })
      .write(async (path, content, headers) => {
        memory[path] = {
          content,
          headers: {
            "x-fs-local-cwd": Deno.cwd(),
            "x-fs-abs-path": path,
            "x-fs-local-stat-size": String(content.length),
            "content-type": getContentType(path),
            ...headers,
          },
        };

        return ctx.text(content, headers);
      })
  );
