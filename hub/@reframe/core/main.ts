#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run --allow-sys --unstable-kv --watch

import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import serve from "./server.ts";
import build from "./build.ts";

// dev serve [entry]
// prod serve [entry]
// deploy [entry]
// check [entry]

type Command<
  P extends Record<string, string | number | boolean>,
  A extends string[],
> = (
  params: P,
  ...args: A
) => void | Promise<void>;

type Commands<P extends Record<string, string | number | boolean>> =
  | Command<P, string[]>
  | {
    [key: string]: Commands<P>;
  };

const parseEntryPath = (entry: string) => {
  // @org/name(:version)?/path/to/entry

  const [
    ,
    org,
    name,
    ,
    version,
    ,
    path,
  ] = /^@([^/]+)\/([^:/]+)(:([^/]+))?(\/(.+))?$/.exec(entry) || [];

  if (!org || !name) {
    console.error(`invalid entry path: ${entry}`);
    Deno.exit(1);
  }

  return {
    org,
    name,
    version,
    path: path ?? "",
  };
};

type Env = { port: number };

const commands = {
  dev: {
    serve: ({ port }, entry: string) => {
      const { org, name, version, path } = parseEntryPath(entry);
      serve(org, name, version, path, port);
    },
  },

  build: (_: {}, entry: string) => {
    const { org, name, version, path } = parseEntryPath(entry);
    console.log("build", org, name, version, path);
    return build(org, name, version, path);
  },

  prod: {
    serve: (_: {}, entry: string) => {
    },
  },

  deploy: (_: {}, entry: string) => {
    console.log("deploy", entry);
  },

  check: (_: {}, entry: string) => {
    const { org, name } = parseEntryPath(entry);
    const command = new Deno.Command("/usr/bin/env", {
      args: [
        "-S",
        "deno",
        "check",
        `@${org}/${name}/**/*.ts`,
        `@${org}/${name}/**/*.tsx`,
      ],
    });

    const { code, stdout, stderr } = command.outputSync();
    if (code !== 0) {
      console.error(new TextDecoder().decode(stderr));
    }
    console.log(new TextDecoder().decode(stdout));
  },
} satisfies Commands<Env>;

if (import.meta.main) {
  const args = parse(Deno.args);
  console.log(args);

  let command: Commands<Env> = commands;

  while (typeof command !== "function" && args._.length > 0) {
    const next = String(args._.shift());

    command = command[next];

    if (!command) {
      console.error(`unknown command ${next}`);
      Deno.exit(1);
    }
  }

  if (typeof command !== "function") {
    console.error(`available commands: ${Object.keys(command).join(", ")}`);

    Deno.exit(0);
  }

  await command(args as unknown as Env, ...args._.map(String));
}
