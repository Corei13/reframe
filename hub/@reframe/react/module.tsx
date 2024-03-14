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

  const imports = response.header("x-fs-runnable-imports")?.split(",").filter(
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

export async function Style(
  { path }: { path: string },
) {
  const response = await Reframe.hydrate.server.getOnce(path);

  if (!response) {
    return null;
  }

  return (
    <>
      <script
        type={"reframe/style"}
        data-path={path}
        dangerouslySetInnerHTML={{
          __html: await response.text(),
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // add the tw:module as style
            const script = document.querySelector('script[type="reframe/style"][data-path="${path}"]');
            console.log("style", script);

            const style = document.createElement("style");
            style.innerHTML = script.innerHTML;
            document.head.appendChild(style);
            script.remove();
          `,
        }}
      />
    </>
  );
}
