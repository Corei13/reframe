import React from "npm:react@canary";
import { Button, install, Y } from "npm:@retune.so/sdk@latest/ui";
import confetti from "npm:canvas-confetti@1.6.0";

export type File = {
  path: string;
  name: string;
  content: string;
};

if (typeof document !== "undefined") {
  install(document.body);
}

export const Files = ({ files }: { files: File[] }) => {
  const [selected, setSelected] = React.useState(files[0].path ?? "");

  const selectedFile = files.find((file) => file.path === selected);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
      }}
    >
      <div
        style={{
          flexDirection: "column",
          display: "flex",
          maxWidth: 240,
        }}
      >
        <h1>Files (v11)</h1>

        <Y>
          <Button>Click me</Button>
        </Y>

        {files.map((file) => (
          <div
            onClick={() => setSelected(file.path)}
            style={{
              background: selected === file.path ? "lavender" : "white",
              padding: 10,
            }}
          >
            {file.path}
          </div>
        ))}
      </div>

      {selectedFile && (
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <button
            onClick={() => {
              confetti();
              save(
                selectedFile.path,
                selectedFile.content,
              );
            }}
          >
            save!!!
          </button>
          <textarea
            key={selectedFile.path}
            defaultValue={selectedFile.content}
            onChange={(event) => {
              selectedFile.content = event.target.value;
            }}
            style={{
              backgroundColor: "#f5f5f5",
              fontFamily:
                "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
              width: "100%",
              height: "100%",
              maxHeight: "min(800px, 90vh)",
            }}
          />
        </div>
      )}
    </div>
  );
};
