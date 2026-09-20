# Fonts — what is safe to ship

Read from each file's embedded `name` table (IDs 0, 7, 13, 14) on 2026-09-21,
not from memory or from where the file was downloaded. A font with no licence
record is not a font with a permissive licence.

## Cleared — in `assets/fonts/`

Every one of these carries SIL Open Font License 1.1 in the file itself.

| file | author | note |
|---|---|---|
| `Barlow-Regular.otf` | Jeremy Tribby, 2017 | github.com/jpt/barlow |
| `CormorantGaramond-Bold.otf` | Catharsis Fonts, 2015 | |
| `LibreBaskerville-Bold.ttf` | Impallari & Fuenzalida, 2012 | |
| `Yarndings20-Regular.ttf` | Soft Type Project, 2023 | |
| `SpaceMono-{Regular,Bold,Italic,BoldItalic}.ttf` | Colophon for Google, 2016 | |

OFL 1.1 lets you use, embed, modify and redistribute these, including in a
public gallery. Two obligations: keep the copyright and licence notices, and do
not sell the fonts on their own. **Still to do:** each family ships an `OFL.txt`
in its release — drop those into `assets/fonts/` next time you touch this, since
the licence requires travelling with the files.

## Pulled — do not ship, do not import into a rewrite

| file | what the file says | verdict |
|---|---|---|
| `Futura_Heavy_font.ttf` | "Copyright 1990-1993 Bitstream Inc. All rights reserved." No licence field. 38 KB. | Commercial Bitstream Futura, subsetted. Not redistributable. |
| `BPdotsUnicaseLight.otf` | "Copyright (c) 2007 George Triantafyllakos. All rights reserved." No licence field. | Was distributed free for personal use. "All rights reserved" plus no licence means no redistribution. |
| `EgyptienneLarge-Regular.otf` | Copyright "2021". Nothing else. 6 KB. | Unknown provenance, probably a partial. Unshippable because nothing can be verified. |
| `Underodd.ttf` | "JMEverett - 3515 Apple Street, Lincoln, NE" | 1990s shareware with a postal address for registration. Needs written permission. |
| `R2-D2.otf` | copyright "licence free", licence "Free", no URL | Free-font-site novelty trading on a trademark. Fine on your own screen, not in a public gallery. |
| `iAWriterDuospace-Bold.ttf` | "(c) 2017 IBM Corp. All rights reserved." No licence field. | Almost certainly fine — iA released Duospace under OFL — but *this copy* does not say so. Re-download from github.com/iaolo/iA-Fonts, which carries the licence, or use IBM Plex Mono. |

## Replacements, all OFL

| instead of | use | why |
|---|---|---|
| Futura Heavy | **Jost\*** (indestructible type\*) | built as a Futura, geometric, same weight range. League Spartan if Jost reads too soft. |
| BPdots Unicase | **DotGothic16** or **Codystar** | both dot-matrix, both on Google Fonts, both OFL. Relevant given ckt is about dots. |
| Egyptienne Large | **Zilla Slab**, **Bitter** or **Roboto Slab** | slab serif, same job. |
| Underworld Odd | anything from Velvetyne or Collletttivo | free display foundries, properly licensed, better fit for this work than a shareware face. |
| iA Writer Duospace | **IBM Plex Mono** | what Duospace was built from. |

## Unknown, and yours to answer

`destra.otf` ("DESTRA Bold", 12 KB) and `font/destra/GPDestra-Light.otf`
("GPDestra", 18 KB) carry no copyright, no trademark and no licence at all.
Both are tiny, which usually means a custom or workshop face. If they are yours,
say so in the file and in `assets/fonts/README.md` and they are cleared. If they
came from somewhere else, they are in the same position as the pulled list.

## The rule

A font enters `assets/fonts/` or the vault as a `font` object only with a
licence record naming a permissive licence. Anything else stays outside the repo
and outside the gallery — including fonts you legitimately own a desktop licence
for, since a desktop licence almost never covers serving the file to a browser.
