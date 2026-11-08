Waymarked Heros
===============

The trail site's stand-in for the print's Helvetica Neue on devices that
don't have it installed (docs/design/brand.md). It is a modified version of
TeX Gyre Heros, not the original, and is released under the same licence,
the GUST Font License (GUST-FONT-LICENSE.txt, LPPL 1.3c or later).

Original work
-------------
TeX Gyre Heros 2.004, by B. Jackowski and J.M. Nowacki for the TeX users
groups (GUST e-foundry), based on URW Nimbus Sans L. The complete, unmodified
fonts are at:
  https://ctan.org/pkg/tex-gyre-heros
  https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
We thank the authors and GUST for making them free.

Changes
-------
Made by make-fonts.py from the four OpenType files texgyreheros-regular,
-italic, -bold and -bolditalic.otf:
- Renamed to "Waymarked Heros", files renamed to waymarked-heros-*.woff2,
  as the GUST Font License requests of derived works.
- Subset to Latin (Basic Latin, Latin-1, Latin Extended-A, a few spacing
  accents), general punctuation, the euro and trade mark signs, four
  arrows and the minus sign. All OpenType features are kept.
- Converted to WOFF2.
- A notice of these changes and where to get the original added to each
  font's description (name ID 10) and CFF Notice, and the licence to its
  licence fields (name IDs 13, 14), as the site serves the fonts without
  this README; the version string ends "; Waymarked subset". The original
  copyright notice is kept unchanged.
The glyph outlines and metrics are not changed.

Support
-------
GUST and the authors of TeX Gyre do not support this version. Problems with
it belong to the Waymarked project, not to them.
