/*
 * Small text-normalization helpers shared by server routers.
 * Keeps form parsing behavior consistent without hiding business logic.
 */
export function splitLines(value?: string) {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitCommaList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitLinesAndCommas(value?: string) {
  return splitLines(value)
    .flatMap((line) => line.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function withHttps(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

export function stripProtocolAndTrailingSlash(value?: string) {
  const url = value?.trim();

  if (!url) {
    return null;
  }

  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
