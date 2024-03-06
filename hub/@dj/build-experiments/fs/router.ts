import { Readable, Writeable } from "../defs.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./create.ts";

type RouterFS<C extends Readable | Writeable> = Readable & Writeable & {
  mount: (path: `/${string}`, route: () => C) => RouterFS<C>;
};

export const createRouterFs = <C extends Readable | Writeable>(
  routes: Record<string, () => C> = {},
): RouterFS<C> => {
  const mounts = {} as Record<string, C>;

  const getRoute = (path: string) => {
    const key = Object.keys(routes).sort(
      (a, b) =>
        b.length === a.length ? b.localeCompare(a) : b.length - a.length,
    ).find((key) =>
      path === key ||
      path.startsWith(key === "/" ? key : key + "/")
    );

    if (!key) {
      return null;
    }

    if (!mounts[key]) {
      mounts[key] = routes[key]();
    }

    return [key, mounts[key]] as const;
  };

  const base = createFs((ctx) =>
    ctx
      .read(async (path) => {
        const match = getRoute(path);

        if (!match) {
          //   throw ctx.notFound(`route not found: ${path}`);
          throw new Error(`route not found: ${path}`);
        }

        const [key, route] = match;
        const newPath = cleanPath(path.slice(key.length));
        // ctx.log("->", key);
        console.log("[router] -> READ", key, newPath);

        if (!("read" in route)) {
          throw new Error(`route not readable: ${path}`);
        }

        const response = await route.read(newPath);
        return response.setHeaders((headers) => ({
          "x-fs-router": key +
            " -> " + (headers["x-fs-router"] ?? newPath),
          "x-fs-router-path": path,
        }));
      }).write(
        async (path, content) => {
          const match = getRoute(path);

          if (!match) {
            // throw ctx.notFound(`route not found: ${path}`);
            throw new Error(`route not found: ${path}`);
          }

          const [key, route] = match;
          const newPath = cleanPath(path.slice(key.length));
          //   ctx.log("->", key, newPath);
          console.log("[router] -> WRITE", key, newPath);

          if (!("write" in route)) {
            throw new Error(`route not writable: ${path}`);
          }

          const response = await route.write(newPath, content);
          return response.setHeaders((headers) => ({
            "x-fs-router": key +
              " -> " + (headers["x-fs-router"] ?? newPath),
            "x-fs-router-path": path,
          }));
        },
      )
  );

  return {
    ...base,
    mount: (path: `/${string}`, route: () => C) =>
      createRouterFs({
        ...routes,
        [path]: route,
      }),
  };
};
