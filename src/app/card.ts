// The card for one item: head (always visible: the peek), body, end.
// The head and the end are the shell's; the body is the content framework's
// (content/, docs/design/layers.md), given the item and what the shell has
// prepared for it (content/context.ts). Pure rendering; main.ts wires the
// buttons (data-go = item number to select, data-walk = the site-initiated
// "walk on" that also collapses the sheet).

import type { Trail } from "./trail-types.ts";
import { formatDistance, type Strings } from "./strings.ts";
import { pickAudio } from "./player.ts";
import { languageRow, machineNote, textFor } from "./language.ts";
import { attr, esc } from "./html.ts";
import type { BodyRenderer, Track } from "./content/context.ts";
import { renderBody } from "./content/body.ts";

export interface CardParts {
  /** The item's audio, for the shell's player (the card's views, the lock screen). */
  track?: Track;
  head: string;
  body: string;
  end: string;
  label: string;
}

export function renderCard(trail: Trail, n: number, lang: string, s: Strings, body: BodyRenderer = renderBody): CardParts {
  const tx = textFor(trail, lang);
  const item = trail.items[n];
  const last = trail.items.length - 1;
  const next = n < last ? trail.items[n + 1] : undefined;
  const prev = n > 0 ? trail.items[n - 1] : undefined;
  const leg = n > 0 ? trail.legs.find((l) => l.from === n) : undefined;

  const badge =
    n === 0
      ? `<span class="badge badge-trail" aria-hidden="true">${trailGlyph}</span>`
      : `<span class="badge" aria-hidden="true">${n}</span>`;
  // The head is short of room: the short title where the language has one,
  // else that language's title; only a title missing in the language falls
  // back to the source's (docs/design/trail-content.md, station.json).
  const short = item.shortTitle[lang] ?? (item.title[lang] ? item.title[lang] : tx(item.shortTitle) || tx(item.title));
  const heading = n === 0 ? esc(short) : `<span class="sr">${s.station} ${n}: </span>${esc(short)}`;

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

  const label = n === 0 ? tx(item.title) : `${n} · ${tx(item.title)}`;
  const audio = pickAudio(trail, item, lang);
  // The lock screen cuts a long name off too.
  const track: Track | undefined = audio && { url: audio.url, label: n === 0 ? short : `${n} · ${short}`, art: item.images[0]?.url, synthetic: audio.synthetic };

  // Beside the title: the way to it while walking there (guide.ts fills it
  // in), the station the visitor is at instead, else the languages.
  const slot = `
    <span class="guide" hidden>${wayArrow}<span class="way-dist"></span></span>
    <button class="here-chip" data-go="" hidden><span class="here-chip-label">${s.hereChip}</span><span class="badge badge-small here-chip-n" aria-hidden="true"></span>${chevron}</button>
    ${languageRow(trail, lang, s)}`;

  const head = `
    <div class="grabber" aria-hidden="true"></div>
    <div class="title-row">
      <h1 class="title">${badge}<span class="title-text">${heading}</span></h1>
      <div class="title-slot">${slot}</div>
    </div>
    <nav class="orient" aria-label="${attr(s.stations)}">${orient}</nav>`;

  // The station list is navigation, the shell's; the overview's body places it.
  const stations =
    n === 0
      ? `<ol class="station-list">${trail.items
          .slice(1)
          .map((st) => {
            const sub = trail.stationFields.map((f) => tx(st.fields[f.key])).find(Boolean);
            return `<li><button class="station-link" data-go="${st.n}">
        <span class="badge badge-small" aria-hidden="true">${st.n}</span>
        <span><span class="station-link-title">${esc(tx(st.title))}</span>${sub ? `<span class="station-link-sub">${esc(sub)}</span>` : ""}</span>
      </button></li>`;
          })
          .join("")}</ol>`
      : "";
  const bodyHtml = body({ trail, item, lang, tx, s, track, machineNote: machineNote(trail, item, lang, s), stations });

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

  return { track, head, body: bodyHtml, end, label };
}

const chevron = `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const chevronLeft = `<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// The way to walk: guide.ts turns it to the bearing.
const wayArrow = `<svg class="way-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7 17.5-7-4.3-7 4.3z" fill="currentColor"/></svg>`;
// A waymark: a path between three posts.
const trailGlyph = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 19c3-1 4-5 8-6s5-5 8-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3.2"/><circle cx="4" cy="19" r="2.2" fill="currentColor"/><circle cx="12" cy="13" r="2.2" fill="currentColor"/><circle cx="20" cy="5" r="2.2" fill="currentColor"/></svg>`;
