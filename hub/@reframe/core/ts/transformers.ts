import { createVisitorTransformer, ts } from "./system.ts";

const normalizeSpecifier = (specifier: string, path: string) => {
  return specifier;
};

export const extractExports = (node: ts.Node): string[] => {
  const extractBinding = (binding: ts.BindingName): string[] => {
    if (ts.isIdentifier(binding)) {
      return [binding.text];
    }

    if (ts.isObjectBindingPattern(binding)) {
      return binding.elements.flatMap((e) => extractBinding(e.name));
    }

    if (ts.isArrayBindingPattern(binding)) {
      return binding.elements.flatMap((e) =>
        ts.isOmittedExpression(e) ? [] : extractBinding(e.name)
      );
    }

    return [];
  };

  if (
    ts.isVariableStatement(node) &&
    node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  ) {
    return node.declarationList.declarations
      .flatMap((d) => extractBinding(d.name));
  }

  if (
    ts.isFunctionDeclaration(node) &&
    node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  ) {
    if (node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
      return ["default"];
    }

    return node.name ? [node.name.text] : [];
  }

  if (
    ts.isClassDeclaration(node) &&
    node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  ) {
    if (node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
      return ["default"];
    }

    return node.name ? [node.name.text] : [];
  }

  if (ts.isExportDeclaration(node)) {
    if (!node.exportClause) {
      return [];
    }

    if (ts.isNamespaceExport(node.exportClause)) {
      return [node.exportClause.name.text];
    }

    return node.exportClause.elements.flatMap((e) => {
      return e.name.text;
    });
  }

  if (
    ts.isExportAssignment(node)
  ) {
    return ["default"];
  }

  return [];
};

