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

### What

- FS
- Hook
  - FS<UInt8Array, Record<string, string>>
  - A hook in FS that serves a collection of static assets (code, images, text,
    etc)
- Org
  - A collection of hooks
- Hub
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

- create <Hook src="url" />
  - if invoked in the browser, it will fetch the initial html from the url, and
    inject it into the dom
  - if invoked in the server, it will fetch the initial html from the url, and
    return it as a string
  - figure out why suspense chunks are not working, we probably need to inject
    the scripts at the end of the html - at worst, we can send data as server
    sent stream, which is probably what should should do

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
