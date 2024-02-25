import { json, response, text } from "../body.ts";
import { FSError } from "../fs/fs.ts";
import { cleanPath, splitPath } from "../utils/path.ts";
import type { Body } from "../body.ts";

export type Base = {
  request: Request;
  operation: "read" | "write";

  path: string;
  segments: string[];

  body: Body | null;

  text: typeof text;
  json: typeof json;
  response: typeof response;

  badRequest: (message: string) => FSError;
  notFound: (message: string) => FSError;
  notImplemented: (message: string) => FSError;
  notAllowed: (message: string) => FSError;
};

export type Ctx<B extends Base> = B & {
  create: (request: Request) => Ctx<B>;
  cd: (path: string | ((_: string) => string)) => Ctx<B>;
};

export type BaseCtx = Ctx<Base>;

const extendCreator = <B extends Base>(
  create: (request: Request) => B,
) => {
  const extended: (request: Request) => Ctx<B> = (request) => {
    const base = create(request);
    return {
      ...base,
      create: extended,
      cd: (path: string | ((_: string) => string)) => {
        const newPath = cleanPath(
          typeof path === "function" ? path(base.path) : path,
        );

        return extended(
          new Request(new URL(newPath, request.url).toString(), request),
        );
      },
    };
  };

  return extended;
};

export const createBaseCtx = extendCreator<Base>((
  request: Request,
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
  };
});
