import React from "npm:react@canary";

export const Button = (props: { children: React.ReactNode }) => {
  return <button>{props.children}</button>;
};

export const Text = (props: { children: React.ReactNode }) => {
  return <p>{props.children}</p>;
};
