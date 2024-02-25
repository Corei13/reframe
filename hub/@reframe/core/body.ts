export type Body<
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
> = {
  headers: H;
  header<K extends keyof H>(key: K): H[K];
  response(): Response;
  text(): Promise<string>;
  json(): Promise<T>;
};

export const text = <
  H extends Record<string, string> = Record<string, string>,
  T = unknown,
>(
  content: string,
  headers: H,
): Body<H, T> => {
  return {
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
    headers,
    header: (key) => headers[key],
    response: () => response,
    text: async () => response.text(),
    json: async () => response.json(),
  };
};
