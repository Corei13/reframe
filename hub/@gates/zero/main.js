export default function (request) {
  return new Response(`Hello from ${request.url}!`, {
    headers: { "content-type": "text/plain" },
  });
}
