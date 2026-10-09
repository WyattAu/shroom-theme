# Colour science

Every colour decision in this theme is made against a measured model rather
than by eye. This document records which models, why those, and what each one
does and does not guarantee.

## The background is inside APCA's soft-clamp regime

`#24212E` has an APCA screen luminance Y of 0.0084, below APCA's black
soft-clamp threshold of 0.022. The clamp lifts it to 0.0107, a 27% increase,
before any contrast is measured.

This matters for interpreting every |Lc| figure in this document. The clamp
exists because APCA's own documentation argues that WCAG 2.x overstates
contrast for near-blacks and "cannot provide useful guidance when designing dark
mode"; it deliberately treats sub-threshold backgrounds as less dark than their
WCAG ratio implies.

The practical effect here is small and uniform. Every token's |Lc| differs by
0.9 with and without the clamp, so it shifts the reported values but changes no
ranking and no gate outcome. The values in this document are all clamp-inclusive,
matching the APCA reference implementation.

WCAG relative luminance of the same background is 0.0166. Note that this is a
different quantity from APCA's screen Y: WCAG linearises the sRGB transfer
function, APCA applies a plain 2.4 power. Both numbers are correct for their
respective models and should not be compared directly.

## Models in use

| Model | Used for | Source |
|---|---|---|
| WCAG 2.1 relative luminance | Conformance gate | W3C, normative |
| APCA Lc (APCA-W3-0.1.9) | Perceptual lightness separation | Myndex, frozen 2021-02-15 |
| CIELAB D65 | Chroma and hue bookkeeping | CIE 15:2004 |
| CIEDE2000 | Categorical colour distance | Sharma, Wu & Dalal 2005 |
| CAM16 J, M, C, h | Hue architecture, chroma budget, H-K brightness | Li et al. 2017 |
| Helmholtz-Kohlrausch `J_HK` | Chroma-driven brightness promotion | High, Green & Nussbaum 2023 |
| Machado 2009 (severity 1.0) | Protanopia / deuteranopia simulation | IEEE TVCG 15(6) |
| Brettel 1997 (sRGB-adapted) | Tritanopia simulation | JOSA A 14(10) |
| xkcd colour survey | Naming vocabulary | xkcd, 2005 |

Implementation: [`color-science.js`](../color-science.js).
Verification table: [`tests/color-science-reference.json`](../tests/color-science-reference.json).

CAM16 is validated against `colour-science` 0.4.7 across 30 colours, worst
deviation 0.04 in M and C and 0.12° in hue. Reference values are pinned in the
verification table above.

## What each metric can and cannot tell you

**WCAG 2.1** is the only normative gate here. It is a luminance ratio, so it
is blind to hue and chroma: `#E68484` (red) and `#A6C18B` (green) have nearly
identical ratios on the same background while being trivially distinguishable,
and two colours with very different ratios can be hard to tell apart.

**APCA** models perceived lightness difference and is polarity-aware: the same
grey is worth about 78 Lc on white and 35 Lc on black. That asymmetry is real
and it means a dark theme and a light theme with equal WCAG ratios are not
equally legible. APCA is used here for one specific job: separating token
colours from each other by lightness.

**Licensing.** The `apca-w3` reference implementation carries a licence
restricting use to WCAG accessibility guidelines for web content, and stating
that non-compliant implementations are a copyright violation. This project does
not ship APCA: the formula lives in `color-science.js`, transcribed from the
published constants, and is used as an internal analysis metric. Nothing in the
extension, the themes, or the documentation asserts APCA conformance, and APCA
is not a pass/fail gate — WCAG 2.1 is. That is the position here: APCA is
advisory, WCAG 2.1 is normative, and the licence is not relied on. If that is
not comfortable, `apcaAbs` and `apcaLc` can be removed and the palette audit
falls back to WCAG plus CIEDE2000 with no loss of gating coverage; the |Lc|
lightness-separation check would need replacing with a CIELAB L\* gap, which is
weaker but adequate.

