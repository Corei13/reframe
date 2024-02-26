```sh
$ cd hub
$ ./@reframe/core/main.ts dev serve @gates/six/~@/@/main.tsx
```

In this step, we pass `@gates/six`, where we can render react server components
exported from hooks.

To do that, we created a new library hook `@reframe/react` that exports a
`render` function from `server.ts`, which converts a react element into a
Response.

```tsx
import { render } from "@reframe/react/server.ts";

export default function (request: Request) {
  return render(<div>Hello, world!</div>);
}
```

In addition, we created two new fs,

- `httpFs`, reads remote urls
- `debugFs`, evals a module and responds with the stringified result
  - in future, we can expand this with `replFs`, which will allow us to interact
    with a module in a repl-like environment with websockets
