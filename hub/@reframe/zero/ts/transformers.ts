import { createVisitorTransformer, ts } from "./system.ts";

const normalizeSpecifier = (specifier: string, _path: string) => {
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

// x -> () => x
const lift = (node: ts.Expression) => {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    undefined,
    node,
  );
};

export const runnable = createVisitorTransformer<{
  path: string;
  imports: string[];
  dynamicImports: string[];
  exports: {
    names: string[];
    namespaces: string[];
  };
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
        // export default <expression>
        if (ts.isExportAssignment(statement)) {
          ctx.exports.names.push("default");

          return ts.factory.createExpressionStatement(
            ts.factory.createAssignment(
              ts.factory.createElementAccessExpression(
                ts.factory.createIdentifier(ctx.symbols.exports),
                ts.factory.createStringLiteral("default"),
              ),
              lift(statement.expression),
            ),
          );
        }

        // export { <property> as <name> }
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
              ctx.exports.names.push(element.name.text);

              return ts.factory.createExpressionStatement(
                ts.factory.createAssignment(
                  ts.factory.createElementAccessExpression(
                    ts.factory.createIdentifier(ctx.symbols.exports),
                    ts.factory.createStringLiteral(
                      element.name.text,
                    ),
                  ),
                  lift(ts.factory.createIdentifier(
                    element.propertyName?.text ?? element.name.text,
                  )),
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

          // export * from "<specifier>"
          if (!statement.exportClause) {
            ctx.exports.namespaces.push(specifier);

            return ts.factory.createExpressionStatement(
              ts.factory.createAssignment(
                ts.factory.createIdentifier(ctx.symbols.exports),
                ts.factory.createObjectLiteralExpression(
                  [
                    ts.factory.createSpreadAssignment(
                      // Object.fromEntries(
                      ts.factory.createCallExpression(
                        ts.factory.createIdentifier("Object.fromEntries"),
                        undefined,
                        [
                          ts.factory.createCallExpression(
                            ts.factory.createPropertyAccessExpression(
                              // Object.entries(
                              ts.factory.createCallExpression(
                                ts.factory.createIdentifier("Object.entries"),
                                undefined,
                                [
                                  // imports[specifier]
                                  ts.factory.createElementAccessExpression(
                                    ts.factory.createIdentifier(
                                      ctx.symbols.imports,
                                    ),
                                    ts.factory.createStringLiteral(specifier),
                                  ),
                                ],
                              ),
                              ts.factory.createIdentifier("map"),
                            ),
                            undefined,
                            [
                              ts.factory.createArrowFunction(
                                undefined,
                                undefined,
                                [ts.factory.createParameterDeclaration(
                                  undefined,
                                  undefined,
                                  // [name, value]
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
                                      ts.factory.createIdentifier("value"),
                                      undefined,
                                    ),
                                  ]),
                                )],
                                undefined,
                                undefined,
                                // [name, () => value]
                                ts.factory.createArrayLiteralExpression(
                                  [
                                    ts.factory.createIdentifier("name"),
                                    ts.factory.createArrowFunction(
                                      undefined,
                                      undefined,
                                      [],
                                      undefined,
                                      undefined,
                                      ts.factory.createIdentifier("value"),
                                    ),
                                  ],
                                  false,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // if a name was already set, that takes precedence
                    ts.factory.createSpreadAssignment(
                      ts.factory.createIdentifier(ctx.symbols.exports),
                    ),
                  ],
                  true,
                ),
              ),
            );
          }

          // export * as <name> from "<specifier>"
          if (ts.isNamespaceExport(statement.exportClause)) {
            imports[specifier][statement.exportClause.name.text] = "*";
            ctx.exports.names.push(statement.exportClause.name.text);

            return ts.factory.createExpressionStatement(
              ts.factory.createAssignment(
                ts.factory.createElementAccessExpression(
                  ts.factory.createIdentifier(ctx.symbols.exports),
                  ts.factory.createStringLiteral(
                    statement.exportClause.name.text,
                  ),
                ),
                lift(ts.factory.createElementAccessExpression(
                  ts.factory.createIdentifier(ctx.symbols.imports),
                  ts.factory.createStringLiteral(specifier),
                )),
              ),
            );
          } else {
            // export { <property> as <name> } from "<specifier>"
            ctx.exports.names.push(
              ...statement.exportClause.elements.map((element) =>
                element.name.text
              ),
            );

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
                      lift(ts.factory.createElementAccessExpression(
                        ts.factory.createElementAccessExpression(
                          ts.factory.createIdentifier(ctx.symbols.imports),
                          ts.factory.createStringLiteral(specifier),
                        ),
                        ts.factory.createIdentifier("property"),
                      )),
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

        // import * as <name> from "<specifier>"
        if (ts.isNamespaceImport(bindings)) {
          imports[specifier][bindings.name.text] = "*";

          return [];
        }

        // import { <property> as <name> } from "<specifier>"
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

      const hasImports = importStatementParts.length > 0;

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
              !hasImports ? [] : [
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
                  ts.factory.createExpressionStatement(
                    ts.factory.createAssignment(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier("import.meta"),
                        ts.factory.createIdentifier("path"),
                      ),
                      ts.factory.createStringLiteral(ctx.path),
                    ),
                  ),
                  !hasImports
                    ? ts.factory.createEmptyStatement()
                    : ts.factory.createVariableStatement(
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
                      lift(ts.factory.createStringLiteral("Module")),
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
                    // Object.fromEntries(
                    ts.factory.createCallExpression(
                      ts.factory.createIdentifier("Object.fromEntries"),
                      undefined,
                      [
                        // Object.entries(exports).map(
                        ts.factory.createCallExpression(
                          ts.factory.createPropertyAccessExpression(
                            ts.factory.createCallExpression(
                              ts.factory.createIdentifier("Object.entries"),
                              undefined,
                              [
                                ts.factory.createIdentifier(
                                  ctx.symbols.exports,
                                ),
                              ],
                            ),
                            ts.factory.createIdentifier("map"),
                          ),
                          undefined,
                          [
                            // ([name, value]) => [name, value()]
                            ts.factory.createArrowFunction(
                              undefined,
                              undefined,
                              [
                                ts.factory.createParameterDeclaration(
                                  undefined,
                                  undefined,
                                  ts.factory.createArrayBindingPattern(
                                    [
                                      ts.factory.createBindingElement(
                                        undefined,
                                        undefined,
                                        ts.factory.createIdentifier("name"),
                                        undefined,
                                      ),
                                      ts.factory.createBindingElement(
                                        undefined,
                                        undefined,
                                        ts.factory.createIdentifier("value"),
                                        undefined,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              undefined,
                              undefined,
                              ts.factory.createArrayLiteralExpression(
                                [
                                  ts.factory.createIdentifier("name"),
                                  ts.factory.createCallExpression(
                                    ts.factory.createIdentifier("value"),
                                    undefined,
                                    [],
                                  ),
                                ],
                                false,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
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

      ctx.dynamicImports.push(specifier.text);

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
      ctx.exports.names.push(...exports);

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
              lift(ts.factory.createIdentifier(name)),
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

      const exportName = node.modifiers
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
        ? "default"
        : name.text;

      ctx.exports.names.push(exportName);

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
                exportName,
              ),
            ),
            lift(name),
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

      const exportName = node.modifiers
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
        ? "default"
        : name.text;

      ctx.exports.names.push(exportName);

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
              ts.factory.createStringLiteral(exportName),
            ),
            lift(name),
          ),
        ),
      ];
    }

    return node;
  },
);
