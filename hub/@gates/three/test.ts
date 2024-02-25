export const x = 1;

export const {
  y,
  z: { z1, z2: z3 },
  a: [a1, a2],
} = {
  y: "y",
  z: { z1: "z1", z2: "z2-3" },
  a: ["a1", "a2"],
};

export * from "npm:zod";
