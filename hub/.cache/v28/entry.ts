
  import createBuildRuntimeRunnable from "./~@/@dj/build-experiments/runtime.ts.~.mjs";

  const { createRuntime: createBuildRuntime } = await createBuildRuntimeRunnable();

  const buildRuntime = createBuildRuntime({
    entry: "/",
    importSuffix: ".~.mjs",
    fs: {},
    moduleCache: new Map()
  });

  const { createRuntime } = await buildRuntime.import("/~@/@/runtime.ts");

  const runtime = createRuntime({
    entry: "/",
    importSuffix: ".~.mjs",
    fs: {},
    moduleCache: new Map(),
  });

  await runtime.import("/~@/@/main.ts");
      