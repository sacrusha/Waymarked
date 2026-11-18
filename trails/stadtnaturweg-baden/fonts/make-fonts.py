"""Makes the trail's web fonts, Waymarked Heros, from TeX Gyre Heros.

Purpose: a free stand-in for the print's Helvetica Neue where the device
doesn't have it (docs/design/brand.md). The fonts are a Derived Work of TeX
Gyre Heros under the GUST Font License; README-waymarked-heros.txt says what
changes and why, MANIFEST-waymarked-heros.txt lists the files.

Usage: python make-fonts.py <folder with the TeX Gyre Heros .otf files>
Needs fontTools and brotli (pip install fonttools brotli). Writes the .woff2
files next to this script.
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = "Waymarked Heros"
# Each font carries its own notice, as the site serves the fonts without the README.
CHANGES = ("Modified version of TeX Gyre Heros 2.004: renamed, subset to Latin "
           "and converted to WOFF2 for the Waymarked trail site; outlines and metrics "
           "unchanged. Not supported by GUST or the TeX Gyre authors. Original: "
           "https://ctan.org/pkg/tex-gyre-heros")
LICENSE = "GUST Font License 1.0: distributed and/or modified under the LaTeX Project Public License 1.3c or later."
LICENSE_URL = "http://tug.org/fonts/licenses/GUST-FONT-LICENSE.txt"

# source file -> (output file, style name, weight class, italic)
CUTS = {
    "texgyreheros-regular.otf": ("waymarked-heros-regular.woff2", "Regular", 400, False),
    "texgyreheros-italic.otf": ("waymarked-heros-italic.woff2", "Italic", 400, True),
    "texgyreheros-bold.otf": ("waymarked-heros-bold.woff2", "Bold", 700, False),
    "texgyreheros-bolditalic.otf": ("waymarked-heros-bolditalic.woff2", "Bold Italic", 700, True),
}

# Latin for German, French, English and the species' Latin names, with the
# punctuation, currency and arrows the texts and the engine use.
UNICODES = [*range(0x20, 0x7F), *range(0xA0, 0x180), 0x131, 0x152, 0x153, 0x2C6, 0x2DA, 0x2DC,
            *range(0x2010, 0x2028), *range(0x2030, 0x203B), 0x2044, 0x20AC, 0x2122,
            *range(0x2190, 0x2194), 0x2212]


def rename(font: TTFont, style: str) -> None:
    """Gives the font its own name (the GUST licence's request) and a notice of the changes (LPPL 6a, 6b)."""
    name = font["name"]
    ps = (FAMILY + "-" + style).replace(" ", "")
    version = (name.getDebugName(5) or "") + "; Waymarked subset"
    values = {1: FAMILY, 2: style, 3: ps + ";waymarked", 4: f"{FAMILY} {style}", 5: version, 6: ps,
              10: CHANGES, 13: LICENSE, 14: LICENSE_URL}
    for nid in (*values, 16, 17, 18):
        name.removeNames(nameID=nid)
    for nid, v in values.items():
        name.setName(v, nid, 3, 1, 0x409)
        name.setName(v, nid, 1, 0, 0)
    if "CFF " in font:
        cff = font["CFF "].cff
        cff.fontNames = [ps]
        top = cff.topDictIndex[0]
        top.FullName = f"{FAMILY} {style}"
        top.FamilyName = FAMILY
        top.Notice = CHANGES


def main(src: Path) -> None:
    out = Path(__file__).parent
    for source, (target, style, weight, italic) in CUTS.items():
        font = TTFont(src / source)
        assert font["OS/2"].usWeightClass == weight, (source, font["OS/2"].usWeightClass)
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.notdef_outline = True
        opts.flavor = "woff2"
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=UNICODES)
        sub.subset(font)
        rename(font, style)
        missing = sorted(u for u in UNICODES if u not in font.getBestCmap())
        font.flavor = "woff2"
        font.save(out / target)
        print(f"{target}: {(out / target).stat().st_size // 1024} KB",
              f"missing {' '.join(f'U+{u:04X}' for u in missing)}" if missing else "")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
