import type { Body } from "../../body.ts";

export const evaluate = async (
  content: Body,
  type: "text/javascript" | "text/typescript" = "text/javascript",
) => {
  const url = URL.createObjectURL(
    new Blob([await content.text()], { type }),
  );

  const module = await import(url);
  URL.revokeObjectURL(url);

  return module;
};
