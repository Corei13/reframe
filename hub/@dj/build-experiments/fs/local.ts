import { getContentType } from "../utils/content-type.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./create.ts";
import { dirname } from "https://deno.land/std@0.188.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.188.0/fs/ensure_dir.ts";

export const createLocalFs = (prefix: `/${string}`) =>
  createFs((ctx) =>
    ctx
      .read(async (_path) => {
        const path = Deno.cwd() + cleanPath(prefix + _path);
        const content = await Deno.readTextFile(path);

        return ctx.text(content, {});
      })
      .write(async (_path, content, _headers) => {
        const path = Deno.cwd() + cleanPath(prefix + _path);

        await ensureDir(dirname(path));

        const headers = {
          ..._headers,
          "x-fs-local-cwd": Deno.cwd(),
          "x-fs-abs-path": path,
          "x-fs-local-stat-size": String(content.length),
          "content-type": getContentType(path),
        };

        await Deno.writeTextFile(path, content);

        return ctx.text(content, headers);
      })
  );

export const createLocalFsWithHeaders = (
  prefix: `/${string}`,
  _suffix: (path: string) => {
    content: string;
    headers: string;
  },
) =>
  createFs((ctx) =>
    ctx
      .read(async (_path) => {
        const path = Deno.cwd() + cleanPath(prefix + _path);
        const suffix = _suffix(_path);
        const content = await Deno.readTextFile(path + suffix.content);
        const headers = JSON.parse(
          await Deno.readTextFile(path + suffix.headers).catch(() => "{}"),
        );

        return ctx.text(content, headers);
      })
      .write(async (_path, content, _headers) => {
        const path = Deno.cwd() + cleanPath(prefix + _path);

        await ensureDir(dirname(path));

        const headers = {
          ..._headers,
          "x-fs-local-cwd": Deno.cwd(),
          "x-fs-abs-path": path,
          "x-fs-local-stat-size": String(content.length),
          "content-type": getContentType(path),
        };

        const suffix = _suffix(_path);
        await Deno.writeTextFile(path + suffix.content, content);
        await Deno.writeTextFile(
          path + suffix.headers,
          JSON.stringify(headers, null, 2),
        );

        return ctx.text(content, headers);
      })
  );
