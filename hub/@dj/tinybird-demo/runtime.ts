import Reframe from "@";
import { createReactClientFs } from "@reframe/react/fs/client.ts";
import { loadSync } from "https://deno.land/std@0.219.0/dotenv/mod.ts";
import { createFs } from "@reframe/zero/fs/create.ts";
import { createTailwindFs } from "@reframe/react/fs/tailwind.ts";
import tailwindConfig from "@/dashboard/tailwind.config.ts";

const createNextFs = () =>
  createFs((ctx) =>
    ctx.read(async (path) => {
      if (path === "/router") {
        return ctx.text(
          `
          export const useRouter = () => {
            const url = new URL("http://localhost:8080");

            return {
              pathname: url.pathname,
              query: Object.fromEntries(url.searchParams),
              asPath: url.pathname,
              isFallback: false,
              basePath: "",
              locale: "",
              locales: [],
              defaultLocale: "",
              domainLocales: [],
              isReady: true,

              push: (_url) => {
                if (!window?.location) return;
                const url = new URL(window.location.href);
                if (_url.query || _url.search) {
                  url.search = _url.query ?? _url.search;
                }
                // go to the new url
                window.location.href = url.href;
              },
            };
          }
        `,
          {},
        );
      }

      throw new Error(`File not found: ${path}`);
    })
  );

export const createRuntime = () => {
  const newRuntime = Reframe
    .extend(() => ({ env: loadSync() }))
    .setFs((fs) => {
      return fs
        .mount(
          "/~react-client",
          () => createReactClientFs(newRuntime.fs),
        )
        .mount(
          "/~tw",
          () => createTailwindFs(newRuntime.fs, tailwindConfig),
        )
        .mount(
          "/~next",
          () => createNextFs(),
        );
    });

  return newRuntime;
};