APCA is **not** in WCAG 3. It was removed from the W3C SIL drafts in 2023 and
the current editor's draft states that the contrast algorithm is yet to be
determined. APCA is a candidate, not a standard. Do not describe a theme as
"WCAG 3 compliant" or "APCA compliant" on the strength of these checks.

**CIEDE2000** measures how far apart two colours are. It is used as a
diagnostic, not a gate. See the note on satisfiability below.

**CVD simulation** answers one narrow question: which of these two colours
become the same colour for someone with this deficiency. It is a collision
detector. It does not predict what any individual sees.

## The alpha bug

The audit in this repository previously discarded the alpha byte before
measuring contrast. For `#726D8980` on `#24212E` it reported 3.20:1; the
rendered result is 1.77:1. Across the seven themes this overstated 175 token
pairs per theme, including pairs reported above 9:1 that were actually below
1.3:1.

Every ratio in this project is now computed on the alpha-composited pair.
Decorative translucent tokens such as `editorIndentGuide.background` are
excluded from the gates on purpose: WCAG sets no minimum for decoration, and
making indent guides more visible than code would be a regression.

## Isoluminance

Two colours at the same lightness are distinguishable only by hue. That is
invisible to any contrast-against-background check, and it is exactly what
collapses when hue is hard to discriminate.

The dark themes shipped `#BE9AF7` (keyword) and `#82AAFF` (variable) at
identical CIELAB L\* 70.0 and identical APCA |Lc| 54.4. Under achromatopsia they
were the same colour; under deuteranopia 2.55 CIEDE2000 apart, under
protanopia 1.66.

The gate is a minimum APCA |Lc| gap of 2, which is finer than one step of
APCA's own font lookup tables.

Two classes of colour are exempt, because neither competes with a category:

- **Comments** are de-emphasis. They recede rather than compete, so they are
  held to the 3:1 that WCAG 2.2 SC 1.4.11 sets for non-text components, not to
  the 4.5:1 that applies to body text. Enforcing 4.5:1 drove the comment colour
  up into the token lightness band and made it the brightest colour in the
  palette.
- **The plain-text substrate** (`property`, `*.static`, which inherit
  `editor.foreground`) is whatever is left uncoloured. Requiring it to separate
  from every token pushed both it and the tokens toward white.

## CVD simulation runs in linear RGB

The Machado and Brettel matrices are linear operators on light. Applying them
to gamma-encoded sRGB applies them to a quantity that is not proportional to
light. Measured over a 32768-point sRGB grid, the two paths differ by a median
of 15.03 CIEDE2000, with 76% of the cube off by more than 10.

The error is invisible on pure primaries, which is why it survives a naive
spot-check. It shows up on mid-lightness pastels, which is what a syntax theme
is made of.

`tests/color-science.test.ts` pins `#BE9AF7` under protanopia to `#83ABFB`.
The gamma-space path yields `#C4D4FE`, 13.48 away.

## Simulation is a collision detector, not a depiction

Dichromat simulation is a legitimate worst case, and it is the correct tool for
finding collisions. It is not a picture of what a user sees, for reasons worth
stating plainly:

- Only about a quarter of people with colour vision deficiency are dichromats.
  The rest are anomalous trichromats, whose impairment is milder; a
  deuteranomalous observer keeps substantial red-green discrimination.
- Simulated colour does not predict perception. Independent evaluation found
  that of several popular simulators, only one tracked real dichromats, and
  that results produced by non-CVD users often differed from those produced by
  CVD users themselves.
- Individual variation is not modelled. Brettel measured four deuteranopes and
  found two with a peak at 558 nm and two at 563 nm.
- A dichromat simulator is worst-case for field size. Syntax glyphs are small,
  which is the worst case, so a palette tuned for this is tuned conservatively.

The honest framing: if a token pair is distinguishable in the CVD variants, it is
distinguishable for the milder anomalous trichromacies that make up most CVD
users. The variants do not show any user their own experience.

## The background hue is close to the neutral tokens' hue

