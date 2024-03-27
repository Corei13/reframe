import Reframe from "@";
import { loadSync } from "https://deno.land/std@0.219.0/dotenv/mod.ts";

export const createRuntime = () => {
  return Reframe
    .extend({
      env: loadSync(),
      hydrate: {
        server: {
          getOnce: (specifier: string) => {
            console.warn("getOnce is not implemented", specifier);
            return {
              header: () => "",
              text: async () => {
                console.warn("text is not implemented", specifier);

                return `export default () => {
              console.log("hydrate.getOnce", "${specifier}");
            }`;
              },
            };
          },
          get: (specifier: string) => {
            console.warn("get is not implemented", specifier);
            return {
              header: () => "",
              text: async () => {
                console.warn("text is not implemented", specifier);

                return `export default () => {
                  console.log("hydrate.get", "${specifier}");
              }`;
              },
            };
          },
          has: (specifier: string) => false,
        },
      },
    });
};