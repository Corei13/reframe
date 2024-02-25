import { Base, Ctx } from "../ctx/base.ts";
import { Body } from "../body.ts";

export class FSError extends Error {
  response: Response;

  constructor(message: string, opts: ResponseInit) {
    super(message);

    this.response = new Response(message, opts);
  }

  static notFound(message: string) {
    return new FSError(message, { status: 404 });
  }

  static notImplemented(message: string) {
    return new FSError(message, { status: 501 });
  }

  static badRequest(message: string) {
    return new FSError(message, { status: 400 });
  }

  static notAllowed(message: string) {
    return new FSError(message, { status: 405 });
  }

  static is(err: unknown): err is FSError {
    return err instanceof FSError;
  }
}

export type FS<B extends Base> = {
  name: string;
  read: (
    ctx: Ctx<B>,
  ) => Promise<Body> & Pick<Body, "text" | "json"> & {
    response: () => Promise<Response>;
    header: (key: string) => Promise<string>;
    headers: Promise<Record<string, string>>;
  };
  write: (
    ctx: Ctx<B>,
  ) => Promise<Body> & Pick<Body, "text" | "json"> & {
    response: () => Promise<Response>;
    header: (key: string) => Promise<string>;
    headers: Promise<Record<string, string>>;
  };
  use: (_: (request: Request) => Ctx<B>) => {
    fetch: (request: Request) => Promise<Response>;
  };
};

export const createFs = <B extends Base>(name: string) => ({
  read: (read: (ctx: Ctx<B>) => Promise<Body>) => ({
    write: (write: (ctx: Ctx<B>) => Promise<Body>): FS<B> => ({
      name,
      read: (ctx) => {
        const body = read(ctx);
        return Object.assign(body, {
          response: () => body.then((b) => b.response()),
          text: () => body.then((b) => b.text()),
          json: () => body.then((b) => b.json()),
          header: <K extends string>(key: string) =>
            body.then((b) => b.header(key)),
          headers: body.then((b) => b.headers),
        });
      },
      write: (ctx) => {
        const body = write(ctx);
        return Object.assign(body, {
          response: () => body.then((b) => b.response()),
          text: () => body.then((b) => b.text()),
          json: () => body.then((b) => b.json()),
          header: (key: string) => body.then((b) => b.header(key)),
          headers: body.then((b) => b.headers),
        });
      },

      use: (createCtx: (request: Request) => Ctx<B>) => ({
        fetch: (request: Request) => {
          const ctx = createCtx(request);
          const body = ctx.operation === "read" ? read(ctx) : write(ctx);
          return body.then((b) => b.response());
        },
      }),
    }),
  }),
});
