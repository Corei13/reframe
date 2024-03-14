import type { Module } from "../defs.ts";

export type Runtime<T = unknown> = {
  factory: RuntimeFactory<T>;
  extend: <E>(
    createExtension: (factory: RuntimeFactory<T>) => E,
  ) => Runtime<T & E>;
} & T;

export type RuntimeFactory<T> = () => Runtime<T>;

export type Infer<R extends Runtime<unknown>> = R extends Runtime<infer T> ? T
  : never;

export type InferFactory<R extends RuntimeFactory<unknown>> = R extends
  RuntimeFactory<infer T> ? T : never;

export const createRuntimeFactory = <T>(
  extension: (factory: RuntimeFactory<T>) => T,
  counter = 0,
): RuntimeFactory<T> => {
  const factory = () => {
    const runtime: Runtime<T> = {
      factory,
      ...extension(factory),
      extend: <E>(createExtension: (factory: RuntimeFactory<T>) => E) =>
        createRuntimeFactory<T & E>(
          (factory) => ({
            ...extension(factory),
            ...createExtension(factory),
          }),
          counter + 1,
        )(),
    };

    return runtime;
  };

  return factory;
};

export const createBaseRuntime = createRuntimeFactory<unknown>(() => ({}));

export type Runnable<
  M extends Record<string, unknown> = Record<string, unknown>,
> = <T = unknown>(runtime: T) => Promise<Module<M>>;

export default createBaseRuntime();
