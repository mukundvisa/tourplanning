/**
 * Sanitizes rich text HTML by removing foreign fonts, oversized font sizes, 
 * weird letter-spacing, and font tags copied from external websites.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";

  let cleaned = html
    // Remove <font> tags completely while preserving text content
    .replace(/<font[^>]*>/gi, "")
    .replace(/<\/font>/gi, "")
    // Remove inline font-family, letter-spacing, font-size, and foreign color styles
    .replace(/style\s*=\s*(['"])(.*?)\1/gi, (match, quote, styleStr) => {
      const filteredStyles = styleStr
        .split(";")
        .map((s: string) => s.trim())
        .filter((s: string) => {
          if (!s) return false;
          const lower = s.toLowerCase();
          return (
            !lower.startsWith("font-family") &&
            !lower.startsWith("font-size") &&
            !lower.startsWith("letter-spacing") &&
            !lower.startsWith("line-height") &&
            !lower.startsWith("color") &&
            !lower.startsWith("background") &&
            !lower.startsWith("background-color")
          );
        })
        .join("; ");

      return filteredStyles ? `style="${filteredStyles}"` : "";
    })
    // Clean empty spans
    .replace(/<span\s*>\s*(.*?)\s*<\/span>/gi, "$1")
    .replace(/<span\s*style\s*=\s*["']\s*["']\s*>\s*(.*?)\s*<\/span>/gi, "$1")
    // Clean empty paragraph/div tags that are just whitespace
    .replace(/<p>\s*<br\s*[\/]?>\s*<\/p>/gi, "<br/>")
    .trim();

  return cleaned;
}
