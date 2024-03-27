import { createFs } from "@reframe/zero/fs/create.ts";

export const createDomFs = () => {
  return createFs((ctx) =>
    ctx
      .read(async (path) => {
        const code = await self.__reframe.modules.source.get(path);
        return ctx.text(code, {});
      })
  );
};
