import Reframe from "@";
import React from "npm:react@canary";

export async function Module(
  { specifier, referrer }: { specifier: string; referrer?: string },
) {
  const resolvedPath = Reframe.resolve(specifier, referrer ?? "/");
  const response = await Reframe.hydrate.server.getOnce(resolvedPath);

  if (!response) {
    return null;
  }

  const imports = response.header("x-fs-unmodule-imports")?.split(",").filter(
    (s) => s.length > 0,
  ) ??
    [];

  const element = (
    <>
      {imports.map((path) => (
        <Module
          specifier={path}
          referrer={resolvedPath}
        />
      ))}
      <script
        type={"reframe/module"}
        data-path={resolvedPath}
        data-referrer={referrer}
        dangerouslySetInnerHTML={{
          __html: await response.text(),
        }}
      />
    </>
  );

  return referrer ? element : <modules hidden>{element}</modules>;
}
