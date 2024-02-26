import React, { Suspense } from "npm:react@canary";
const isBrowser = () =>
  typeof window !== "undefined" && "location" in window &&
  window.location !== undefined;

export const Hook = async ({ src }: { src: string }) => {
  if (isBrowser()) {
    throw new Error("Hook can only be used on the server");
  }

  const response = await fetch(src);

  return (
    <slot
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: await response.text() }}
    />
  );
};
