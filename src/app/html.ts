// Text into HTML: the cards are built as strings (card.ts, player.ts, language.ts), and the build names the page (vite.config.ts).

/** Text as HTML content. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Text as an HTML attribute value, inside double quotes. */
export function attr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}
