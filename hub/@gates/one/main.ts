export default function serve(request: Request) {
  return new Response(`Hello from ${request.url}!`, {
    headers: { "content-type": "text/plain" },
  });
}

Deno.serve(serve);
