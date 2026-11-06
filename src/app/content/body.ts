// The content framework's card body (docs/design/layers.md): the blocks a
// trail's data fills in. Station: the sign row, the machine-translation note
// and the player, the fields, the text, the photos. Item 0: the cover, the
// subtitle, the text, the facts, the station list (the shell's), photos,
// links, publisher and footer. A trail's theme.css restyles these classes.

import type { Image, Item, Localized, Logo } from "../trail-types.ts";
import { formatDistance, formatMinutes, type Strings } from "../strings.ts";
import { attr, esc } from "../html.ts";
import type { BodyContext } from "./context.ts";
import { renderPlayer } from "./player-view.ts";

export function renderBody(ctx: BodyContext): string {
  // What opens the text: a machine translation says so, then the player.
  const aside = ctx.machineNote + (ctx.track ? renderPlayer(ctx.track, ctx.s) : "");
  return ctx.item.n === 0 ? overviewBody(ctx, aside) : stationBody(ctx, aside);
}

function stationBody(ctx: BodyContext, aside: string): string {
  const { trail, item, tx, s } = ctx;
  const fields = trail.stationFields
    .filter((f) => tx(item.fields[f.key]))
    .map((f) => `<div class="field"><dt>${esc(tx(f.label))}</dt><dd>${esc(tx(item.fields[f.key]))}</dd></div>`)
    .join("") + toEnd(ctx);
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

/**
 * The walking time from this station to the last, at the pace of item 0's:
 * a visitor who joins mid-trail, or walks it the other way, derives their own
 * from it and the total. None at the last station or where legs lack times.
 */
function toEnd({ trail, item, s }: BodyContext): string {
  const last = trail.items.length - 1;
  const legs = trail.legs.filter((l) => l.from >= item.n);
  if (item.n >= last || !legs.length || legs.some((l) => l.minutes === undefined)) return "";
  const minutes = legs.reduce((sum, l) => sum + l.minutes!, 0);
  return `<div class="field"><dt>${esc(s.walkTimeTo.replace("{n}", String(last)))}</dt><dd>${s.approx} ${formatMinutes(minutes, 5)}</dd></div>`;
}

function overviewBody(ctx: BodyContext, aside: string): string {
  const { trail, item, lang, tx, s } = ctx;
  const facts: [string, string][] = [];
  if (trail.length) facts.push([s.length, `${s.approx} ${formatDistance(trail.length, lang, s)}`]);
  if (tx(trail.duration)) facts.push([s.duration, esc(tx(trail.duration))]);
  else if (trail.minutes !== undefined)
    facts.push([s.walkTime, `${s.approx} ${formatMinutes(trail.minutes, 5)} <span class="field-note">${s.walkTimeHow}</span>`]);
  facts.push([s.start, `1 · ${esc(tx(trail.items[1].title))}`]);
  if (tx(trail.gettingThere)) facts.push([s.gettingThere, esc(tx(trail.gettingThere))]);

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
    ${ctx.stations}
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
