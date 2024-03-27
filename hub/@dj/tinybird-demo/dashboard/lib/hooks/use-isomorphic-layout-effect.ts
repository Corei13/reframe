import { useEffect, useLayoutEffect } from "npm:react@canary";

const useIsomorphicLayoutEffect = typeof window !== "undefined"
  ? useLayoutEffect
  : useEffect;

export default useIsomorphicLayoutEffect;
