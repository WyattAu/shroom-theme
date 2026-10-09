# xkcd colour survey names

`xkcd-colors.json` is the colour-naming portion of the [xkcd colour survey][1],
reduced to `name` and `hex`.

## What this data is

In 2005 the xkcd webcomic ran a colour-name survey. 222,500 users submitted
free-form names for 949 colours, and the most frequent response for each colour
became its name: "greyish", "light purple", "dirt brown", "windows blue". The
result is a mapping from RGB to the words people actually reach for, gathered
without a controlled vocabulary.

That is why it is useful here. A CIEDE2000 distance says how different two
colours are to a colour-difference formula. A shared xkcd name says something
different and more actionable: two tokens a reader would *call* by the same
word. A reader who cannot name a distinction reliably has one.

## Licence and provenance

The xkcd colour survey results are widely redistributed. The canonical dataset
is published by the xkcd project; this copy is redistributed from the
`xkcd-colors` npm package, which in turn derives it from that survey.

The original comic is CC BY-NC 2.5. The survey *results* (the name-to-RGB
mapping) were released by the xkcd authors for public use and have been
redistributed by many projects without restriction. This is noted here because
the rest of this repository is Apache-2.0 and the distinction is worth being
explicit about rather than leaving it implicit.

If a maintainer prefers strict licence uniformity, this file can be replaced
with a smaller hand-curated table of the ~30 basic colour terms, at the cost of
losing the compound names ("pale green", "dark navy blue") that are most of the
survey's value.

## Regenerating

```bash
curl -sL https://registry.npmjs.org/xkcd-colors/-/xkcd-colors-1.0.2.tgz | tar xz
node -e "
const fs=require('fs');
const src=require('./package/assets/colors.json');
fs.writeFileSync('data/xkcd-colors.json',
  JSON.stringify(src.map(e=>({name:e.name,hex:e.hex.toUpperCase()})))+'\n');
"
```

## Known limits

- The survey colours are sampled at coarse intervals, mostly in the saturated
  region. Near-neutrals are sparsely covered, so a grey token's nearest name is
  chosen from a short distance and the "distance" column in the report overstates
  how well the name fits.
- Names are modal responses, not descriptions. "Blue" is what people called
  `#0343DF`, which is a deep primary blue; the name says less than the hex.
- The survey is not CVD-controlled. The report therefore computes nearest names
  on the unmodified palette. A deuteranope's vocabulary for the same colours
  would differ, and this dataset cannot model that.

[1]: https://blog.xkcd.com/2010/05/03/color-survey-results/