export const unmodule = createVisitorTransformer<{
  path: string;
  imports: string[];
  symbols: {
    reframe: string;
    imports: string;
    exports: string;
    generate: (prefix: string) => string;
  };
}>(
  (ctx) => (node) => {
    if (ts.isSourceFile(node)) {
      const imports: Record<string, Record<string, string>> = {};

      const statements = node.statements.flatMap((statement) => {
        if (ts.isExportAssignment(statement)) {
          return ts.factory.createExpressionStatement(
            ts.factory.createAssignment(
              ts.factory.createElementAccessExpression(
                ts.factory.createIdentifier(ctx.symbols.exports),
                ts.factory.createStringLiteral("default"),
              ),
              statement.expression,
            ),
          );
        }

        if (ts.isExportDeclaration(statement)) {
          if (!statement.moduleSpecifier) {
            if (
              !statement.exportClause || ts.isNamespaceExport(
                statement.exportClause,
              )
            ) {
              return statement;
            }

            return statement.exportClause.elements.map((element) => {
              return ts.factory.createExpressionStatement(
                ts.factory.createAssignment(
                  ts.factory.createElementAccessExpression(
                    ts.factory.createIdentifier(ctx.symbols.exports),
                    ts.factory.createStringLiteral(
                      element.name.text,
                    ),
                  ),
                  ts.factory.createIdentifier(
                    element.propertyName?.text ?? element.name.text,
                  ),
                ),
              );
            });
          }

          if (!ts.isStringLiteral(statement.moduleSpecifier)) {
            throw new Error(
              `moduleSpecifier must be a string literal, got ${node.getText()}`,
            );
          }

          const specifier = normalizeSpecifier(
            statement.moduleSpecifier.text,
            ctx.path,
          );

          imports[specifier] ??= {};

          if (!statement.exportClause) {
            return ts.factory.createExpressionStatement(
              ts.factory.createAssignment(
                ts.factory.createIdentifier(ctx.symbols.exports),
                ts.factory.createObjectLiteralExpression(
                  [
                    ts.factory.createSpreadAssignment(
                      ts.factory.createIdentifier(ctx.symbols.exports),
                    ),
                    ts.factory.createSpreadAssignment(
                      ts.factory.createElementAccessExpression(
                        ts.factory.createIdentifier(ctx.symbols.imports),
                        ts.factory.createStringLiteral(specifier),
                      ),
                    ),
                  ],
                  true,
                ),
              ),
            );
          }

          if (ts.isNamespaceExport(statement.exportClause)) {
            imports[specifier][statement.exportClause.name.text] = "*";

            return ts.factory.createExpressionStatement(
              ts.factory.createAssignment(
                ts.factory.createElementAccessExpression(
                  ts.factory.createIdentifier(ctx.symbols.exports),
                  ts.factory.createStringLiteral(
                    statement.exportClause.name.text,
                  ),
                ),
                ts.factory.createElementAccessExpression(
                  ts.factory.createIdentifier(ctx.symbols.imports),
                  ts.factory.createStringLiteral(specifier),
                ),
              ),
            );
          } else {
            return ts.factory.createForOfStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    ts.factory.createArrayBindingPattern([
                      ts.factory.createBindingElement(
                        undefined,
                        undefined,
                        ts.factory.createIdentifier("name"),
                        undefined,
                      ),
                      ts.factory.createBindingElement(
                        undefined,
                        undefined,
                        ts.factory.createIdentifier("property"),
                        undefined,
                      ),
                    ]),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
              ts.factory.createArrayLiteralExpression(
                statement.exportClause.elements.map((element) => {
                  return ts.factory.createArrayLiteralExpression(
                    [
                      ts.factory.createStringLiteral(
                        element.name.text,
                      ),
                      ts.factory.createStringLiteral(
                        element.propertyName?.text ??
                          element.name.text,
                      ),
                    ],
                    false,
                  );
                }),
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createAssignment(
                      ts.factory.createElementAccessExpression(
                        ts.factory.createIdentifier(ctx.symbols.exports),
                        ts.factory.createIdentifier("name"),
                      ),
                      ts.factory.createElementAccessExpression(
                        ts.factory.createElementAccessExpression(
                          ts.factory.createIdentifier(ctx.symbols.imports),
                          ts.factory.createStringLiteral(specifier),
                        ),
                        ts.factory.createIdentifier("property"),
                      ),
                    ),
                  ),
                ],
                true,
              ),
            );
          }
        }

        if (!ts.isImportDeclaration(statement)) {
          return statement;
        }

        if (!ts.isStringLiteral(statement.moduleSpecifier)) {
          throw new Error(`Expected moduleSpecifier to be a string literal`);
        }

        const specifier = normalizeSpecifier(
          statement.moduleSpecifier.text,
          ctx.path,
        );

        imports[specifier] ??= {};

        if (statement.importClause?.name) {
          imports[specifier][statement.importClause.name.text] = "default";
        }

        const bindings = statement.importClause?.namedBindings;

        if (!bindings) {
          return [];
        }

        if (ts.isNamespaceImport(bindings)) {
          imports[specifier][bindings.name.text] = "*";

          return [];
        }

        for (const element of bindings.elements) {
          imports[specifier][element.name.text] = element.propertyName?.text ??
            element.name.text;
        }

        return [];
      });

      const importStatementParts: Array<
        [ts.StringLiteral, ts.ObjectBindingPattern | ts.Identifier]
      > = Object
        .entries(
          imports,
        ).flatMap(([specifier, bindings]) => {
          const namespaces = Object.entries(bindings).filter(
            ([, propertyName]) => propertyName === "*",
          );
          const names = Object.entries(bindings).filter(
            ([, propertyName]) => propertyName !== "*",
          );

          const parts = [] as Array<
            [ts.StringLiteral, ts.ObjectBindingPattern | ts.Identifier]
          >;

          parts.push([
            ts.factory.createStringLiteral(specifier),

            ts.factory.createObjectBindingPattern(
              names.map(([name, propertyName]) => {
                return ts.factory.createBindingElement(
                  undefined,
                  ts.factory.createIdentifier(propertyName),
                  ts.factory.createIdentifier(name),
                  undefined,
                );
              }),
            ),
          ]);

          for (const [name] of namespaces) {
            parts.push(
              [
                ts.factory.createStringLiteral(specifier),
                ts.factory.createIdentifier(name),
              ],
            );
          }

          return parts;
        });

      ctx.imports.push(...Object.keys(imports));

      return ts.factory.updateSourceFile(
        node,
        [
          ts.factory.createExportAssignment(
            ts.factory.createModifiersFromModifierFlags(
              ts.ModifierFlags.Default,
            ),
            undefined,
            ts.factory.createArrowFunction(
              ts.factory.createModifiersFromModifierFlags(
                ts.ModifierFlags.Async,
              ),
              undefined,
              [
                ts.factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  ts.factory.createIdentifier(ctx.symbols.reframe),
                ),
              ],
              undefined,
              undefined,
              ts.factory.createBlock(
                [
                  ts.factory.createVariableStatement(
                    [],
                    ts.factory.createVariableDeclarationList(
                      [
                        ts.factory.createVariableDeclaration(
                          ts.factory.createIdentifier(ctx.symbols.imports),
                          undefined,
                          undefined,
                          ts.factory.createAwaitExpression(
                            ts.factory.createCallExpression(
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier(
                                  ctx.symbols.reframe,
                                ),
                                ts.factory.createIdentifier("importMany"),
                              ),
                              undefined,
                              importStatementParts.map(([specifier]) =>
                                specifier
                              ),
                            ),
                          ),
                        ),
                      ],
                      ts.NodeFlags.Const,
                    ),
                  ),
                  ts.factory.createVariableStatement(
                    [],
                    ts.factory.createVariableDeclarationList(
                      [
                        ts.factory.createVariableDeclaration(
                          ts.factory.createIdentifier(ctx.symbols.exports),
                          undefined,
                          undefined,
                          ts.factory.createObjectLiteralExpression(),
                        ),
                      ],
                      ts.NodeFlags.Let,
                    ),
                  ),
                  ts.factory.createExpressionStatement(
                    ts.factory.createAssignment(
                      ts.factory.createElementAccessExpression(
                        ts.factory.createIdentifier(ctx.symbols.exports),
                        ts.factory.createIdentifier("Symbol.toStringTag"),
                      ),
                      ts.factory.createStringLiteral("Module"),
                    ),
                  ),
                  ...importStatementParts.map(([specifier, bindings]) => {
                    return ts.factory.createVariableStatement(
                      [],
                      ts.factory.createVariableDeclarationList(
                        [
                          ts.factory.createVariableDeclaration(
                            bindings,
                            undefined,
                            undefined,
                            ts.factory.createElementAccessExpression(
                              ts.factory.createIdentifier(ctx.symbols.imports),
                              specifier,
                            ),
                          ),
                        ],
                        ts.NodeFlags.Const,
                      ),
                    );
                  }),
                  ...statements,

                  ts.factory.createReturnStatement(
                    ts.factory.createIdentifier(ctx.symbols.exports),
                  ),
                ],
                true,
              ),
            ),
          ),
        ],
        node.isDeclarationFile,
        node.referencedFiles,
        node.typeReferenceDirectives,
        node.hasNoDefaultLib,
        node.libReferenceDirectives,
      );
    }

    // test for await import
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const specifier = node.arguments[0];

      if (!ts.isStringLiteral(specifier)) {
        return node;
      }

      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(ctx.symbols.reframe),
          ts.factory.createIdentifier("import"),
        ),
        undefined,
        [
          ts.factory.createStringLiteral(
            normalizeSpecifier(
              specifier.text,
              ctx.path,
            ),
          ),
        ],
      );
    }

    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const exports = extractExports(node);
      return [
        ts.factory.createVariableStatement(
          node.modifiers?.filter((m) =>
            m.kind !== ts.SyntaxKind.ExportKeyword &&
            m.kind !== ts.SyntaxKind.DefaultKeyword
          ),
          node.declarationList,
        ),
        // {symbol.exports}[<name>] = <name>;
        ...exports.map((name) => {
          return ts.factory.createExpressionStatement(
            ts.factory.createAssignment(
              ts.factory.createElementAccessExpression(
                ts.factory.createIdentifier(ctx.symbols.exports),
                ts.factory.createStringLiteral(name),
              ),
              ts.factory.createIdentifier(name),
            ),
          );
        }),
      ];
    }

    if (
      ts.isFunctionDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const name = node.name ??
        ts.factory.createIdentifier(ctx.symbols.generate("fn"));
      return [
        ts.factory.createFunctionDeclaration(
          node.modifiers?.filter((m) =>
            m.kind !== ts.SyntaxKind.ExportKeyword &&
            m.kind !== ts.SyntaxKind.DefaultKeyword
          ),
          node.asteriskToken,
          name,
          node.typeParameters,
          node.parameters,
          node.type,
          node.body,
        ),

        ts.factory.createExpressionStatement(
          ts.factory.createAssignment(
            ts.factory.createElementAccessExpression(
              ts.factory.createIdentifier(ctx.symbols.exports),
              ts.factory.createStringLiteral(
                node.modifiers?.some((m) =>
                    m.kind === ts.SyntaxKind.DefaultKeyword
                  )
                  ? "default"
                  : name.text,
              ),
            ),
            name,
          ),
        ),
      ];
    }

    if (
      ts.isClassDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const name = node.name ??
        ts.factory.createIdentifier(ctx.symbols.generate("fn"));
      return [
        ts.factory.createClassDeclaration(
          node.modifiers?.filter((m) =>
            m.kind !== ts.SyntaxKind.ExportKeyword &&
            m.kind !== ts.SyntaxKind.DefaultKeyword
          ),
          name,
          node.typeParameters,
          node.heritageClauses,
          node.members,
        ),

        ts.factory.createExpressionStatement(
          ts.factory.createAssignment(
            ts.factory.createElementAccessExpression(
              ts.factory.createIdentifier(ctx.symbols.exports),
              ts.factory.createStringLiteral(
                node.modifiers?.some((m) =>
                    m.kind === ts.SyntaxKind.DefaultKeyword
                  )
                  ? "default"
                  : name.text,
              ),
            ),
            name,
          ),
        ),
      ];
    }

    return node;
  },
);
