import React, { Suspense } from "npm:react@canary";
import { Button } from "react-client:./client.tsx";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Box = async (
  { ms, text, children }: {
    ms: number;
    text: string;
    children: React.ReactNode;
  },
) => {
  await wait(ms);

  return (
    <div
      style={{
        border: "1px solid black",
        padding: "1em",
        display: "flex",
        gap: "1em",
        flexDirection: "row",
      }}
    >
      <div
        style={{
          color: "blue",
          fontSize: "1.5em",
          marginBottom: "0.5em",
        }}
      >
        <Button>
          {text}
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <Suspense>
      <Box ms={2000} text="R">
        <Suspense>
          <Box ms={1000} text="A">
            <Suspense>
              <Box ms={1000} text="A1">
              </Box>
              <Box ms={2000} text="A2">
              </Box>
            </Suspense>
          </Box>
          <Box ms={500} text="B">
            <Suspense>
              <Box ms={1000} text="B1">
              </Box>
              <Box ms={3000} text="B2">
              </Box>
            </Suspense>
          </Box>
        </Suspense>
      </Box>
    </Suspense>
  );
};
