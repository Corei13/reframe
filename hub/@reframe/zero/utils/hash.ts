import { encodeHex } from "https://deno.land/std@0.207.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.207.0/crypto/mod.ts";

export const sha256 = async (content: string) =>
  encodeHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)),
  );
