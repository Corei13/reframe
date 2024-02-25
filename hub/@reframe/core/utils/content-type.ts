const mimeTypes: Record<string, string[]> = {
  // application
  "application/javascript": ["js", "mjs", "ts", "mts", "tsx", "jsx"],
  // "application/typescript": ["ts", "mts"],
  "application/wasm": ["wasm"],
  "application/json": ["json", "map"],
  "application/jsonc": ["jsonc"],
  "application/json5": ["json5"],
  "application/pdf": ["pdf"],
  "application/xml": ["xml", "plist", "tmLanguage", "tmTheme"],
  "application/zip": ["zip"],
  "application/gzip": ["gz"],
  "application/tar": ["tar"],
  "application/tar+gzip": ["tar.gz", "tgz"],

  // text
  "text/html": ["html", "htm"],
  "text/markdown": ["md", "markdown"],
  "text/mdx": ["mdx"],
  "text/css": ["css"],
  "text/csv": ["csv"],
  "text/yaml": ["yaml", "yml"],
  "text/plain": ["txt", "glsl"],

  // font
  "font/ttf": ["ttf"],
  "font/otf": ["otf"],
  "font/woff": ["woff"],
  "font/woff2": ["woff2"],
  "font/collection": ["ttc"],

  // image
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/apng": ["apng"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/svg+xml": ["svg", "svgz"],
  "image/x-icon": ["ico"],

  // audio
  "audio/mp4": ["m4a"],
  "audio/mpeg": ["mp3", "m3a"],
  "audio/ogg": ["ogg", "oga"],
  "audio/wav": ["wav"],
  "audio/webm": ["weba"],

  // video
  "video/mp4": ["mp4", "m4v"],
  "video/ogg": ["ogv"],
  "video/webm": ["webm"],
  "video/x-matroska": ["mkv"],

  // shader
  "x-shader/x-fragment": ["frag"],
  "x-shader/x-vertex": ["vert"],
};

const typesMap = Object.entries(mimeTypes).reduce(
  (map, [contentType, exts]) => {
    exts.forEach((ext) => map.set(ext, contentType));
    return map;
  },
  new Map<string, string>(),
);

export function trimSuffix(s: string, suffix: string): string {
  if (suffix !== "" && s.endsWith(suffix)) {
    return s.slice(0, -suffix.length);
  }
  return s;
}

export function registerType(ext: string, contentType: string) {
  typesMap.set(ext, contentType);
}

function splitBy(
  s: string,
  searchString: string,
  fromLast = false,
): [prefix: string, suffix: string] {
  const i = fromLast ? s.lastIndexOf(searchString) : s.indexOf(searchString);
  if (i >= 0) {
    return [s.slice(0, i), s.slice(i + searchString.length)];
  }
  return [s, ""];
}

export function getContentType(filename: string): string {
  let [prefix, ext] = splitBy(filename, ".", true);
  if (ext === "gz" && prefix.endsWith(".tar")) {
    ext = "tar.gz";
  }
  return typesMap.get(ext) ?? "application/octet-stream";
}
