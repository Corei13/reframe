import { ensureDirSync } from "https://deno.land/std@0.213.0/fs/ensure_dir.ts";
import { Path, Readable, Watchable, Writeable } from "../defs.ts";
import { createFs } from "./create.ts";
import { sha256 } from "../utils/hash.ts";

type Graph = Record<
  Path,
  {
    hash: string;
    fresh: boolean;
    deps: string[];
  }
>;

const jsonPath = (dir: `/${string}`) => Deno.cwd() + dir + "/graph.json";

const readGraphFile = (dir: `/${string}`) => {
  try {
    return JSON.parse(Deno.readTextFileSync(jsonPath(dir))) as Graph;
  } catch {
    return {};
  }
};

const writeGraphFile = (dir: `/${string}`, graph: Graph) => {
  ensureDirSync(Deno.cwd() + dir);
  Deno.writeTextFileSync(jsonPath(dir), JSON.stringify(graph, null, 2));

  return graph;
};

export const createGraphFs = <
  S extends Readable & Writeable,
  C extends Readable & Writeable & (Watchable | {}),
>(
  dir: `/${string}`,
  db: S,
  compute: C,
) => {
  const graph = {
    current: readGraphFile(dir),
    timestamp: new Date(),
  };

  const updateGraph = (update?: (_: Graph) => Graph) => {
    if (update) {
      graph.current = update(graph.current);
    }

    // update only once every 100ms
    if (new Date().getTime() - graph.timestamp.getTime() > 100) {
      graph.timestamp = new Date();
      writeGraphFile(dir, graph.current);
    }
  };

  const fs = createFs((ctx) =>
    ctx
      .read(async (path, headers) => {
        const referrer = headers["x-fs-graph-referrer"] as Path | undefined;

        if (referrer) {
          updateGraph((graph) => {
            if (graph[referrer] && !graph[referrer].deps.includes(path)) {
              graph[referrer].deps.push(path);
            }
            return graph;
          });
        }

        const node = graph.current[path];
        if (node?.fresh) {
          console.log("[GRAPH] READ", path, node.hash);
          return db.read(`/${node.hash}`, {
            ...headers,
            "x-fs-graph-referrer": path,
          });
        }

        graph.current[path] ??= {
          hash: "",
          fresh: false,
          deps: [],
        };

        const resource = await compute.read(path, {
          ...headers,
          "x-fs-graph-referrer": path,
        });
        // write to db

        const content = await resource.text();
        const hash = await sha256(content);

        await db.write(`/${hash}`, content, resource.headers);

        updateGraph((graph) => {
          graph[path].hash = hash;
          graph[path].fresh = true;
          return graph;
        });

        return ctx.text(content, resource.headers);
      })
      .write(async (path, content, headers) => {
        const hash = await sha256(content);

        if (graph.current[path]?.hash === hash) {
          return ctx.text(content, {});
        }

        console.log("[GRAPH] WRITE", path);

        const queue = [path];
        const visited = new Set<string>();

        while (queue.length) {
          const path = queue.pop()!;
          if (visited.has(path)) {
            continue;
          }

          visited.add(path);

          for (const node in graph.current) {
            if (graph.current[node as Path].deps.includes(path)) {
              graph.current[node as Path].fresh = false;

              console.log("STALE", node);

              queue.push(node as Path);
            }
          }
        }

        graph.current[path] = {
          hash,
          fresh: true,
          deps: [],
        };

        updateGraph();

        return db.write(`/${hash}`, content, {
          ...headers,
          "x-fs-graph-stale": Array.from(visited).join(","),
        });
      })
      .watch((path, handler) => {
        if ("watch" in compute) {
          return compute.watch(path, async (event) => {
            if (!(event.path in graph.current)) {
              return;
            }

            console.log("[GRAPH] WATCH", event);

            const resource = await compute.read(event.path, {});

            const content = await resource.text();

            const response = await fs.write(event.path, content, {});

            const stale =
              response.headers["x-fs-graph-stale"]?.split(",").filter((s) =>
                s.length > 0
              ) ??
                [];

            console.log("STALE", stale);

            await Promise.all(
              stale.map((path) =>
                handler({
                  ...event,
                  path: path as Path,
                })
              ),
            );
          });
        }

        console.log(compute);
        throw new Error("compute does not support watch");
      })
  );
  return fs;
};
