What do I want to get done in next couple of days?

- create renderer
- get out of localhost
- create composable, excalidraw-like editor that can render UI, show console
  logs
- run mistral locally
- run mistral locally with per token loop
- run a mistral lora locally
- deploy analytics engine in retune
- have AI build a landing page
- have AI build a chatbot app

## render

```ts
renderToReadableStream: ((_: ReactElemnt) => ReadableStream<RSCPayload>);
serialize: TransformStream<RSCPayload, ReframePayload>;
deserialize: TransformStream<ReframePayload, RSCPayload>;
createFromReadableStream: ((_: ReadableStream<RSCPayload>) => ReactElement);
```

renderToReadableStream / createFromReadableStream works great. Now time for
serialize and deserialize.

Is that even the right abstraction? Because the RSCPayload already looks pretty
good tbh. Instead, we can probably just write transformers instead of our own
payload, for now.

That's what next does too.

So that's out of the way, now we need to figure out how to insert the source
codes - oh that's also pretty easy, we can do that as we are adding the chunks
to the html.

Once all these are done, the work in the frontend becomes to run the hydration.
This part is a bit confusing to me right now - when do we run the hydration? My
guess so far is that we can do this as data keeps coming in.

So here are the steps,

1. inline the rsc payload chunks in the html
2. inline the modules
3. re-create the readable stream in frontend
4. hydrate the client component

How would something like following work in a server component?

```tsx
import { Hook } from "@reframe.so/hook";

export default function App() {
  return (
    <Layout>
      <Hook src="https://remote.url/component" />
    </Layout>
  );
}
```

Let's imagine code for Hook,

```tsx
const ServerHook = async ({ src }) => {
  const response = await fetch(src);
  return createFromReadableStream(response.body);
};

const ClientHook = ({ src }) => {
  const response = use(fetch(src));
  return use(createFromReadableStream(response.body));
};

const Hook = isServer() ? ServerHook : ClientHook;

export default Hook;
```

There are a few cases,

c.c.s. use Hook in client, src contains only HTML

- nothing to do here c.s.s. use Hook in server, src contains only HTML
- nothing to do here

c.c.c. use Hook.Client in client, src sends client components

This can work in an similar way, inline the chunks and modules, with a
namespace, that can be hydrated in the client.

c.s.c. use Hook.Server in server, src sends client components

This is the tricky part, I guess - or is it? Simple question, is Hook itself a
server component or client component? ServerHook is a server component and
ClientHook is a client component. Makes sense.

Now, let's estimate. How long would it take to implement this?

1. inline the rsc payload chunks in the html - 15 minutes (just log them)
2. inline the modules - 15 minutes
3. re-create the readable stream in frontend - 30 minutes
4. hydrate the client component - 30 minutes

So, 1.5 hours. Let's see how it goes.

What could go wrong?