`editor.foreground` is `#CCC8D9`, at CIELAB hue 299.9°. The background is at
300.9°, a separation of 1.0°. The comment colour `#726D89` is 2.1° away.

Schloss & Palmer (PNAS 2000) report that a surround whose spectral return is
similar to the target *reduces* the target's apparent saturation and brightness.
A 1° separation is the worst case for that effect, and it applies to the
default text colour, which is the colour a reader looks at most.

**No correction has been applied, deliberately.** The magnitude here is small:
the affected colours are near-neutral at C* = 9.2 and 16.7, so there is little
saturation to lose. More importantly, the ergonomic claim is an inference by
analogy. The chromatic-induction literature is well established, but no study
was found measuring whether a chromatic dark background changes perceived text
contrast or eye strain relative to a neutral dark of matched lightness. Rotating
or desaturating the default text colour would change the theme's identity on
the strength of a directional prediction with no measurement behind it.

What is cheap and safe: desaturating reduces the exposure, and reducing chroma
while holding hue does not move the hue at all — at C* below about 10 the hue
angle is numerically unstable and 8-bit quantisation moves it by a degree or
two either way. So the effect is not addressable by a chroma tweak, and any
real fix is a hue rotation, which is a design decision.

Recorded here rather than fixed, because the evidence does not support a
change and a silent change would look like a fix.

## The quality profile: eight more measurements

`tools/quality-profile.js` measures eight properties the contrast gates do not
cover. All are deterministic given the theme JSON; none require participants.

| # | Metric | Gated? | What it catches |
|---|---|---|---|
| 1 | Semantic consistency | dead rules only | A role painted inconsistently; an entry that can never render |
| 2 | Visual hierarchy | invariants only | Comment failing to recede; a role too quiet to read |
| 3 | Hue architecture | no | Hues collapsing onto each other; a one-hue palette |
| 4 | H-K brightness | invariants only | Chroma promoting a role past its lightness |
| 5 | Chroma budget | no | A palette that is loud rather than legible |
| 6 | Colour naming | no | Two colours a reader would call by the same word |
| 7 | Cross-variant hue | no | A role that changes hue between dark and light |
| 8 | Display degradation | invariants only | Distinguishability that only holds on a wide-gamut panel |

Only metric 1's dead-rule check is a hard gate on a measurement. The rest are
reported because a threshold on a design judgement produces false failures that
get ignored, which is worse than no threshold.

### How each metric was made honest

Most of the effort went into stopping the metrics from reporting confidently
wrong numbers. Four bugs, each of which would have survived a casual look:

**Scope resolution is longest-prefix, not last-wins.** TextMate resolves a
scope against the *most specific* matching rule. Resolving by "the last rule
that mentions it" reports every deliberate carve-out — decorators, shell pipes,
annotations, CSS units — as an inconsistency, and scored this palette at 39%
consistency when the truth is 68%. This matters more for a well-built theme
than a badly-built one: the better a theme's scope handling, the worse the
naive metric scores it.

**Gamut clipping must simulate a target, not search for the boundary.** An
early version searched for the largest in-gamut chroma and returned the
original colour, since the original is in gamut by definition. Every colour
reported zero shift. Clipping now reduces chroma to the target and searches
only when the reduced colour still falls outside sRGB, which is what a display
that cannot render a colour actually does.

**A role's colour is what the theme declares it is.** Reading the modal
resolved scope works until a role's scopes split several ways, at which point
the modal reflects which scopes happen to be enumerated. The light theme's
`variable` is the concrete case: its scopes split four ways so the modal came
out blue, while the theme's own `semanticTokenColors` entry — what VS Code
actually resolves — is magenta. Using the modal inflated the cross-variant hue
shift from 13° to 75° and would have reported a hue inconsistency that does not
exist.

**Cross-variant hue is absolute, not background-relative.** Measuring hue
relative to each variant's background is the intuitive choice and it is wrong
across a light/dark pair: the dark background is hue 296° and the light one is
117°, 179° apart. Subtracting the background hue rotates every role by an
arbitrary amount, reporting 84° of dispersion for a palette that is in fact
consistent to 6.3°. Relative hue is only meaningful between variants with
similarly-hued backgrounds.

