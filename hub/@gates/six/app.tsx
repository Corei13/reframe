import React, { Suspense } from "npm:react@canary";
import { type File, Files as Editor } from "./client.tsx";

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
        path: dirEntry.path,
        name: dirEntry.name,
        content: await Deno.readTextFile(dirEntry.path),
      });
    }

    if (paths.length >= limit) {
      break;
    }
  }

  return paths;
};

const Files = async () => {
  const files = await getFiles(".", 50);

  return (
    <>
      <Suspense fallback={<div>Loading files...</div>}>
        <Editor files={files} />
      </Suspense>
    </>
  );
};

export default function App({ path }: { path: string }) {
  return (
    <Suspense fallback={<div>Loading!...</div>}>
      <div>Hello {path}!!!!!</div>
      <Files />
    </Suspense>
  );
}
