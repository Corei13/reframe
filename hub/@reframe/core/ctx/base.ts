import { createLogger } from "../log/log.ts";
import { json, response, text } from "../body.ts";
import { cleanPath, splitPath } from "../utils/path.ts";
import { Base, extendCreator } from "./ctx.ts";
import { FSError } from "../fs/lib/error.ts";

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

    log: createLogger((log) => (...args) =>
      log(
        operation.toUpperCase(),
        `[${name}]`,
        ...args,
        `(${
          path.length <= 40 ? path : path.slice(0, 20) + "..." + path.slice(-20)
        })`,
      )
    ),
  };
});