### What the metrics found

Nothing was changed as a result. Two findings are worth recording:

- **The amber cluster already collides at full sRGB.** `#FFCB6B` (decorator,
  constant, notice) and `#E8C990` (type, substrate) sit 2.5° apart in CAM16
  hue and 7.7 CIEDE2000 apart. Reduced gamut does not cause this and the gamut
  sweep makes that explicit by showing the collision present at 100% coverage.
- **High contrast deliberately inverts the de-emphasis.** Its comment colour is
  louder than variable, keyword and invalid. That is consistent with its intent,
  but it means comment is not the quietest thing on screen in that variant, and
  every other property measured here assumes it is.

### The amber pair is not separable by rotation

`npm run whatif:amber` prices the decision. Rotating the amber family through
±40°, holding lightness and clipping chroma to gamut:

- **No rotation clears the dE00 20 categorical threshold.** The widest
  amber/cream separation reachable in gamut is 19.6, against a threshold of 20.
  This is the documented ceiling for a palette this size on one background, not
  a missed fix.
- **No rotation reduces the palette's collision count.** Every candidate that
  widens the amber/cream gap collides with something else instead. The
  rotations that come closest move amber toward the red family, where the error
  colour lives.
- **The merge option has already been taken elsewhere.** The light and
  high-contrast variants carry the same colour for both roles (`#886930` and
  `#FFD978`). So the question is not "merge or not" but "why do four variants
  differ on this" -- and there is no recorded reason.

That last point is the actual finding. The palette is inconsistent about this
pair across variants for no documented reason, and both options are already in
use. Leaving it as it is means the dark and CVD variants keep a 7.7 dE00
collision that no rotation can fix, and the light variant does not have one.
Merging in the remaining variants would make the palette self-consistent and
match what the light theme already does; it would also delete the distinction
between a keyword-adjacent constant and a type name, which is doing real work
in the dark theme. Neither choice is free, and choosing needs a judgement about
which distinction matters more to a reader -- which is a human call, not a
metric.

### What the metrics cannot tell you

**Nothing here predicts comprehension, speed, error rate or fatigue.** Every
metric is a property of the palette, not of a reader meeting it. The
Helmholtz-Kohlrausch correction in particular is a model: it is defined over
*revised* CIECAM16, and plain CAM16 is an approximation of that. It is a
diagnostic for how much chroma is doing work the lightness ladder does not
admit, not a prediction of what any individual will see.

**Colour naming inherits the survey's blind spots.** The xkcd names were
gathered from trichromats, so the dataset cannot describe a dichromat's
vocabulary. The survey colours are also sampled coarsely and skew saturated,
so near-neutrals are sparsely covered and their nearest name is fitted from a
short distance.

**Display degradation models chroma loss, not everything a cheap panel does.**
It assumes a panel preserves hue and lightness and loses saturation, which is
close to right for chroma truncation. It does not model the blue shift of
cheap TN panels, or the ambient-reflection contrast loss that Buchner and
colleagues measured.

**Cross-variant consistency has nothing to say about the CVD variants.** They
rotate hues deliberately; measuring them would report the feature working as a
defect. Monochrome has no hue to be consistent about.

## What is not guaranteed

**Mutual distinguishability under simulated CVD is not achievable for a
palette this size on one background.** A dichromat sees a two-dimensional slice
of colour space, and within that slice roughly five categorical colours is the
practical ceiling for all-pairs separation. This theme has nine distinct token
colours. Published CVD-safe references do not escape this: Okabe & Ito's
eight-colour set measures 11.1 CIEDE2000 at worst under tritanopia, Paul Tol's
high-contrast scheme manages 17.8 but has only five colours, and IBM's
colour-blind-safe set fails at 6.5 under tritanopia.

Rather than assert a guarantee the palette cannot keep, the audit reports the
closest simulated pair per theme as a diagnostic and leaves it ungated.

