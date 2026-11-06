// The card for one item: head (always visible: the peek), body, end.
// Pure rendering; main.ts wires the buttons (data-go = item number to select,
// data-walk = the site-initiated "walk on" that also collapses the sheet).

import type { Image, Item, Localized, Logo, Trail } from "./trail-types.ts";
import { formatDistance, type Strings } from "./strings.ts";
import { peekPlay, pickAudio, renderPlayer } from "./player.ts";
import { machineNote } from "./language.ts";

export interface CardParts {
  head: string;
  body: string;
  end: string;
  label: string;
}

export function renderCard(trail: Trail, n: number, lang: string, s: Strings): CardParts {
  const tx = (l: Localized | undefined) => (l ? l[lang] ?? l[trail.languages[0]] ?? "" : "");
  const item = trail.items[n];
  const last = trail.items.length - 1;
  const next = n < last ? trail.items[n + 1] : undefined;
  const prev = n > 0 ? trail.items[n - 1] : undefined;
  const leg = n > 0 ? trail.legs.find((l) => l.from === n) : undefined;

  const badge =
    n === 0
      ? `<span class="badge badge-trail" aria-hidden="true">${trailGlyph}</span>`
      : `<span class="badge" aria-hidden="true">${n}</span>`;
  const heading = n === 0 ? esc(tx(item.title)) : `<span class="sr">${s.station} ${n}: </span>${esc(tx(item.title))}`;

  let orient: string;
  if (n === 0) {
    const first = trail.items[1];
    orient = `
      <span class="orient-info">${trail.items.length - 1} ${s.stations}${trail.length ? ` · ${s.approx} ${formatDistance(trail.length, lang, s)}` : ""}</span>
      <button class="go go-next" data-go="1" data-live="" aria-label="${attr(`${s.startAt} ${s.station} 1: ${tx(first.title)}`)}">
        <span>${s.startAt} <b>1</b><span class="go-way"> · ${wayArrow}<span class="way-dist"></span></span></span>${chevron}
      </button>`;
  } else {
    const prevBtn = `
      <button class="go go-prev" data-go="${n - 1}" aria-label="${attr(n - 1 === 0 ? s.toOverview : `${s.prevTo} ${n - 1}: ${tx(prev!.title)}`)}">
        ${chevronLeft}<span>${n - 1 === 0 ? s.overview : n - 1}</span>
      </button>`;
    const nextBtn = next
      ? `<button class="go go-next" data-go="${n + 1}" data-live="" aria-label="${attr(`${s.nextTo} ${n + 1}: ${tx(next.title)}${leg ? `, ${formatDistance(leg.length, lang, s)}` : ""}`)}">
          <span>${s.next} <b>${n + 1}</b>${leg ? `<span class="go-leg"> · ${formatDistance(leg.length, lang, s)}</span>` : ""}<span class="go-way"> · ${wayArrow}<span class="way-dist"></span></span></span>${chevron}
        </button>`
      : `<span class="orient-info">${s.lastStation}</span>
         <button class="go go-next" data-go="0"><span>${s.overview}</span>${chevron}</button>`;
    // The overview, one tap from every card (from 1 and the last it is already prev/next).
    const overviewBtn =
      n > 1 && next
        ? `<button class="go go-overview" data-go="0" aria-label="${attr(s.overview)}" title="${attr(s.overview)}">
            ${trailGlyph}<span class="go-overview-label">${s.overview}</span>
          </button>`
        : "";
    orient = prevBtn + overviewBtn + nextBtn;
  }

  const audio = pickAudio(trail, item, lang);

  // Beside the title, what concerns this item: the way to it while walking
  // there (guide.ts fills it in), the station the visitor is at instead, or
  // listening to it, so a visitor at the sign needn't raise the sheet.
  const slot = `
    <span class="guide" hidden>${wayArrow}<span class="way-dist"></span></span>
    <button class="here-chip" data-go="" hidden><span class="here-chip-label">${s.hereChip}</span><span class="badge badge-small here-chip-n" aria-hidden="true"></span>${chevron}</button>
    ${audio ? peekPlay(s) : ""}`;

  const head = `
    <div class="grabber" aria-hidden="true"></div>
    <div class="title-row">
      <h1 class="title">${badge}<span class="title-text">${heading}</span></h1>
      <div class="title-slot">${slot}</div>
    </div>
    <nav class="orient" aria-label="${attr(s.stations)}">${orient}</nav>`;

  const player = audio ? renderPlayer(audio, n === 0 ? tx(item.title) : `${n} · ${tx(item.title)}`, item.images[0]?.url, s) : "";
  // What opens the text: a machine translation says so, then the player.
  const aside = machineNote(trail, item, lang, s) + player;
  const body = n === 0 ? overviewBody(trail, item, lang, s, tx, aside) : stationBody(trail, item, tx, s, aside);

  let end = "";
  if (next) {
    end = `<button class="walk" data-go="${n + 1}" data-walk="1">
      <span class="walk-label">${n === 0 ? s.startAt : s.next}</span>
      <span class="walk-target"><span class="walk-n">${n + 1}</span> ${esc(tx(next.title))}</span>
      <span class="walk-arrow" aria-hidden="true">→</span>
    </button>`;
  } else {
    end = `<button class="walk walk-quiet" data-go="0"><span class="walk-target">${s.toOverview}</span></button>`;
  }

  // The engine's own mark: one line, last on the overview, below the trail's.
  if (n === 0) end += `<p class="made-with">${s.madeWith} <span class="waymarked">${trailGlyph}Waymarked</span></p>`;

  return { head, body, end, label: n === 0 ? tx(item.title) : `${n} · ${tx(item.title)}` };
}

