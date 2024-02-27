export type Body<
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
> = {
  underlying: BodyInit | null;
  headers: H;
  header<K extends keyof H>(key: K): H[K];
  setHeader<K extends keyof H>(key: K, value: H[K]): Body<H, T>;
  setHeaders(
    headers: H | ((headers: H) => H),
  ): Body<H, T>;

  response(): Response;
  text(): Promise<string>;
  json(): Promise<T>;

  clone(): Body<H, T>;
};

export type BodyPromise<
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
> =
  & Promise<Body<H, T>>
  & Pick<Body<H, T>, "text" | "json">
  & {
    response: () => Promise<Response>;
    header<K extends keyof H>(key: K): Promise<H[K]>;
    headers: () => Promise<H>;
    setHeader<K extends keyof H>(key: K, value: H[K]): BodyPromise<H, T>;
    setHeaders(
      headers: H | ((headers: H) => H),
    ): BodyPromise<H, T>;
  };

const createBody = <H extends Record<string, string>, T>(
  _underlying: BodyInit | null,
  headers: H,
): Body<H, T> => {
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
    json: () => response.json(),

    setHeader: (key, value) =>
      createBody<H, T>(
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

      return createBody<H, T>(
        underlying,
        {
          ...headers,
          ...updates,
        },
      );
    },

    clone: () => createBody<H, T>(copy ?? underlying, headers),
  };
};

export const text = <
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
>(
  content: string,
  headers: H,
) =>
  createBody<
    H,
    T
  >(content, {
    "content-type": "text/plain",
    ...headers,
  });

export const json = <
  T = unknown,
  H extends Record<string, string> = Record<string, string>,
>(
  content: T,
  headers: H,
) =>
  createBody<H, T>(JSON.stringify(content), {
    "content-type": "application/json",
    ...headers,
  });

export const response = <
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
>(
  body: BodyInit | null,
  headers: H,
) => createBody<H, T>(body, headers);

export const createBodyPromise = <
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
>(
  body: Promise<Body<H, T>>,
): BodyPromise<H, T> => {
  return Object.assign(
    body,
    {
      response: () => body.then((b) => b.response()),
      text: () => body.then((b) => b.text()),
      json: () => body.then((b) => b.json()),
      header: <K extends keyof H>(key: K) => body.then((b) => b.header(key)),
      headers: () => body.then((b) => b.headers),
      setHeader: <K extends keyof H>(key: K, value: H[K]) =>
        createBodyPromise(body.then((b) => b.setHeader(key, value))),
      setHeaders: (headers: H | ((headers: H) => H)) =>
        createBodyPromise(body.then((b) => b.setHeaders(headers))),
    },
  );
};
