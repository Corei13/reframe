import { createProjectSync, ts } from "npm:@ts-morph/bootstrap";

export type TransformerFactory<Ctx> = (ctx: Ctx) => <T extends ts.Node>(
  node: T,
  context: ts.TransformationContext,
) => null | ts.Node | ts.Node[];

export const createVisitorTransformer = <Ctx>(
  factory: TransformerFactory<Ctx>,
) =>
(
  initialize: (sourceFile: ts.SourceFile) => Ctx,
): ts.TransformerFactory<ts.SourceFile> =>
(context) =>
(sourceFile) =>
  visitSourceFile(
    sourceFile,
    context,
    factory(initialize(sourceFile)),
  );

export function visitSourceFile(
  sourceFile: ts.SourceFile,
  context: ts.TransformationContext,
  visitNode: (
    node: ts.Node,
    context: ts.TransformationContext,
  ) => ts.Node | ts.Node[] | null,
) {
  const result = visitNodeAndChildren(sourceFile);

  if (Array.isArray(result)) {
    if (result.length !== 1) {
      throw new Error("must return a single SourceFile node");
    }

    const node = result[0];

    if (!node || !ts.isSourceFile(node)) {
      throw new Error("must return a SourceFile node");
    }

    return node;
  }

  if (!ts.isSourceFile(result)) {
    throw new Error("must return a SourceFile node");
  }

  return result;

  function visitNodeAndChildren(node: ts.Node): ts.Node | ts.Node[] {
    const result = visitNode(node, context);

    if (result === null) {
      return node;
    }

    if (!Array.isArray(result)) {
      return ts.visitEachChild(
        result,
        visitNodeAndChildren,
        context,
      );
    }

    return result.map((newNode) =>
      ts.visitEachChild(
        newNode,
        visitNodeAndChildren,
        context,
      )
    );
  }
}

export const createTsSystem = () => {
  const project = createProjectSync({ useInMemoryFileSystem: true });

  const compilerOptions = {
    composite: false,
    noEmit: false,
    incremental: false,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: "npm:react@canary",
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    removeComments: true,
  } as ts.CompilerOptions;

  const program = {
    current: project.createProgram({
      options: compilerOptions,
      rootNames: [],
    }),
  };

  return {
    get: (path: string) => {
      const sourceFile = program.current.getSourceFile(path);

      return sourceFile;
    },
    set: (path: string, content: string) => {
      project.createSourceFile(path, content);

      program.current = project.createProgram({
        options: compilerOptions,
        oldProgram: program.current,
        rootNames: [...program.current.getRootFileNames(), path],
      });
    },
    getSourceFile: (path: string, content: string) => {
      return project.createSourceFile(path, content);
    },
    transpile: (path: string, content: string, config: {
      transformers?: ts.CustomTransformers;
      compilerOptions?: ts.CompilerOptions;
    }) => {
      const result = ts.transpileModule(content, {
        compilerOptions: {
          ...compilerOptions,
          ...config.compilerOptions,
        },
        fileName: path,
        reportDiagnostics: true,
        transformers: config.transformers,
      });

      return result;
    },
  };
};

export { ts };
