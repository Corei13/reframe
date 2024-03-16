import Reframe from "@";
import { createReactClientFs } from "@reframe/react/fs/client.ts";
import { tailwindFs } from "@reframe/react/fs/tailwind.ts";

export const createRuntime = () => {
  const newRuntime = Reframe
    .setFs((fs) => {
      return fs
        .mount(
          "/~react-client",
          () => createReactClientFs(newRuntime.fs),
        )
        .mount(
          "/~tw",
          () => tailwindFs(newRuntime.fs),
        );
    });

  return newRuntime;
};
