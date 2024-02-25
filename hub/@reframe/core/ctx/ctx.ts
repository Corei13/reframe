import { createRuntime, type Runtime } from "../runtime.ts";
import type { Body, BodyPromise } from "../body.ts";
import { FSError } from "../fs/lib/error.ts";
import { cleanPath } from "../utils/path.ts";
import { json, response, text } from "../body.ts";

export type Base = {
  request: Request;
  operation: "read" | "write";

  path: string;
  segments: string[];

  body: Body | null;
  getBody: () => Body;

  text: typeof text<Record<string, string>>;
  json: typeof json<Record<string, string>>;
  response: typeof response<Record<string, string>>;

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

  read(
    fs: FS<C>,
    headers?: (headers: H) => H,
  ): BodyPromise<H>;

  write(
    fs: FS<C>,
    body: Body,
    headers?: (headers: H) => H,
  ): BodyPromise<H>;

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

      read: (fs, headers) => {
        const resource = fs.read(ctx.create(
          new Request(ctx.request.url, {
            ...ctx.request,
            method: "GET",
          }),
          fs,
        ));

        return headers ? resource.setHeaders(headers) : resource;
      },

      write: (fs, body, headers) => {
        const resource = fs.write(ctx.create(
          new Request(ctx.request.url, {
            ...ctx.request,
            method: "POST",
            body: body.underlying,
          }),
          fs,
        ));

        return headers ? resource.setHeaders(headers) : resource;
      },

      forward: (fs, headers) => {
        const resource = ctx.operation === "read"
          ? fs.read(ctx.create(ctx.request, fs))
          : fs.write(ctx.create(ctx.request, fs));

        return headers ? resource.setHeaders(headers) : resource;
      },
    };

    return ctx;
  };

  return extended;
};
