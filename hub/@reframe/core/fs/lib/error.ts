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
