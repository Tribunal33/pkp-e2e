# Readers of an XML galley in the Lens reader see no TeX formulas, and its script fails

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; still loads MathJax 2)
- **Introduced** `asmecher/lensGalley#75` for CVE-2023-39663 · [ba84af1](https://github.com/asmecher/lensGalley/commit/ba84af18668dc3e7cd7baa5617025b64358d8b45) · 2025-09-19 · Adam Sanchez (asanchez75)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a reader opens an XML galley, the article loads in the eLife Lens
reader, but the reader's typesetting script fails with an error. The
article's text and its tabs still show, but no formula is typeset.

A formula written in TeX is left out of the article without a trace: an
inline one leaves a gap in its sentence, a numbered one shows only its
number. A MathML formula is not typeset either. Current Chrome, Edge,
Firefox and Safari draw it themselves in a plainer form, and older
browsers show it as bare text. Neither the reader nor the journal is
told.

It reaches every journal that publishes XML galleys with formulas while
"eLife Lens Article Viewer" is on, which it is by default for a new
journal. Installs have carried it since the releases OJS 3.4.0-10 and
3.5.0-2.

## Impact

- **Lost**: the formulas of a published article, for every reader of its
  XML galley.
- **Who**: readers of XML galleys holding formulas, in journals that
  publish XML galleys with the Lens reader on.
- **Way round**: none in the reader. A reader can turn to another galley
  of the same article (a PDF) when the journal publishes one. The journal
  can switch the Lens reader off, so that XML galleys download.

Medium: only XML galleys that carry formulas lose them, and few journals
publish those. A journal whose XML galleys write their formulas in TeX
loses every one of them, which would make it high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. "eLife Lens Article Viewer" is
  on in it (Settings > Website > Plugins).
- The browser can reach `cdnjs.cloudflare.com`, which the Lens reader
  loads MathJax from.
- A JATS XML file with formulas, such as
  [`article-formulas.xml`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/lens-reader-formulas-not-shown/article-formulas.xml):
  one inline TeX formula (`<inline-formula><tex-math>`), formula (1) in
  MathML (`<disp-formula><mml:math>`) and formula (2) in TeX
  (`<disp-formula><tex-math>`). The dataset holds no XML galley, so the
  steps upload this one.

1. Sign in as `dbarnes`.
2. Open submission 17, "Antimicrobial, heavy metal resistance and plasmid
   profile of coliforms isolated from nosocomial infections in a hospital
   in Isfahan, Iran" (published in "Vol. 1 No. 2 (2014)"). In the
   workflow's side menu, under the publication, choose "Galleys"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17&workflowMenuKey=publication_18_galleys`).
3. Press "Unpublish", and "Unpublish" in the question.
4. Press "Add galley". In "Create New Galley", type the label "XML" and
   press "Save".
5. A second window, "Upload a File Ready for Publication", opens. Choose
   "Article Text", upload `article-formulas.xml`, and press "Continue",
   "Continue", "Complete".
6. Press "Schedule For Publication". In "Review Publishing Details" keep
   "Vol. 1 No. 2 (2014)" and press "Confirm", then "Publish" in the
   question. [On 3.5 there is no "Review Publishing Details": "Schedule
   For Publication" opens the question directly.]
7. Sign out. Open "Archives", "Vol. 1 No. 2 (2014)", then the article.
8. Press "XML".

**Expected**: the article opens in the Lens reader with its formulas
typeset: in the first paragraph, "The growth rate is", then the formula
typeset from the TeX `r = \frac{\ln 2}{t_d}` (a fraction), then "for a
doubling time t."; formulas (1) and (2) above their numbers. No script
error.

**Observed**: the article opens in the Lens reader ("Abstract", "Main
Text", "Introduction"; tabs "Contents" and "Info"), and the browser logs:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'Queue')
```

The first paragraph reads "The growth rate is  for a doubling time t.",
with nothing where the formula belongs. Formula (2) shows only its label
"(2)". Formula (1) shows as Chromium's own plain drawing of the MathML,
untypeset. The same error is logged for an XML galley with no formula.

## Cause

The Lens reader's page is `plugins/generic/lensGalley/templates/display.tpl`.
For CVE-2023-39663, a ReDoS in MathJax 2, `asmecher/lensGalley#75`
replaced MathJax 2.7.5 there with MathJax 3.2.2 (`es5/tex-mml-chtml.js`,
lines 12–27). It kept the reader, `lib/lens/lens.js` (the eLife Lens 2.0
bundle), which speaks only to MathJax 2. MathJax 3 has no `MathJax.Hub`.

That change broke three things. The first two stop every formula from
being typeset; the third would still hide TeX formulas if the first two
were fixed:

- **The typesetting call.** Once Lens has rendered the article, `lens.js`
  (line 5) calls `updateState()` once, then
  `window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub])`, then queues
  a second `updateState()` to run after the typesetting. With MathJax 3,
  `MathJax.Hub` is undefined, so the call throws the TypeError above.
  Nothing typesets the article, and the second `updateState()` (Lens
  measuring the content again after formulas change its height) never
  runs. Nothing else in the reader depends on it: its text, tabs and
  "Contents" outline work.
- **The configuration.** The template sets `window.MathJax = {…}` in a
  script *after* the MathJax script. MathJax 3 reads its configuration
  from `window.MathJax` as it loads, then puts its own object there. The
  later assignment replaces MathJax's object with the bare configuration:
  on the page, `window.MathJax` holds only `tex` and `options`, with no
  `typesetPromise`. The configuration itself never takes effect.
- **TeX formulas.** Lens's formula view (`lens.js` line 2) writes a TeX
  formula as a MathJax 2 element, `<script type="math/tex">` (`; mode=display`
  for a display formula). MathJax 3 no longer looks for these. MathML is
  written as `<math>` elements, which MathJax 3 finds.

Reach:

- MathML formulas: browsers with MathML support of their own (Chromium
  109 and later, Firefox, Safari) draw them in a plainer form; Chromium's
  was seen on screen. Older browsers show the formula's characters as
  bare text, which was not checked on screen.
- A formula given only as an image (`<graphic>` in `<disp-formula>`): Lens
  shows the image itself, without MathJax (read in the code).
- An issue's XML galley does not reach `display.tpl` at all:
  `issueGalley.tpl` includes `$displayTemplateResource`, while
  `issueCallback()` assigns `displayTemplatePath` (read in the code, the
  same on 3.4). That is a separate fault, which this fix does not change.
- `lib/lens/index.html`, the eLife demonstration page bundled with the
  library, loads its own MathJax 2.7.1. No OJS page serves it.
- OMP and OPS have no Lens reader. A search of the three apps, their
  plugins and ui-library found no other caller of `MathJax.Hub`.

## Proposed fix

Keep MathJax 3.2.2, the version the CVE change moved to, and fit the
template to what `lens.js` and its formula view expect, in `display.tpl`
alone
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/lens-reader-formulas-not-shown/fix.diff)).
The security change stays as it is: no MathJax 2 comes back.

1. Set `window.MathJax` *before* the MathJax script, so the configuration
   is read.
2. In that configuration, add a render action, `findScript`, that turns
   Lens's `<script type="math/tex">` elements into math items for the TeX
   input. This is a variant of MathJax's documented recipe for MathJax 2
   script elements. The recipe replaces the default `find` action and
   takes the first input jax. The variant adds its action beside `find`,
   so TeX delimiters and MathML in the text are still found, and it picks
   the TeX input by name.
3. After the MathJax script, give MathJax a small `Hub.Queue` that runs
   `lens.js`'s jobs on MathJax 3's promise chain, the chain MathJax 3
   documents for typesetting content added after the page loads.
   `["Typeset", …]` becomes `MathJax.typesetPromise()`, and a function runs
   after it. Each job has its own `.catch`, so one failed typeset is logged
   and the jobs after it (Lens's `updateState()`, a later typeset) still
   run. If MathJax did not load (a blocked CDN), the queue still runs
   Lens's own callbacks, so the page keeps working.

```js
(function (mathJax) {
	mathJax.Hub = {
		Queue: function () {
			for (var i = 0; i < arguments.length; i++) {
				var job = typeof arguments[i] === 'function' ? arguments[i] : function () {
					return mathJax.typesetPromise();
				};
				if (mathJax.startup) {
					// A failed job is logged and the chain goes on, so the jobs after it still run.
					mathJax.startup.promise = mathJax.startup.promise.then(job).catch(function (error) {
						console.error('MathJax: ' + (error && error.message));
					});
				} else if (job === arguments[i]) {
					job(); // MathJax did not load: run the callbacks, typeset nothing.
				}
			}
		}
	};
})(window.MathJax);
```

The fix also drops the change's `tex.inlineMath` and `tex.displayMath`
settings. Once the configuration takes effect, they would make any two
dollar signs in an article's text (prices such as "$5 and $10") into an
inline formula. MathJax 2's default, which the reader had before, did not
treat a single `$` as a delimiter, and neither does MathJax 3's.

The fix was tried on `main`. With it, the Steps showed all three formulas
typeset and no script error. As a control, the same Steps were taken with
an XML galley that has no formula and reads "A test costs $5 in one clinic
and $10 in the other.". That sentence showed verbatim, with no math, both
with and without the fix. Only the script error, logged without the fix,
went away with it.

**Alternatives**:

- Change the call in `lens.js` to `MathJax.startup.promise.then(…typesetPromise…)`.
  This works too, but it edits a 32 KB minified line of the vendored eLife
  bundle. Steps 1 and 2 above would still be needed.
- Go back to MathJax 2. This undoes what the CVE change was for.
- Load the MathJax 4 that OJS `main` already serves for the editor
  (`js/build/mathjax`, `pkp/pkp-lib#10419`,
  [a7adf5d32c](https://github.com/pkp/ojs/commit/a7adf5d32c8b1ca0d090a62df2dc7022b2911b1b)).
  This drops the CDN, but only on `main`, and still needs the same
  adapter.

**What goes with it**:

- The template is the same file on `main`, `stable-3_5_0` and
  `stable-3_4_0` (lensGalley `6a6e32b`, `49bff9d`, `4ad64a5`), so the
  diff applies to each as written. OJS needs a submodule bump on each of
  those branches.
- No stored data changes.
- Guard: an e2e check in U13. An XML galley with a TeX and a MathML
  formula opens in the Lens reader with no page error, and both formulas
  are typeset.

Small: one template in the plugin, keeping the patched MathJax 3.2.2, so
no security review of a version change is needed.

## Evidence

- Reproduction script:
  [`shared/playwright/checks/issues/lens-reader-formulas-not-shown/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/lens-reader-formulas-not-shown/walk.js),
  with its two JATS files (`article-formulas.xml`; `article-prices.xml`
  for the control). It takes the Steps and reads the Lens page: its script
  errors, MathJax's output elements, untypeset `script[type^="math/tex"]`
  elements, bare `<math>` elements, and each formula block's text. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/lens-reader-formulas-not-shown/walk.js [neighbour]`.
  The fix was tried with `node bin/try-fix.js apply …/fix.diff ojs`, then
  reverted.
- Tips: OJS `main` `bade233f73` (2026-09-30), lensGalley `6a6e32b`;
  `stable-3_5_0` `92b9a16b48` (2026-09-30), lensGalley `49bff9d`;
  `stable-3_4_0` `9571d8fde7` (2026-09-25), lensGalley `4ad64a5`;
  `stable-3_3_0` `9fdb9bcf9a` (2026-09-18), lensGalley `abc76d1`.
  Default dataset: pkp/datasets `38ab955` (2026-09-30).
- Code reads: `display.tpl` and `lib/lens/lens.js` on each branch's
  lensGalley commit. On 3.4 both files are the same as on `main`. 3.3's
  `display.tpl` loads `mathjax/2.7.5/MathJax.js` with the same `lens.js`,
  which works with it.
- Introduced: `git blame` on `display.tpl` lines 12–27 gives `ba84af1`
  (`main`). The same change is `0c88273` on `stable-3_5_0` and `4ad64a5`
  on `stable-3_4_0`, which is the head of `asmecher/lensGalley#75`
  (merged into `stable-3_4_0` by asmecher on 2025-10-16). The PR's
  description says it "maintains backward compatibility for mathematical
  expressions", and its testing confirmed only that MathJax 3.2.2 loads.
  OJS took it in on `stable-3_4_0` on 2025-11-21 (`96a5a188e2`, first in
  tag `3_4_0-10`) and on `stable-3_5_0` on 2025-10-31 (`9a764b1bca`,
  first in tag `3_5_0-2`).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ui-library and
  asmecher/lensGalley, by "mathjax", "lens formula", "lens math",
  "Hub.Queue", "CVE-2023-39663" and "lensGalley". Nothing matches.
- Unverified: browsers without built-in MathML support (they would show
  formula (1) as bare text). Only Chromium was used for the walks.
