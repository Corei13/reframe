export default function serve(request: Request) {
  return new Response(`Hello from ${request.url}!`, {
    headers: { "content-type": "text/plain" },
  });
}

if (import.meta.main) {
  Deno.serve({ port: 3001 }, serve);
}