function stationBody(trail: Trail, item: Item, tx: (l?: Localized) => string, s: Strings, aside: string): string {
  const fields = trail.stationFields
    .filter((f) => tx(item.fields[f.key]))
    .map((f) => `<div class="field"><dt>${esc(tx(f.label))}</dt><dd>${esc(tx(item.fields[f.key]))}</dd></div>`)
    .join("");
  // The station named as its sign names it, so a visitor at the sign sees they have the right card.
  // The trail's mark beside it, as the signs carry it.
  const sign = tx(trail.signLabel);
  const mark = trail.mark ? `<span class="trail-mark">${logo(trail.mark, tx)}</span>` : "";
  return `
    ${sign || mark ? `<div class="sign-row">${mark}${sign ? `<p class="sign-label">${sign.replace("{n}", String(item.n))}</p>` : ""}</div>` : ""}
    ${aside}
    ${fields ? `<dl class="fields">${fields}</dl>` : ""}
    ${tx(item.body) ? `<div class="prose">${tx(item.body)}</div>` : ""}
    ${figures(item, tx, s)}`;
}

function overviewBody(trail: Trail, item: Item, lang: string, s: Strings, tx: (l?: Localized) => string, aside: string): string {
  const facts: [string, string][] = [];
  if (trail.length) facts.push([s.length, `${s.approx} ${formatDistance(trail.length, lang, s)}`]);
  if (tx(trail.duration)) facts.push([s.duration, esc(tx(trail.duration))]);
  facts.push([s.start, `1 · ${esc(tx(trail.items[1].title))}`]);
  if (tx(trail.gettingThere)) facts.push([s.gettingThere, esc(tx(trail.gettingThere))]);

  const list = trail.items
    .slice(1)
    .map((st) => {
      const sub = trail.stationFields.map((f) => tx(st.fields[f.key])).find(Boolean);
      return `<li><button class="station-link" data-go="${st.n}">
        <span class="badge badge-small" aria-hidden="true">${st.n}</span>
        <span><span class="station-link-title">${esc(tx(st.title))}</span>${sub ? `<span class="station-link-sub">${esc(sub)}</span>` : ""}</span>
      </button></li>`;
    })
    .join("");

  const links = trail.links.length
    ? `<h2>${s.links}</h2><ul class="links">${trail.links
        .map((l) => `<li><a href="${attr(l.url)}" target="_blank" rel="noopener">${esc(tx(l.label))}</a></li>`)
        .join("")}</ul>`
    : "";

  const cover = trail.cover;
  const coverCredit = cover ? [cover.credit, cover.license].filter(Boolean).join(", ") : "";
  const logos = trail.footer.logos.map((l) => logo(l, tx)).join("");
  const footerText = tx(trail.footer.text);
  // The trail's mark sits on the cover, as on a leaflet's front; without a cover, it opens item 0.
  const mark = trail.mark ? `<span class="trail-mark">${logo(trail.mark, tx)}</span>` : "";

  return `
    ${cover ? `<figure class="cover">
        <img src="${attr(cover.url)}" alt="${attr(tx(cover.alt) || tx(cover.caption) || s.photo)}"${cover.width ? ` width="${cover.width}" height="${cover.height}"` : ""} />
        ${mark}
        ${coverCredit ? `<figcaption class="photo-credits">${esc(coverCredit)}</figcaption>` : ""}
      </figure>` : mark ? `<div class="sign-row">${mark}</div>` : ""}
    ${tx(trail.subtitle) ? `<p class="lead">${esc(tx(trail.subtitle))}</p>` : ""}
    ${aside}
    ${tx(item.body) ? `<div class="prose">${tx(item.body)}</div>` : ""}
    <dl class="fields facts">${facts.map(([k, v]) => `<div class="field"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <h2>${s.stations}</h2>
    <ol class="station-list">${list}</ol>
    ${figures(item, tx, s)}
    ${links}
    ${tx(trail.publisher) ? `<p class="publisher"><span>${s.publisher}</span> ${esc(tx(trail.publisher))}</p>` : ""}
    ${logos || footerText ? `<footer class="trail-footer">
        ${logos ? `<div class="trail-logos">${logos}</div>` : ""}
        ${footerText ? `<div class="trail-footer-text">${footerText}</div>` : ""}
      </footer>` : ""}`;
}

/**
 * An item's photos as one group: the first is the lead photo, the rest are
 * insets after it, and one credits line names who took which. Each photo
 * carries data-shape (square, portrait, landscape) for a trail's stylesheet.
 */
function figures(item: Item, tx: (l?: Localized) => string, s: Strings): string {
  if (!item.images.length) return "";
  const fig = (im: Image, lead: boolean) => {
    const cap = tx(im.caption);
    const shape = !im.width || !im.height
      ? ""
      : Math.abs(im.width / im.height - 1) < 0.03 ? "square" : im.width > im.height ? "landscape" : "portrait";
    return `<figure class="photo${lead ? " photo-lead" : ""}"${shape ? ` data-shape="${shape}"` : ""}>
        <img src="${attr(im.url)}" alt="${attr(tx(im.alt) || cap || s.photo)}" loading="lazy"${im.width ? ` width="${im.width}" height="${im.height}"` : ""} />
        ${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}
      </figure>`;
  };
  const [lead, ...insets] = item.images;
  return `<div class="photos">
      ${fig(lead, true)}
      ${insets.length ? `<div class="photo-insets">${insets.map((im) => fig(im, false)).join("")}</div>` : ""}
      ${photoCredits(item.images, tx, s)}
    </div>`;
}

function logo(l: Logo, tx: (l?: Localized) => string): string {
  const img = `<img src="${attr(l.url)}" alt="${attr(tx(l.alt))}"${l.width ? ` width="${l.width}" height="${l.height}"` : ""} />`;
  return l.href ? `<a href="${attr(l.href)}" target="_blank" rel="noopener">${img}</a>` : img;
}

/** "Photos: A" when one credit covers all, else "Photos: A (caption, caption); B (caption)". */
function photoCredits(images: Image[], tx: (l?: Localized) => string, s: Strings): string {
  const each = images.map((im) => [im.credit, im.license].filter(Boolean).join(", "));
  if (!each.some(Boolean)) return "";
  let text: string;
  if (each.every((c) => c === each[0])) text = each[0];
  else {
    const byCredit = new Map<string, string[]>();
    images.forEach((im, i) => {
      if (each[i]) byCredit.set(each[i], [...(byCredit.get(each[i]) ?? []), tx(im.caption) || `${s.photo} ${i + 1}`]);
    });
    text = [...byCredit].map(([credit, caps]) => `${credit} (${caps.join(", ")})`).join("; ");
  }
  return `<p class="photo-credits">${s.photos}: ${esc(text)}</p>`;
}

const chevron = `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const chevronLeft = `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// The way to walk: guide.ts turns it to the bearing.
const wayArrow = `<svg class="way-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7 17.5-7-4.3-7 4.3z" fill="currentColor"/></svg>`;
// A waymark: a path between three posts.
const trailGlyph = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 19c3-1 4-5 8-6s5-5 8-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3.2"/><circle cx="4" cy="19" r="2.2" fill="currentColor"/><circle cx="12" cy="13" r="2.2" fill="currentColor"/><circle cx="20" cy="5" r="2.2" fill="currentColor"/></svg>`;

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function attr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}
