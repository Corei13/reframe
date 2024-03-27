import { createTsSystem, ts } from "./system.ts";
import * as transformers from "./transformers.ts";

export const createTranspiler = (
  transformers?: ts.CustomTransformers,
) =>
(path: string, content: string) => {
  const system = createTsSystem();
  system.set(path, content);

  const result = system.transpile(
    path,
    content,
    {
      transformers,
      compilerOptions: {
        removeComments: false,
      },
    },
  );

  return result.outputText;
};

const gensym = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2)}`;

export const runnable = (path: string, content: string) => {
  const imports = [] as string[];
  const dynamicImports = [] as string[];
  const exports = {
    names: [] as string[],
    namespaces: [] as string[],
    statements: [],
  };

  const transpiler = createTranspiler({
    after: [transformers.runnable((sourceFile) => ({
      path: sourceFile.fileName,
      imports,
      dynamicImports,
      exports,
      symbols: {
        reframe: gensym("reframe"),
        imports: gensym("imports"),
        exports: gensym("exports"),
        generate: (prefix) => gensym(prefix),
      },
    }))],
  });

  const transpiled = transpiler(path, content);

  return {
    transpiled,
    imports,
    dynamicImports,
    exports,
  };
};
