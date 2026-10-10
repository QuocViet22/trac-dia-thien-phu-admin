/** The object that holds an imported HTML file and its code. */
export interface HtmlFileData {
  name: string;
  size: number; // bytes
  lastModified: number; // ms since epoch
  html: string; // the raw HTML code
}

export const MAX_HTML_CHARS = 100000; // max length of the HTML code
const MAX_READ_BYTES = 1024 * 1024; // safety guard so huge files are never read into memory

const tooLongMessage = (chars?: number) =>
  `That file is too long${chars ? ` (${chars} characters)` : ""}. HTML can be up to ${MAX_HTML_CHARS} characters.`;

export class HtmlFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HtmlFileError";
  }
}

/** Reads a File and returns an HtmlFileData object. Throws HtmlFileError on bad input. */
export async function readHtmlFile(file: File): Promise<HtmlFileData> {
  const isHtml = /\.html?$/i.test(file.name) || file.type === "text/html";
  if (!isHtml) {
    throw new HtmlFileError("That file isn't HTML. Choose a .html or .htm file.");
  }
  if (file.size > MAX_READ_BYTES) {
    throw new HtmlFileError(tooLongMessage());
  }
  let html: string;
  try {
    html = await file.text();
  } catch {
    throw new HtmlFileError("Couldn't read that file. Try again.");
  }
  if (html.length > MAX_HTML_CHARS) {
    throw new HtmlFileError(tooLongMessage(html.length));
  }
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    html,
  };
}

/** Builds the same object from a plain string (e.g. pasted code or an API response). */
export function htmlFromString(html: string, name = "pasted.html"): HtmlFileData {
  if (html.length > MAX_HTML_CHARS) {
    throw new HtmlFileError(tooLongMessage(html.length));
  }
  return {
    name,
    size: new Blob([html]).size,
    lastModified: Date.now(),
    html,
  };
}

/** Lenient version for prefilling previews: blank or over-long HTML yields null. */
export function htmlFileOrNull(description: string): HtmlFileData | null {
  if (!description.trim()) return null;
  try {
    return htmlFromString(description, "description.html");
  } catch {
    return null;
  }
}
