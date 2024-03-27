import Runtime from "@";
import serve from "./server.tsx";

const server = Deno.serve(
  {
    onError: (error) => {
      if (error instanceof Error) {
        return new Response(error.stack, { status: 500 });
      }

      return new Response(JSON.stringify(error), { status: 500 });
    },
  },
  serve,
);

Runtime.dev.onReload(async () => {
  await server.shutdown();
});
