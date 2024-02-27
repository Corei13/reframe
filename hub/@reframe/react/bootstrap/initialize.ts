import { routerFs } from "@reframe/core/fs/router.ts";
import { createBaseCtx } from "@reframe/core/ctx/base.ts";
import { domFs } from "../fs/dom.ts";

const appFs = routerFs()
  .mount("/", () => domFs());

export const ctx = createBaseCtx(new Request(import.meta.path), appFs);

export const runtime = ctx.runtime(import.meta.path);

export const hydrate = async () => {
  const elements = document.querySelectorAll(
    "hydrate>script[type='reframe/hydrate']",
  );

  for (const element of elements) {
    const name = element.getAttribute("data-name");
    const path = element.getAttribute("data-path");
    const props = JSON.parse(element.getAttribute("data-props"));

    const module = await runtime.import(path);
    const { createElement } = await runtime.import("@:npm:react@canary");
    const { hydrateRoot } = await runtime.import(
      "@:npm:react-dom@canary/client",
    );

    const Component = module[name];
    const parent = element.parentElement;
    parent.removeChild(element);

    hydrateRoot(parent, createElement(Component, props));
  }
};
