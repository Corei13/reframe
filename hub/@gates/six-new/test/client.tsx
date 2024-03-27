import React, { useEffect, useState } from "npm:react@canary";

export const Button = ({ children }: { children: string }) => {
  const [color, setColor] = useState("000000");
  useEffect(() => {
    setColor(Math.floor(Math.random() * 16777215).toString(16));
  }, []);
  return (
    <button
      style={{
        backgroundColor: `#${color}`,
        color: "white",
        padding: "0.5em 1em",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
      onClick={() => {
        // random color
        const randomColor = Math.floor(Math.random() * 16777215).toString(16);
        setColor(randomColor);
      }}
    >
      {children}
    </button>
  );
};
