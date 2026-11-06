// Languages (docs/design/trail-content.md, Languages). Which language the
// site opens in, the toggle that changes it, and the note a machine
// translation carries.
//
// Changing language reloads the page: the map, the walking help and the card
// all hold the language they were built with, and a reload keeps what the
// visitor has built up (the same station, sheet position and map view are
// saved before it, main.ts), so the reload is the cheap, robust switch.

import "./language.css";
import type { Item, Localized, Trail } from "./trail-types.ts";
import type { Strings } from "./strings.ts";
import { store } from "./store.ts";
import { esc } from "./html.ts";

const KEY = "lang";
const base = (code: string | null | undefined) => (code ?? "").toLowerCase().split("-")[0];

/** A trail's texts in the language shown: where one is missing there, the source language's (docs/design/trail-content.md, Languages). */
export function textFor(trail: Trail, lang: string): (l?: Localized) => string {
  const source = trail.languages[0];
  return (l) => l?.[lang] ?? l?.[source] ?? "";
}

/**
 * The language to open in: the address's ?lang= (a link or QR code can name
 * one), else the visitor's earlier choice, else the first of the browser's
 * languages the trail has. A visitor whose languages the trail has none of
 * gets English if it has that, else the trail's own.
 */
export function pickLanguage(trail: Trail): string {
  const has = (code: string | null | undefined) => trail.languages.find((l) => l === base(code));
  const asked = has(new URLSearchParams(location.search).get("lang")) ?? has(store.get(KEY));
  if (asked) return asked;
  for (const code of navigator.languages ?? [navigator.language]) {
    const found = has(code);
    if (found) return found;
  }
  return has("en") ?? trail.languages[0];
}

/** A language's name in that language, as a visitor who reads it looks for it. */
function endonym(code: string): string {
  let name = code.toUpperCase();
  try {
    name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? name;
  } catch {
    /* an unknown code: show it as it is */
  }
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

function choose(code: string, before: () => void) {
  store.set(KEY, code);
  // An address that names a language would override the choice on reload.
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.delete("lang");
    history.replaceState(history.state, "", url);
  }
  before();
  location.reload();
}

/**
 * The language choice in the title row's slot (card.ts): the current code
 * and a ∨ ("DE ∨"), a setting of the whole site where the visitor's eye is
 * on every card. A native select lies over it, invisible, so a tap opens the
 * device's own picker, with the languages by their own names. Empty for a
 * single language.
 */
export function languageRow(trail: Trail, lang: string, s: Strings): string {
  if (trail.languages.length < 2) return "";
  const options = trail.languages
    .map((code) => `<option value="${esc(code)}" lang="${esc(code)}"${code === lang ? " selected" : ""}>${esc(endonym(code))}</option>`)
    .join("");
  return `<label class="lang-pick">
      <span class="lang-pick-code" aria-hidden="true">${esc(lang.toUpperCase())}<svg viewBox="0 0 12 12"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <select class="lang-select" aria-label="${esc(s.language)}">${options}</select>
    </label>`;
}

/**
 * The language choice in the card's head and the "read the original"
 * buttons in cards. `before` runs just ahead of the reload:
 * main.ts saves where the visitor is.
 */
export function mountLanguage(trail: Trail, lang: string, before: () => void) {
  if (trail.languages.length < 2) return;
  document.addEventListener("change", (e) => {
    const sel = (e.target as Element).closest<HTMLSelectElement>(".lang-select");
    if (sel && sel.value !== lang) choose(sel.value, before);
  });
  document.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-lang]");
    if (b?.dataset.lang && b.dataset.lang !== lang) choose(b.dataset.lang, before);
  });
}

/**
 * What a card says above a text that is a machine translation: that it is,
 * from which language, and a button back to the original. Empty for the
 * source language, for a language the trail does not list as machine
 * translated, and for an item that has nothing in the language (the card then
 * shows the source language's text).
 */
export function machineNote(trail: Trail, item: Item, lang: string, s: Strings): string {
  const source = trail.languages[0];
  if (lang === source || !trail.machineTranslated.includes(lang)) return "";
  if (!item.title[lang] && !item.body[lang]) return "";
  let from = source;
  try {
    from = new Intl.DisplayNames([lang], { type: "language" }).of(source) ?? source;
  } catch {
    /* keep the code */
  }
  return `<p class="mt-note">${esc(s.machineNote.replace("{from}", from))} <button type="button" class="mt-original" data-lang="${source}">${esc(s.readOriginal)}</button></p>`;
}