**Monochrome distinguishability for eight or nine colours is structurally
impossible** within a readable lightness band. Achromatopsia is also rare
enough to be a proportion question rather than a design one: rod and cone
monochromacy affect roughly 1 in 33000 to 1 in 100000 people, while anomalous
trichromacy and dichromacy together account for about 99.4% of CVD cases. The
monochrome variant is therefore a lightness ramp that preserves semantic
rank, not a palette where every token is separately identifiable.

**Lightness alone cannot fix a pair separated along the red-green axis.** The
keyword/variable pair was purple `#BE9AF7` at hue 307 against blue `#89AEFF` at
hue 281. They projected to `#5E81C8` and `#677EB3` under deuteranopia: adjacent.
Any amount of lightness adjustment left them there, because they differed only
in the dimension a dichromat cannot see.

The variable colour is now `#E794D2`, hue 335, a fixed +54° rotation from each
variant's own variable hue. Holding lightness and chroma keeps |Lc| at 56.6, so
it does not disturb the lightness separation the rest of the palette relies on.
Keyword/variable goes from 1.55 to 7.39 CIEDE2000 under dichromacy.

That is still below the 10 threshold, and it is as far as this palette can go.
Searching the full hue circle at constant lightness and chroma, every rotation
that separates the pair further lands on another token's hue: amber at +85
reaches 16.16 but sits on the constant colour at 9.02 normal-vision separation;
teal at -90 reaches 13.33 but sits on the function colour at 7.68. Pink is the
one rotation that improves the target pair while leaving every other pairwise
distance healthy, at 19.6 to its nearest neighbour. With nine token colours the
hue circle is full, and this is the structural consequence.

Fewer categories would solve it outright. Four colours separated by 30° of hue
reach 35.7 CIEDE2000 at equal lightness, against 29.9 for six and about 22 for
eight.

## The string colour cannot be usefully moved

`#A6C18B` is the most exposed colour in the palette: it appears in three of the
six worst CVD pairs, because green sits between the red and amber families that
dichromacy collapses. That made it the obvious candidate for the same hue
rotation the variable token received.

`npm run palette matrix` and `reports/string-what-if-*.md` hold the analysis.
Sweeping all 360 degrees at constant lightness and chroma:

- Only 7 of 72 candidates reduce the total number of sub-threshold pairs, and
  the best reduction is 40 to 38.
- The best rotation is +10 degrees to `#9BC392` -- a change small enough that it
  reads as the same colour.
- The dominant collision is not a string pair at all. It is
  `#E8C990` / `#CCC8D9` -- constant against plain text -- at 0.73 under
  achromatopsia. The string is not involved.

So the string colour stays where it is. The exposure is real, but the available
moves do not address it, and the dominant collision belongs to the monochrome
problem documented above rather than to anything a hue change would fix.

## Provenance and reproduction

```bash
# Regenerate the verification table. Read the diff before accepting it.
node tools/generate-color-reference.js

# Verify the implementation against it.
npm run test:unit

# Audit the palettes. Exits non-zero on any gate failure.
npm run audit:palette

# Repair the palettes. Idempotent.
npm run repair:palette
```

The reference table is transcribed from primary and independent sources:

- APCA values come from the published `apca-w3` 0.1.9 constants, frozen
  2021-02-15, so they are stable indefinitely.
- WCAG, CIELAB and CIEDE2000 values were computed with `colour-science` 0.4.7,
  an implementation independent of this one, over the same sRGB primaries.
- CVD values come from published Machado 2009 results for linear-RGB
  application, plus Brettel 1997 sRGB-adapted (via libDaltonLens) for
  tritanopia, which Machado explicitly declines to model.

One note on tolerance: CIELAB and CIEDE2000 are asserted to within 5e-5 of
`colour-science`, not to within 1e-9. The difference is that this project uses
the full-precision sRGB matrix while `colour-science` rounds to four decimals,
which shifts L\* by up to about 0.016. That is far below a just-noticeable
difference, so it is asserted as a tolerance rather than as exact equality. WCAG
and APCA are asserted exactly, since both implementations use identical
constants.

