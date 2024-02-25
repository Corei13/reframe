import { createRuntime, type Runtime } from "../runtime.ts";
import type { Body, BodyPromise } from "../body.ts";
import { createLogger } from "../log/log.ts";
import { FSError } from "../fs/lib/error.ts";
import { cleanPath, splitPath } from "../utils/path.ts";
import { createBodyPromise, json, response, text } from "../body.ts";

export type Base = {
  request: Request;
  operation: "read" | "write";

  path: string;
  segments: string[];

  body: Body | null;

  text: typeof text;
  json: typeof json;
  response: typeof response;

  badRequest: (message?: string) => FSError;
  notFound: (message?: string) => FSError;
  notImplemented: (message?: string) => FSError;
  notAllowed: (message?: string) => FSError;

  log: (...args: unknown[]) => void;
};

export type Ctx<
  C extends Base,
  H extends Record<string, string> = Record<string, string>,
> = C & {
  fs: FSClient;
  runtime: (entry: string) => Runtime;
  create: (request: Request, fs?: FS<C>) => Ctx<C>;
  cd: (path: string | ((_: string) => string)) => Ctx<C>;
  switch: (fs: FS<C>) => Ctx<C>;
  forward(
    fs: FS<C>,
    headers?: (headers: H) => H,
  ): BodyPromise<H>;
};

export type BaseCtx = Ctx<Base>;

export type FSClient = {
  name: string;
  fetch: (request: Request) => Promise<Response>;
  read: (path: string, headers?: Record<string, string>) => BodyPromise;
  write: (
    path: string,
    body: Body,
    headers?: Record<string, string>,
  ) => BodyPromise;
};

export type FS<C extends Base> = {
  name: string;
  read: (ctx: Ctx<C>) => BodyPromise;
  write: (ctx: Ctx<C>) => BodyPromise;
  use: (_: (request: Request, fs: FS<C>) => Ctx<C>) => FSClient;
};

export const extendCreator = <C extends Base>(
  create: (request: Request, fs: FS<C>) => C,
) => {
  const extended = (request: Request, fs: FS<C>) => {
    const base = create(request, fs);

    const ctx: Ctx<C> = {
      ...base,
      fs: fs.use(extended),
      runtime: (entry: string) => createRuntime(entry, ctx),
      create: (request, anotherFs) => extended(request, anotherFs ?? fs),
      switch: (fs) => extended(request, fs),
      cd: (path: string | ((_: string) => string)) => {
        const newPath = cleanPath(
          typeof path === "function" ? path(base.path) : path,
        );

        return extended(
          new Request(new URL(newPath, request.url).toString(), request),
          fs,
        );
      },
      forward: (fs, headers) => {
        const resource = ctx.operation === "read"
          ? fs.read(ctx.create(ctx.request, fs))
          : fs.write(ctx.create(ctx.request, fs));

        return createBodyPromise(
          resource
            .then((body) =>
              response(
                body.response().body,
                {
                  ...body.headers,
                  ...headers?.(body.headers),
                },
              )
            ),
        );
      },
    };

    return ctx;
  };

  return extended;
};

export const createBaseCtx = extendCreator<Base>((
  request,
  fs,
) => {
  const url = new URL(request.url);

  const segments = splitPath(url.pathname);
  const path = cleanPath(url.pathname) + url.search;

  const operation = ["GET", "HEAD"].includes(request.method) ? "read" : "write";

  return {
    request,
    operation,

    path,
    segments,

    body: request.body &&
      response(request.body, Object.fromEntries(request.headers)),

    text,
    json,
    response,

    notFound: (message) =>
      FSError.notFound(
        message ??
          `resource not found: ${path}`,
      ),

    notImplemented: (message) =>
      FSError.notImplemented(
        message ?? `${operation.toUpperCase()} ${path} not implemented`,
      ),

    badRequest: (message) =>
      FSError.badRequest(
        message ??
          `bad request: ${operation.toUpperCase()} ${path}`,
      ),

    notAllowed: (message) =>
      FSError.notAllowed(
        message ??
          `not allowed: ${operation.toUpperCase()} ${path}`,
      ),

    log: createLogger((log) => (...args) =>
      log(
        operation.toUpperCase(),
        `[${fs.name}]`,
        ...args,
        `(${
          path.length <= 40 ? path : path.slice(0, 20) + "..." + path.slice(-20)
        })`,
      )
    ),
  };
});
