import { createRuntime as createZeroRuntime } from "/@reframe/zero/runtime/dev.ts";
import { extendRuntime } from "./extension.ts";
import { createRouterFs } from "/@reframe/zero/fs/router.ts";
import { reactClientFs } from "/@reframe/zero/experimental-react/client.ts";

export const createRuntime = (args: string[]) => {
  const runtime = createZeroRuntime(args);
  const reactRuntime: ReturnType<typeof extendRuntime> = extendRuntime(
    runtime.setFs(
      createRouterFs()
        .mount("/", () => runtime.fs)
        .mount("/~react-client", () => reactClientFs(reactRuntime.fs))
    )
  );
  return reactRuntime;
};
