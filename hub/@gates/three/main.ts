import { add, ref as ref1 } from "./add.ts";
import { minus, subtract } from "./minus.ts";
import { Type } from "npm:@sinclair/typebox";

const T = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
  z: Type.Number(),
});

import * as Math from "./math.ts";
import JSON from "./json.ts";

import { ref } from "./ref.ts";

export default function serve(request: Request) {
  return new Response(
    JSON.stringify({
      text: `Hello from ${request.url}!`,
      type: ref.object({
        type: ref.literal("object"),
        properties: ref.record(
          ref.enum([
            "x",
            "y",
            "z",
          ]),
          ref.object({
            type: ref.literal("number").transform((x) => x.toUpperCase()),
          }),
        ),
        required: ref.array(ref.string()),
      }).parse(T),
      ref: {
        value: ref1,
        "Math/ref === ref": Math.ref === ref,
        "add/ref === ref": ref1 === ref,
      },
      add: {
        x: 10,
        y: 20,
        sum: add(10, 20),
      },
      minus: {
        x: 20,
        y: 10,
        difference: minus(20, 10),
        subtract: subtract(20, 10),
        "minus === subtract": minus === subtract,
      },
    }),
    {
      headers: { "content-type": "text/plain" },
    },
  );
}

if (import.meta.main) {
  Deno.serve(
    { port: 8080 },
    serve,
  );
}
