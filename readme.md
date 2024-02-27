### Why

- end user sandboxing
  - we have the ability to ship different code/data version for individual user
- in-app editing
  - end users / ai can write code, with or without code editor
- no build step
  - we can run code as soon as it's written
- no deploy step
  - we can deploy code as soon as it's written
- point in time code snapshot
- point in time data snapshot

### Eight?

In this step, we pass @gates/sever, where we can render react client components.
For this, we create `reactClientFs`, which transforms exported react component
from a source file into another component that not only renders the original
component in the server, but also embed the code for it to be able to used in
the browser.

For example, if the original source was

```tsx
// path/to/components.ts
export const A = (props) => <div>{...}</div>
export const B = (props) => <div>{...}</div>
```

then the transform would be

```tsx
// react-client:/path/to/components.ts
import * as components from "..:/path/to/components.ts";
export const A = createSlot(A);
export const B = createSlot(B);
```

Where the `createSlot` function looks something like,

```tsx
import Runtime from "@";

export async function Module(
  { specifier }: { specifier: string; },
) {
  if (Runtime.hydrate.bundle.includes(specifier))
    return null;
  }

  const response = await Runtime.source(specifier);

  const imports =
    response.headers.get("x-fs-unmodule-imports")?
      .split(",").filter((s) => s.length > 0) ?? [];

  return (
    <>
      {imports.map((specifier) => <Module specifier={specifier} load={load} />)}
      <script
        type={"reframe/module"}
        {...Object.fromEntries(
          Array.from(response.headers.entries())
            .filter(([key]) => ["x-fs-transpiler-imports"].includes(key))
            .map(([key, value]) => [
              `data-header-${key}`,
              value,
            ]),
        )}
        data-path={specifier}
        dangerouslySetInnerHTML={{
          __html: await response.text(),
        }}
      />
    </>
  );
}


const createSlot = <P,>(
  Component: React.ComponentType<P>,
  { name, path }: { name: string; path: string; }
) => {
    return (props: P) => {
      return (
        <> 
        <hydrate style={{ display: "contents" }}>
          <script
            type="reframe/hydrate"
            data-name={name}
            data-props={JSON.stringify(props)}
          />
          <Component {...props} />
        </hydrate>
          <Module specifier={path} />
          </>
      );
    };
  };
```

### What

- FS
- Hook
  - FS<UInt8Array, Record<string, string>>
  - A hook in FS that serves a collection of static assets (code, images, text,
    etc)
- Org
  - A collection of hooks
- Registry
  - A collection of orgs

### Architecture

Everything is an FS.

An FS is something that can be read from and written to. It can be a file, a
directory, a network socket, a database, a web service, etc. It can be anything
that can be read from and written to.

### Path to production

- [version]--[hook]--[org].reframe.so <@reframe/router>
  - routes to @org/hook@version

- v1
  - reframe.so [landing page] <@reframe/website/landing.tsx>
  - registry.reframe.so [shows all orgs] <@reframe/build/registry.ts>
    - @create [create a new org]
  - [org].reframe.so [shows all hooks] <@reframe/build/org.ts>
    - @create [create a new hook]
  - [hook]--[org].reframe.so/~editor [shows all code in the hook]
    <@reframe/build/hook.ts>
    - @create [create a new file]
    - @edit [edit a file]
    - @delete [delete a file]
    - @deploy [deploy any module from the hook]

### User Journey

Initially, we create a Registry with a single Org for @reframe. We will have

- registry.reframe.so
  - this will list all the orgs in the registry
- create.reframe.so
  - this will be an app that will create a new org, accessible at
    [org].reframe.so, the org will be public
- [org].reframe.so
  - this will list all the hooks in the org, and will allow to create new hooks
  - when a new hook is created, it will be accessible at
    [hook]--[org].reframe.so
  - org can also have databases and deployments
- [hook]--[org].reframe.so
  - this will be the hook editor, where we can view hook code (read only
    initially)
  - the code will be stored in the [org] FS
  - if published, the code will be versioned and can be accessed from the
    registry
  - how to do local development
    - local is just a mirror of the org
    - we can run it fully locally, including the db
    - and do both push and pull to the org (eg: reframe pull/push @org/hook)
  - what about cache
    - cache are also code, as much as the code is
  - how to store data
    - we create a blob fs in the db, with following tables
      - Blobs
        - hash
        - content
      - Files
        - path
        - hash
        - headers
    - then we can store an either manifest/graph as a blob or rows in the db
  - what does the path forward look like
    - react server components
      - say there's a hook that exports a server component, which doesn't
        necessarily contain the full html
      - we should be able to get the html, and slot it into another app, and
        even stream it with <Suspense>
      - how about client components?
        - same as how it works here now

### Feb 26

- tailwind

```ts
// a.tsx

export const App = () => <div css="justify-content items-center" />

// tailwind:a.tsx

justify-content items-center

// tailwind:b.tsx

bg-red-500 text-white justify-content items-center


// postcss:entry.tsx
```

- [1h] cache-fs
- [1.5h] blob fs
- [1.5h] deployment
- [1.5h] <hook>

- create <Hook src="url" />
  - if invoked in the browser, it will fetch the initial html from the url, and
    inject it into the dom
  - if invoked in the server, it will fetch the initial html from the url, and
    return it as a string
  - figure out why suspense chunks are not working, we probably need to inject
    the scripts at the end of the html - at worst, we can send data as server
    sent stream, which is probably what should should do

- goal
  - create <Hook.Server> that we can put in nextjs
  - create <Hook.Client> that we can put in nextjs

- [] move fs'es to @reframe/fs
- [] add color to log
- [] deployFS
  - [1] setup wildcard subdomain
  - [1] READ /domain { deployment details }
  - [1] WRITE /domain { ... } [package] and deploy to domain
  - [1] READ / { deployed domains }
  - [2] test
- [] eventFs
- [] hmr
  - [] client can listen for file changes
  - [] implement hmrFs on browser
- [] reactActionFs
- [] editor
- [] git in editor

### Questions

- how to support jsx elements in client components props
  - how to serialize/deserialize jsx elements
  - how to serialize/deserialize async/server elements
- how to implement test framework, for functions, components, macros and app
  flows from the ground up?
  - we want to do a great job at this if we want AI to write safe, correct code

## Apps

- excalidraw like code editor
  - with a code-walker
- macro
  - const def = zod<{name: string}>() // zod will have access to it's ast and
    can generate code on build-time, which can optionally choose to pass ast to
    runtime

## Tools

- Editor
  - analyze all errors on ast tree, and resolve them ahead of time

```
git checkout -b gates/six && cp -r @gates/six hub/@gates/six && rm -rf hub/@reframe/core && cp -r @reframe/six hub/@reframe/core && git add hub

git commit -m "gate six - react server components" && git push -f --set-upstream origin gates/six
```

```tailwind
import tailwind from "npm:tailwindcss";
import postcss from "npm:postcss";

const html = (css) => `<div class="${css}" />`;

async function serve(request) {
  const css = new URL(request.url).searchParams.get("css");
  const result = await postcss([
    tailwind({
      //...config,
      content: [{ raw: html(css), extension: "html" }],
    }),
  ]).process(
    `
    @tailwind components;
    @tailwind utilities;
    `,
    { from: undefined },
  );

  console.log(result.css);

  return new Response(
    `
// ${css}

${result.css}!
`,
    {
      headers: { "content-type": "text/plain" },
    },
  );
}
```
