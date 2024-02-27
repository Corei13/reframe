import { Base, FS } from "../ctx/ctx.ts";
import { cleanPath } from "../utils/path.ts";
import { createFs } from "./lib/create.ts";

type RouterFS<C extends Base> = FS<C> & {
  mount: (path: `/${string}`, route: () => FS<C>) => RouterFS<C>;
};

export const routerFs = <C extends Base>(
  routes: Record<string, () => FS<C>> = {},
): RouterFS<C> => {
  const mounts = {} as Record<string, FS<C>>;

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

  const base = createFs<C>("router")
    .read((ctx) => {
      const match = getRoute(ctx.path);

      if (!match) {
        throw ctx.notFound(`route not found: ${ctx.path}`);
      }

      const [key, route] = match;
      const newPath = cleanPath(ctx.path.slice(key.length));
      ctx.log("->", key);

      return ctx
        .cd(newPath)
        .forward(route)
        .setHeaders((headers) => ({
          "x-fs-router": key + " -> " + (headers["x-fs-router"] ?? newPath),
          "x-fs-router-path": ctx.path,
        }));
    }).write(
      (ctx) => {
        const match = getRoute(ctx.path);

        if (!match) {
          throw ctx.notFound(`route not found: ${ctx.path}`);
        }

        const [key, route] = match;
        const newPath = cleanPath(ctx.path.slice(key.length));
        ctx.log("->", key, newPath);

        return ctx
          .cd(newPath)
          .forward(route)
          .setHeaders((headers) => ({
            "x-fs-router": key +
              " -> " + (headers["x-fs-router"] ?? newPath),
            "x-fs-router-path": ctx.path,
          }));
      },
    );

  return {
    ...base,
    mount: (path: `/${string}`, route: () => FS<C>) =>
      routerFs({
        ...routes,
        [path]: route,
      }),
  };
};
