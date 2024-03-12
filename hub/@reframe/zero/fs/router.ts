import { Path, Readable, Watchable, Writeable } from "../defs.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./create.ts";

// todo: router should have exact type, eg: { "/@": () => FS<X> }
type RouterFS<C extends Readable | Writeable | Watchable> =
  & Readable
  & Writeable
  & Watchable
  & {
    mount: (path: Path, route: () => C) => RouterFS<C>;
  };

export const createRouterFs = <C extends Readable | Writeable | Watchable>(
  routes: Record<Path, () => C> = {},
): RouterFS<C> => {
  const mounts = {} as Record<Path, C>;

  const getMounts = (paths: Path[]) => {
    return paths.map((key) => {
      if (!mounts[key]) {
        mounts[key] = routes[key]();
      }

      return [key, mounts[key]] as const;
    });
  };

  const getAllMatchedRoutes = (path: Path) => {
    const keys = (Object.keys(routes) as Path[])
      .sort(
        (a, b) =>
          b.length === a.length ? b.localeCompare(a) : b.length - a.length,
      ).filter((key) =>
        path === key ||
        path.startsWith(key === "/" ? key : key + "/")
      );

    return getMounts(keys);
  };

  const getRoute = (path: Path) => {
    const matches = getAllMatchedRoutes(path);

    if (matches.length === 0) {
      return null;
    }

    return matches[0]!;
  };

  const base = createFs((ctx) =>
    ctx
      .read(async (path, headers) => {
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

        const response = await route.read(newPath, headers);
        return response.setHeaders((headers) => ({
          "x-fs-router": key +
            " -> " + (headers["x-fs-router"] ?? newPath),
          "x-fs-router-path": path,
        }));
      }).write(
        async (path, content, headers) => {
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

          const response = await route.write(newPath, content, headers);
          return response.setHeaders((headers) => ({
            "x-fs-router": key +
              " -> " + (headers["x-fs-router"] ?? newPath),
            "x-fs-router-path": path,
          }));
        },
      ).watch((path, handler) => {
        const matches = getMounts((
          Object.keys(routes) as Path[]
        ).filter((key) => key.startsWith(path)));

        const cleanups = matches.map(([key, route]) => {
          const newPath = cleanPath(path.slice(key.length));
          if (("watch" in route)) {
            return route.watch(newPath, (event) => {
              handler({
                ...event,
                path: `${key}${event.path}`,
              });
            });
          }
        });

        return () => {
          cleanups.forEach((cleanup) => cleanup?.());
        };
      })
  );

  return {
    ...base,
    mount: (path: Path, route: () => C) =>
      createRouterFs({
        ...routes,
        [path]: route,
      }),
  };
};
