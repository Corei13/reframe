import Runtime from "@";
import { loadSync } from "https://deno.land/std@0.219.0/dotenv/mod.ts";

export const createRuntime = () => {
  return Runtime.extend({ env: loadSync() });
};
