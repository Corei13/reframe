import React, { Suspense, use, useState } from "https://esm.sh/react@canary";

globalThis.__webpack_require__ = (id: string) => {
  if (id === "id:C2") {
    return { C2 };
  }

  if (id === "id:C4") {
    return { C4 };
  }

  if (id === "id:C1") {
    return { C1 };
  }

  if (id === "id:C3") {
    return { C3 };
  }

  throw new Error(`Module not found: ${id}`);
};

const { renderToReadableStream } = await import(
  "https://esm.sh/react-server-dom-webpack@canary/server.edge?conditions=react-server"
);

const { renderToReadableStream: rsc } = await import(
  "https://esm.sh/react-dom@canary/server"
);

const { createFromReadableStream } = await import(
  "https://esm.sh/react-server-dom-webpack@canary/client.edge"
);

const wait = (name: string, ms: number) =>
  new Promise((resolve) => {
    // console.log(`start: ${name}`);
    setTimeout(() => {
      // console.log(`end: ${name}`);
      resolve(name);
    }, ms);
  });

/**
 * S1
 *  - S2
 *    - C2
 *      - C4
 *  - P<S3>
 *    - S2
 *    - C3
 *      - S3
 *  - C1
 */

const S1 = async ({ children }: {
  children?: React.ReactNode;
}) => {
  await wait("S1", 1000);
  return (
    <>
      <div>S1</div>
      {children}
    </>
  );
};

const S2 = ({ children }: {
  children?: React.ReactNode;
}) => {
  // console.log("S2");
  return (
    <s-2 className="s2">
      {children}
    </s-2>
  );
};

const S3 = ({ children }: {
  children?: React.ReactNode;
}) => {
  // console.log("S3");
  return <s-3>{children}</s-3>;
};

const createClient = <T extends {}>(value: T, id: string) => {
  return Object.assign(value, {
    $$typeof: Symbol.for("react.client.reference"),
    $$id: id,
  });
};

const C1 = createClient(({ children }: {
  children?: React.ReactNode;
}) => {
  const [value, setValue] = useState(10);
  // console.log("C1");
  return (
    <c-1 value={value}>
      <C2 value={value * 10} />
      {children}
    </c-1>
  );
}, "C1");

const C2 = createClient(({ value, children }: {
  value?: number;
  children?: React.ReactNode;
}) => {
  // console.log("C2");
  return (
    <c-2 value={value}>
      <p>My value is {value}</p>
      {children}
    </c-2>
  );
}, "C2");

const C3 = createClient(({ children }: {
  children?: React.ReactNode;
}) => {
  // console.log("C3");
  return <c-3>{children}</c-3>;
}, "C3");

const C4 = createClient(({ date, children }: {
  children?: React.ReactNode;
}) => {
  const value = date && use(date);

  const value1 = value && use(value.yp);
  return (
    <c-4>
      <value>{value1}</value>
      {children}
    </c-4>
  );
}, "C4");

const Stream = async ({ reader }) => {
  const { done, value } = await reader.read();
  if (done) {
    return null;
  }

  const lines = value.split("\n").filter((s) => s.length > 0);

  return (
    <>
      {lines.map((l) => <chunk data={l} />)}
      <Suspense>
        <Stream reader={reader} />
      </Suspense>
    </>
  );
};

const App = ({ self }) => {
  return (
    <Suspense fallback={<div>loading...</div>}>
      <S1>
        <S2>
          <C2>
            <C4 />
          </C2>
        </S2>
        <C1 />
        <C3>
          <Suspense fallback={<div>loading...</div>}>
            <S1>
              <C4 date={wait({ yp: wait("yo", 3000) }, 1000)} />
            </S1>
          </Suspense>
        </C3>
      </S1>
    </Suspense>
  );
};

const print = async (elem: React.ReactElement, print?: boolean) => {
  const [stream, r1] = renderToReadableStream(<App self={() => stream} />, {
    "C2": {
      name: "C2",
      id: "id:C2",
      chunks: [],
    },
    "C4": {
      name: "C4",
      id: "id:C4",
      chunks: [],
    },
    "C1": {
      name: "C1",
      id: "id:C1",
      chunks: [],
    },
    "C3": {
      name: "C3",
      id: "id:C3",
      chunks: [],
    },
  }).tee();

  // if (print) {
  //   r1.pipeTo(
  //     new WritableStream({
  //       write(chunk) {
  //         console.log(new TextDecoder().decode(chunk));
  //       },
  //     }),
  //   );
  // }

  return stream;
};

const r2 = await print(<App />, true);
const [r3, r4] = r2.tee();

const elem = await createFromReadableStream(r3, {
  ssrManifest: {},
});

const r = await rsc(
  <>
    {elem}
    {
      <Suspense>
        <Stream
          reader={r4
            .pipeThrough(new TextDecoderStream())
            .getReader()}
        />
      </Suspense>
    }
  </>,
);

const reader = r
  .pipeThrough(new TextDecoderStream())
  .getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }

  console.log(value, "\n\n");
}
