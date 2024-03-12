import Reframe from "@";

export const createRuntime = (args: string[]) => {
  return Reframe
    .setArgs(args)
    .extend({
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
