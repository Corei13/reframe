import Reframe from "@";

const accessToken = Reframe.env.DENO_TOKEN;
const projectId = Reframe.env.DENO_PROJECT_ID;

// recursively read all the files from given path
const getFiles = async (base: string, limit: number) => {
  const paths: File[] = [];
  const { walk } = await import("https://deno.land/std@0.170.0/fs/walk.ts");
  for await (
    const dirEntry of walk(base, {
      skip: [/.git/],
    })
  ) {
    if (dirEntry.isFile) {
      paths.push({
        name: dirEntry.path,
        content: await Deno.readTextFile(dirEntry.path),
      });
    }

    if (paths.length >= limit) {
      break;
    }
  }

  return paths;
};

// read file path from deno arg
const path = Reframe.args[0];

/*
map the files as
const assets = mapObject(files, (value, key) => ({
    kind: "file",
    content: value,
  }));
  */
const files = await getFiles(path, 10000);
const assets = Object.fromEntries(
  files.map((file) => [
    file.name.slice((path + "/").length),
    {
      kind: "file",
      content: file.content,
      encoding: "utf-8",
    },
  ]),
);

// console.log(assets);

const body = {
  entryPointUrl: "entry.ts",
  importMapUrl: null,
  lockFileUrl: null,
  compilerOptions: null,

  assets: {
    ...assets,
  },
  envVars: Reframe.env,
  requestTimeout: 10000,
  description: "no description",
};

// Deno.writeTextFileSync("body.json", JSON.stringify(body, null, 2));

const response = await fetch(
  `https://api.deno.com/v1/projects/${projectId}/deployments`,
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      "content-type": "application/json",
    },
    // body: '{"entryPointUrl":"main.ts","importMapUrl":null,"lockFileUrl":null,"compilerOptions":null,"assets":{"main.ts":{"kind":"file","content":"Deno.serve((req: Request) => new Response(\\"Hello World\\"));\\n","encoding":"utf-8"}},\n "envVars":{"MyEnv":"hey"},"requestTimeout":10000,"description":"My first deployment"}',
    body: JSON.stringify(body),
  },
);
console.log(await response.json());