## References

- Myndex. `apca-w3` 0.1.9. <https://github.com/Myndex/apca-w3>
- W3C. *Web Content Accessibility Guidelines 2.2*, SC 1.4.3 and 1.4.11.
  <https://www.w3.org/TR/WCAG22/>
- Sharma, G., Wu, W., & Dalal, E. N. (2005). The CIEDE2000 color-difference
  formula. *Color Research & Application* 30(1), 21–30.
- Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A
  physiologically-based model for simulation of color vision deficiency.
  *IEEE TVCG* 15(6), 1291–1298.
- Brettel, H., Viénot, F., & Mollon, J. D. (1997). Computerized simulation of
  color appearance for dichromats. *JOSA A* 14(10), 2647–2655.
- Lillo, J., Álvaro, L., & Moreira, H. (2014). An experimental method for the
  assessment of color simulation tools. *Journal of Vision* 14(8), 15.
- Buchner, A. & Baumgartner, N. (2007). Text-background polarity affects
  performance irrespective of ambient illumination and colour contrast.
  *Ergonomics* 50(7), 1036–1063.
- Buchner, A., Mayr, S., & Brandt, M. (2009). Why dark mode should not be the
  default. *Ergonomics* 52(7), 882–886. Follows the 2007 polarity finding with
  a design that equates display luminance: the advantage disappears (η² < 0.01)
  while display luminance retains its effect (η² = 0.12). The penalty is a
  luminance effect, not a polarity effect.
- Piepenbrock, S., Mayr, S., & Buchner, A. (2014). Display luminance and
  polarity: are they truly separable factors in visual fatigue?
  *Ergonomics* 57(11), 1670–1677.
- Schloss, J. & Palmer, S. E. (2000). Color assimilation against a
  chromatic background. *PNAS* 97(13).
- Dobres, J., Chahine, N., & Reimer, B. (2017). Effects of ambient
  illumination, contrast polarity, and letter size on text legibility under
  glance-like reading. *Applied Ergonomics* 60, 68–73.
- Mantiuk, S., Daly, S., & Rok, A. (2010). *The luminance of pure black*.
  SPIE. Pure black is not perceptually achievable: perceived black is about
  0.0044 cd/m² at 0.1 cd/m² surround, so a "black" background is already
  non-black to the eye.
- Okabe, M., & Ito, K. *Color Universal Design*.
  <https://jfly.uni-koeln.de/color/>
- Tol, P. (2021). *Colour Schemes*. SRON/EPS/TN/09-002 issue 3.2.
- Geddes, C., Eggertson, E. C., Sutton, J., & Tigwell, G. W. (2025). Designing
  for colour vision deficiency: a scoping review. *ACM ASSETS '25*, Article 90.
- Li, C., Li, Z., Wang, Z., Xu, Y., Luo, M. R., Cui, G., Melgosa, M., Brill, M.
  H., & Pointer, M. (2017). Comprehensive color solutions: CAM16, CAT16, and
  CAM16-UCS. *Color Research & Application* 42(6), 703–718. Source of the
  categorical-separation figures quoted above, and of the CAM16 implementation.
- High, J. S., Green, P., & Nussbaum, P. D. (2023). A new approach to modeling
  the Helmholtz-Kohlrausch effect. *Color and Imaging Conference*. Source of
  `J_HK = sqrt(J² + 66C)`.
- Corney, D., Haynes, J. D., Rees, G., & Lotto, R. B. (2009). The brightness of
  colour. *PLOS ONE* 4(3), e5091. Establishes the effect (saturated colours
  appear brighter than equiluminant neutrals) with r = 0.992 between its
  saturation model and perceived brightness. Not a closed-form predictor, which
  is why the H-K implementation follows High, Green and Nussbaum instead.
- xkcd (2005). Color survey. <https://blog.xkcd.com/2010/05/03/color-survey-results/>.
  222,500 responses naming 949 colours; the source of the naming vocabulary in
  `data/xkcd-colors.json`.
