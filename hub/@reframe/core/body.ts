export type Body<
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
> = {
  underlying: BodyInit | null;
  headers: H;
  header<K extends keyof H>(key: K): H[K];
  response(): Response;
  text(): Promise<string>;
  json(): Promise<T>;
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
  };

export const text = <
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
>(
  content: string,
  headers: H,
): Body<H, T> => {
  return {
    underlying: content,
    headers,
    header: (key) => headers[key],
    response: () =>
      new Response(content, {
        headers: {
          "content-type": "text/plain",
          ...headers,
        },
      }),
    text: async () => content,
    json: async () => JSON.parse(content),
  };
};

export const json = <
  T = unknown,
  H extends Record<string, string> = Record<string, string>,
>(
  content: T,
  headers: H,
): Body<H, T> => {
  return {
    underlying: JSON.stringify(content),
    headers,
    header: (key) => headers[key],
    response: () =>
      new Response(JSON.stringify(content), {
        headers: {
          "content-type": "application/json",
          ...headers,
        },
      }),
    text: async () => JSON.stringify(content),
    json: async () => content,
  };
};

export const response = <
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
>(
  body: BodyInit | null,
  headers: H,
): Body<H, T> => {
  const response = new Response(body, { headers });

  return {
    underlying: body,
    headers,
    header: (key) => headers[key],
    response: () => response,
    text: () => response.text(),
    json: () => response.json(),
  };
};

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
    },
  );
};
