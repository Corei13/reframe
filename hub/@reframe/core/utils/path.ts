export function splitPath(path: string): string[] {
  return path
    .split(/[\/\\]+/g)
    .filter((p) => p !== "" && p !== ".")
    .reduce((slice, p) => {
      if (p === "..") {
        slice.pop();
      } else {
        slice.push(p);
      }
      return slice;
    }, [] as Array<string>);
}

export function cleanPath(path: string): string {
  return "/" + splitPath(path).join("/");
}

export const splitSpecifier = (specifier: string): {
  loaders: string[];
  segments: string[];
} => {
  // TODO: (transpile:/path/to/loader):file
  const parts = specifier.split(":");
  const path = parts.pop()!;
  const segments = path.split("/").filter(Boolean);
  while (segments[0]?.startsWith("~")) {
    parts.push(segments.shift()!.slice(1));
  }
  return {
    loaders: parts,
    segments,
  };
};

export const joinSpecifier = (
  loaders: string[],
  segments: string[],
): string => {
  return (loaders.length === 0 ? "" : loaders.join(":") + ":") +
    segments.join("/");
};

export const mergeSpecifiers = (a: string, b: string) => {
  const mergeLoaders = (a: string[], b: string[]): string[] => {
    if (b[0] === "/") {
      return b.slice(1);
    }

    while (b[0] === "..") {
      a.pop();
      b.shift();
    }

    return [...a, ...b];
  };

  const mergeSegments = (a: string[], b: string[]): string[] => {
    if (b[0] === "." || b[0] === "..") {
      a.pop(); // remove the file name

      for (const segment of b) {
        if (segment === "..") {
          if (a.length === 0) {
            throw new Error(`Invalid specifier: ${b}`);
          }

          a.pop();
        } else if (segment !== ".") {
          a.push(segment);
        }
      }

      return a;
    }

    return b;
  };

  const A = splitSpecifier(a);
  const B = splitSpecifier(b);

  return joinSpecifier(
    mergeLoaders(A.loaders, B.loaders),
    mergeSegments(A.segments, B.segments),
  );
};

export const absolute = (specifier: string): string => {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    throw new Error(`Expected a normalized specifier: ${specifier}`);
  }

  const parts = splitSpecifier(specifier);
  return cleanPath(
    "/" + parts.loaders.map((l) => "~" + l).join("/") + "/" +
      parts.segments.join("/"),
  );
};

export const resolve = (specifier: string, referrer: string): string => {
  return absolute(mergeSpecifiers(referrer, specifier));
};
