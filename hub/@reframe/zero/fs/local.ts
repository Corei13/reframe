import { getContentType } from "../utils/content-type.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./create.ts";
import { dirname } from "https://deno.land/std@0.188.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.188.0/fs/ensure_dir.ts";
import { Path } from "../defs.ts";

const createListener = (prefix: Path) => {
  const listener = {
    counter: 0,
    watcher: null as null | Deno.FsWatcher,
    listeners: new Map<
      string,
      { path: Path; handler: (event: { path: Path }) => void }
    >(),

    start: async () => {
      if (listener.watcher != null) {
        return;
      }

      const dir = Deno.cwd() + prefix;
      listener.watcher = Deno.watchFs(dir);

      for await (const event of listener.watcher) {
        for (const path of event.paths) {
          if (["modify", "create", "remove"].includes(event.kind)) {
            for (const value of listener.listeners.values()) {
              if (path.startsWith(value.path)) {
                value.handler({
                  path: path
                    .slice(dir.length) as Path,
                });
              }
            }
          }
        }
      }
    },

    watch: (path: Path, handler: (event: { path: Path }) => void) => {
      listener.start();

      listener.listeners.set(
        String(++listener.counter),
        { path, handler },
      );

      return () => {
        listener.listeners.delete(String(listener.counter));

        if (listener.listeners.size === 0) {
          listener.watcher?.close();
          listener.watcher = null;
        }
      };
    },
  };

  return listener;
};

export const createLocalFs = (prefix: Path) => {
  const listener = createListener(prefix);

  return createFs((ctx) =>
    ctx
      .read(async (_path) => {
        const path = Deno.cwd() + cleanPath(prefix + _path);
        const content = Deno.readTextFileSync(path);

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

        Deno.writeTextFileSync(path, content);

        return ctx.text(content, headers);
      }).watch(listener.watch)
  );
};

export const createLocalFsWithHeaders = (
  prefix: Path,
  _suffix: (path: string) => {
    content: string;
    headers: string;
  },
) => {
  const listener = createListener(prefix);

  return createFs((ctx) =>
    ctx
      .read(async (_path) => {
        const path = Deno.cwd() + cleanPath(prefix + _path);
        const suffix = _suffix(_path);
        const content = Deno.readTextFileSync(path + suffix.content);
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
        Deno.writeTextFileSync(path + suffix.content, content);
        Deno.writeTextFileSync(
          path + suffix.headers,
          JSON.stringify(headers, null, 2),
        );

        return ctx.text(content, headers);
      }).watch((_path, handler) => {
        const path = cleanPath(Deno.cwd() + prefix + _path);
        const suffix = _suffix(_path);

        return listener.watch(path, (event) => {
          if (event.path.endsWith(suffix.content)) {
            handler({
              ...event,
              path: event.path.slice(
                0,
                event.path.length - suffix.content.length,
              ) as Path,
            });
          }

          if (event.path.endsWith(suffix.headers)) {
            handler({
              ...event,
              path: event.path.slice(
                0,
                event.path.length - suffix.headers.length,
              ) as Path,
            });
          }
        });
      })
  );
};
