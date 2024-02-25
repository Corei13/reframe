export default function (request: Request) {
  return new Response(`Hello from ${request.url}!`, {
    headers: { "content-type": "text/plain" },
  });
}
