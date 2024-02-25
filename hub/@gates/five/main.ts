import { add, ref as fourRef } from "@gates/four/add.ts";
import { minus, subtract } from "@gates/three/minus.ts";
import { resolve } from "@reframe/core/utils/path.ts";
import { Type } from "npm:@sinclair/typebox";

const T = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
  z: Type.Number(),
});

import * as Math from "./math.ts";
import JSON from "./json.ts";

import { ref as relativeRef } from "./path/to/ref.ts";
import { ref as absoluteRef } from "@/path/to/ref.ts";

export default function serve(request: Request) {
  return new Response(
    JSON.stringify({
      text: `Hello from ${request.url}!`,
      resolve: {
        "specifier": "bundle:../../core/utils/path.ts",
        "importer": "npm:@reframe/core/main.ts",
        "resolved": resolve(
          "bundle:../../core/utils/path.ts",
          "npm:@reframe/core/main.ts",
        ),
      },
      type: relativeRef.object({
        type: relativeRef.literal("object"),
        properties: relativeRef.record(
          relativeRef.enum([
            "x",
            "y",
            "z",
          ]),
          relativeRef.object({
            type: relativeRef.literal("number").transform((x) =>
              x.toUpperCase()
            ),
          }),
        ),
        required: relativeRef.array(relativeRef.string()),
      }).parse(T),
      ref: {
        value: relativeRef,
        "relativeRef === absoluteRef": relativeRef === absoluteRef,
        "relativeRef !== fourRef": relativeRef !== fourRef,
        "Math.ref === relativeRef": Math.ref === relativeRef,
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
