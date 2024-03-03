import React, { Suspense } from "npm:react@canary";
import { Module } from "./module.tsx";

export const createSlot = <P,>(Component: React.ComponentType<P>, {
  name,
  path,
}: {
  name: string;
  path: string;
}) => {
  return (props: P) => {
    return (
      <>
        <hydrate style={{ display: "contents" }}>
          <script
            type="reframe/hydrate"
            data-name={name}
            data-path={path}
            data-props={JSON.stringify(props)}
          />

          <Component {...props} />
        </hydrate>
        <Suspense>
          <Module specifier={path} />
        </Suspense>
      </>
    );
  };
};

export const createClientComponentSlots = <
  T extends Record<string, React.ComponentType<unknown>>,
>(
  path: string,
  Components: T,
): T => {
  return Object.fromEntries(
    Object.entries(Components).map(([name, Component]) => [
      name,
      createSlot(Component, { name, path }),
    ]),
  ) as T;
};
