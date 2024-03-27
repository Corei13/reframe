type Headers = Record<string, string>;

export type Body = {
  underlying: BodyInit | null;
  headers: Record<string, string>;
  header(key: string): string | undefined;
  setHeader(key: string, value: string): Body;
  setHeaders(
    headers: Headers | ((headers: Headers) => Headers),
  ): Body;

  response(): Response;
  text(): Promise<string>;
  json<T>(pretty?: boolean): Promise<T>;

  clone(): Body;
};

export type BodyPromise<
  T = unknown,
> =
  & Promise<Body>
  & Pick<Body, "text" | "json">
  & {
    response: () => Promise<Response>;
    header(key: string): Promise<
      | string
      | undefined
    >;
    headers: () => Promise<Headers>;
    setHeader(key: string, value: string): BodyPromise<T>;
    setHeaders(
      headers: Headers | ((headers: Headers) => Headers),
    ): BodyPromise<T>;
  };

export const createBody = <T>(
  _underlying: BodyInit | null,
  headers: Headers,
): Body => {
  // we make a copy of the underlying stream so that we can clone the body
  const [underlying, copy] = _underlying instanceof ReadableStream
    ? _underlying.tee()
    : [_underlying];

  // TODO: serialize headers
  const response = new Response(underlying, { headers });

  return {
    underlying,
    headers,
    response: () => response,

    header: (key) => headers[key],

    text: () => response.text(),
    json: (pretty) =>
      !pretty
        ? response.json()
        : response.text().then((t) => JSON.stringify(JSON.parse(t), null, 2)),

    setHeader: (key, value) =>
      createBody<T>(
        underlying,
        {
          ...headers,
          [key]: value,
        },
      ),

    setHeaders: (_headers) => {
      const updates = typeof _headers === "function"
        ? _headers(headers)
        : _headers;

      return createBody<T>(
        underlying,
        {
          ...headers,
          ...updates,
        },
      );
    },

    clone: () => createBody<T>(copy ?? underlying, headers),
  };
};

export const text = <
  T = unknown,
>(
  content: string,
  headers: Headers,
) =>
  createBody<T>(content, {
    "content-type": "text/plain",
    ...headers,
  });

export const json = <
  T = unknown,
>(
  content: T,
  headers: Headers,
) =>
  createBody<T>(JSON.stringify(content), {
    "content-type": "application/json",
    ...headers,
  });

export const response = <
  T = unknown,
>(
  body: BodyInit | null,
  headers: Headers,
) => createBody<T>(body, headers);

export const createBodyPromise = <
  T = unknown,
>(
  body: Promise<Body>,
): BodyPromise<T> => {
  return Object.assign(
    body,
    {
      response: () => body.then((b) => b.response()),
      text: () => body.then((b) => b.text()),
      json: <T>(pretty?: boolean) => body.then((b) => b.json<T>(pretty)),
      header: (key: string) => body.then((b) => b.header(key)),
      headers: () => body.then((b) => b.headers),
      setHeader: (key: string, value: string) =>
        createBodyPromise(body.then((b) => b.setHeader(key, value))),
      setHeaders: (headers: Headers | ((headers: Headers) => Headers)) =>
        createBodyPromise(body.then((b) => b.setHeaders(headers))),
    },
  );
};
