import Reframe from "@";
import { createReactClientFs } from "@reframe/react/fs/client.ts";

export const createRuntime = () => {
  const newRuntime = Reframe
    .setFs((fs) => {
      return fs
        .mount(
          "/~react-client",
          () => createReactClientFs(newRuntime.fs),
        );
    });

  return newRuntime;
};
