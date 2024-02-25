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
