# Readers opening an XML galley in the Lens reader see its TeX formulas as blanks

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the reader still loads MathJax 2)
- **Introduced** `asmecher/lensGalley#75` (MathJax 2.7.5 to 3.2.2) · [ba84af1](https://github.com/asmecher/lensGalley/commit/ba84af18668dc3e7cd7baa5617025b64358d8b45) · 2025-09-19 · Adam Sanchez (asanchez75); shipped in the OJS 3.4.0-10 and 3.5.0-2 releases
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a reader opens an article's XML galley, the eLife Lens reader lays
the article out, but the page's own script fails as it finishes, and the
article's formulas written in TeX never appear. A display formula leaves
only its number, such as "(1)", and an inline one leaves a gap in its
sentence. Formulas written in MathML still show, and so does the rest of
the article.

Readers lose the article's mathematics, and nothing tells them anything
is missing.

It concerns journals that publish JATS XML galleys whose formulas are in
TeX. "eLife Lens Article Viewer" is on for a new journal.

## Impact

- **Lost.** Every TeX formula in an XML galley, display and inline,
  shown as blank space.
- **Who.** Every reader of an XML galley that holds TeX formulas, on
  every visit; the journal's editors see the same page.
- **Way round.** Readers can open a PDF galley if the journal publishes
  one. A journal can write its formulas in MathML instead of TeX.

Medium: published formulas vanish silently, but only from XML galleys
with TeX formulas, and readers have the way round above. It would be
high for a journal whose only galley is XML with TeX formulas.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`;
  "eLife Lens Article Viewer" is on there).
- A JATS file `formulas.xml` holding one article with a TeX display
  formula, a MathML display formula, an inline TeX formula and a
  sentence with two prices:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:mml="http://www.w3.org/1998/Math/MathML" xmlns:xlink="http://www.w3.org/1999/xlink" article-type="research-article">
  <front>
    <journal-meta>
      <journal-title-group><journal-title>Journal of Public Knowledge</journal-title></journal-title-group>
      <publisher><publisher-name>Public Knowledge Project</publisher-name></publisher>
    </journal-meta>
    <article-meta>
      <title-group>
        <article-title>Formulas in the Lens reader</article-title>
      </title-group>
      <abstract><p>An article with three formulas.</p></abstract>
    </article-meta>
  </front>
  <body>
    <sec id="s1">
      <title>Introduction</title>
      <p>A display formula written in TeX:</p>
      <disp-formula id="eq1"><label>(1)</label><tex-math>E = mc^2</tex-math></disp-formula>
      <p>A display formula written in MathML:</p>
      <disp-formula id="eq2"><label>(2)</label><mml:math><mml:msup><mml:mi>a</mml:mi><mml:mn>2</mml:mn></mml:msup><mml:mo>+</mml:mo><mml:msup><mml:mi>b</mml:mi><mml:mn>2</mml:mn></mml:msup><mml:mo>=</mml:mo><mml:msup><mml:mi>c</mml:mi><mml:mn>2</mml:mn></mml:msup></mml:math></disp-formula>
      <p>An inline formula, <inline-formula><tex-math>\alpha + \beta</tex-math></inline-formula>, inside a sentence.</p>
      <p>The tickets cost $5 and $10.</p>
    </sec>
  </body>
</article>
```

1. Sign in as `dbarnes`.
2. Open submission 1, "Signalling Theory Dividends". The workflow opens
   on its unpublished version 1.1; open that version's "Galleys".
3. Press "Add galley", type "XML" as the Galley Label and press "Save".
   In "Upload a File Ready for Publication" choose "Article Text",
   upload `formulas.xml`, press "Continue", "Continue", "Complete".
4. Press "Publish" for version 1.1. In "Review Publishing Details" keep
   what it preselects and press "Confirm", then "Publish". [3.5:
   "Publish", then the window's own "Publish".]
5. Sign out. Open the article's page
   (`/index.php/publicknowledge/article/view/mwandenga`; `mwandenga` is
   the article's URL Path in the dataset) and press "XML".

**Expected.** The article opens in the Lens reader with "E = mc²" above
"(1)", "a² + b² = c²" above "(2)", and "α + β" inside its sentence, all
typeset. "The tickets cost $5 and $10." stays plain text. The browser
reports no error.

**Observed.** The reader lays out the article, its "Contents" and "Info"
tabs, and the MathML formula, drawn by the browser itself. Under "A
display formula written in TeX:" there is only "(1)". The sentence reads
"An inline formula, , inside a sentence." The prices stay plain text. As
the layout finishes, the page's script fails:

```
TypeError: Cannot read properties of undefined (reading 'Queue')
    at …/plugins/generic/lensGalley/lib/lens/lens.js:5:23084
```

The two TeX formulas are still in the page, as hidden
`<script type="math/tex; mode=display">E = mc^2</script>` and
`<script type="math/tex">\alpha + \beta</script>` tags.

## Cause

The Lens reader page, `plugins/generic/lensGalley/templates/display.tpl`,
was moved from MathJax 2.7.5 to MathJax 3.2.2. MathJax 3 is a different
interface, and the change did not bring the reader along. Three things
go wrong. The first is in that template. The other two are in
`lib/lens/lens.js`, the bundled eLife Lens reader, which was written for
MathJax 2; their fix goes in the template too (Proposed fix).

First, the template loads MathJax 3 and only then runs
`window.MathJax = { tex: …, options: … }`. MathJax 3 reads its
configuration from `window.MathJax` when it loads, and then puts its
own object there. Assigning afterwards replaces the loaded MathJax with
a plain object. So the configuration is never used, and
`window.MathJax` no longer holds MathJax (on the walked page it held
only `tex` and `options`).

Second, once Lens has laid the article out, `lens.js` calls
`window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub])`, then
`Hub.Queue(function () { t.updateState() })`. MathJax 3 has no `Hub`, so
the first call throws the `TypeError` above. It would throw even with
the configuration set before MathJax loads. Nothing is typeset and the
second job never runs.

Third, `lens.js` writes a JATS `<tex-math>` formula as a `<script
type="math/tex">` tag (`"math/tex; mode=display"` for a display
formula), the way MathJax 2 expected. MathJax 3 does not look for those
tags, so a typeset call alone would still leave them hidden. A
`<mml:math>` formula is put in the page as MathML, which the browser
draws without MathJax; that is why it still shows.

Reach:

- XML issue galleys never reach this page: `issueGalley.tpl` includes
  `$displayTemplateResource`, which `issueCallback()` never assigns (it
  assigns `displayTemplatePath`), since the plugin's Smarty 3 update
  7d70165 (2018). That is a separate, older fault (code; not walked).
- `lib/lens/index.html` loads MathJax 2.7.1 itself, but it is the
  bundle's demo page, which the reader never uses (code).
- OMP and OPS ship no Lens reader; a preprint server downloads an XML
  galley (code).
- The workflow's body-text editor on OJS `main` loads its own copy of
  MathJax 4 (`js/build/mathjax`, ui-library `loadMathJax()`), separately
  from this page, and is not touched (code).

## Proposed fix

A proposal; the team decides. Recommended: keep MathJax 3, and let the
template provide the MathJax 2 API calls Lens makes. All of it goes in
`plugins/generic/lensGalley/templates/display.tpl`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/lens-formulas-not-typeset/fix.diff)):

1. Set `window.MathJax` before the MathJax script, so the configuration
   applies.
2. Add a render action that turns each `script[type^="math/tex"]` into
   a TeX item, display when the type says `mode=display`. This is the
   pattern MathJax 3's upgrade notes give for MathJax 2's script tags.
   It is added under its own name (`findScript`), so it runs beside
   MathJax's default `find` action, which still finds the MathML.
3. After the script, define `MathJax.Hub.Queue()` as a small shim that
   chains each job on `MathJax.startup.promise`: `"Typeset"` becomes
   `MathJax.typesetPromise()` and a function is called as it is.
4. Drop the `tex.inlineMath` and `displayMath` lines. Once the
   configuration applies, `$…$` would turn "$5 and $10" into math. Lens
   does not need them, since it never puts TeX in text, and MathJax 2 as
   Lens used it did not read `$` either. The `assistiveMml` menu
   setting is kept as it was.

The fix was tried on `main`. With it, the walk showed all three formulas
typeset ("E = mc²" centred above "(1)", "α + β" in its sentence) and no
script error. A check that the fix reaches no further, run with the fix
in and out, showed the same either way: the prices stay plain text, and
the "Contents" and "Info" tabs behave as before.

Why here: the template is what chose MathJax 3, and it is the one place
both Lens's calls and MathJax's setup can be seen. `lens.js` is a
vendored, minified build that the plugin does not compile.

**Alternatives**

- Rebuild `lens.js` from the Lens sources with MathJax 3 calls. This is
  cleaner in the long run, but needs the Lens source tree and its
  toolchain, and the script tags still need handling.
- Go back to MathJax 2. That brings back CVE-2023-39663, which
  `asmecher/lensGalley#75` cites against MathJax 2.7.5 and was made to
  fix.
- On `main`, load the copy of MathJax 4 that OJS already ships in
  `js/build/mathjax` instead of the CDN. This removes a third-party
  request, but 3.5 and 3.4 do not ship it, and MathJax 4 needs its own
  check. It can follow this fix.

**What goes with it**

- Backport: `display.tpl` and `lens.js` are the same on the plugin's
  `stable-3_5_0` and `stable-3_4_0` branches, so the diff applies as it
  stands. Each OJS line then needs a submodule update.
- No data repair.
- Guard: an e2e check in U13 that opens an XML galley with a TeX formula
  and finds it typeset, with no script error (a Planned item).

Small: one template in the plugin, following MathJax's documented v2
pattern, tried on `main`.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/lens-formulas-not-typeset/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/lens-formulas-not-typeset/walk.js),
  with `lib.js` and the `formulas.xml` file beside it. It also uses
  `publishLatestVersion()` from `../older-version-pdf-reader-empty/lib.js`.
  Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/lens-formulas-not-typeset/walk.js`.
  It records each formula, the prices sentence, the tabs, what
  `window.MathJax` holds and the page's errors, then presses "Info". The
  fix was tried by applying `fix.diff` to the OJS checkout and running
  the same script.
- Branch tips: OJS `main` bade233f73 (2026-09-30), lensGalley 6a6e32b; OJS
  `stable-3_5_0` 92b9a16b48 (2026-09-30), lensGalley 49bff9d; OJS
  `stable-3_4_0` 9571d8fde7 (2026-09-25), lensGalley 4ad64a5; OJS
  `stable-3_3_0` 9fdb9bcf9a (2026-09-18), lensGalley abc76d1.
- 3.5 (walked, and read): the same Steps, with the 3.5 workflow
  differences the brackets name. The result was the same as on `main`,
  including the `TypeError`. `display.tpl` and `lens.js` there are
  byte-identical to `main`'s.
- 3.4 (code): OJS `upstream/stable-3_4_0` points the plugin at 4ad64a5,
  the PR's own commit. Its `display.tpl` and `lens.js` are
  identical to `main`'s.
- 3.3 (code): OJS `upstream/stable-3_3_0` points the plugin at abc76d1,
  whose `display.tpl` loads MathJax 2.7.5
  (`MathJax.js?config=TeX-AMS-MML_HTMLorMML`). It has the same `lens.js`,
  whose `Hub.Queue` calls and `math/tex` scripts MathJax 2 handles.
- Introduced: `git blame` on `display.tpl` lines 12–26 (the MathJax 3
  script and the configuration after it) points to ba84af1. The same
  change is 4ad64a5 on the plugin's `stable-3_4_0` (PR
  `asmecher/lensGalley#75`, merged 2025-10-16 by asmecher, no linked
  issue) and 0c88273 on `stable-3_5_0`. It reached OJS through
  submodule updates: `main`
  [4163aa0534](https://github.com/pkp/ojs/commit/4163aa0534e0b82162ce95e70292b2c723d16284)
  (2025-10-31), `stable-3_5_0` 9a764b1bca (first released in 3.5.0-2)
  and `stable-3_4_0` 96a5a188e2 (first released in 3.4.0-10). Lens's
  MathJax 2 calls are older and unchanged.
- Upstream search (2026-10-01), issues and PRs: pkp/pkp-lib ("lens
  mathjax", "MathJax.Hub", "lens formula(s)", "mathjax"), pkp/ojs ("lens
  mathjax", "mathjax"), pkp/ui-library ("mathjax"), and
  asmecher/lensGalley, the plugin's repository ("mathjax", "formula",
  "Queue"). Nothing reports the failure.
- Driven in Chromium only; PostgreSQL, and the fault does not depend on
  the database.
- Not driven: Firefox and Safari.
- Unverified: that Firefox and Safari also draw the MathML formula
  without MathJax (both support MathML natively).
- The first `main` walk without the fix ran while an unrelated change to
  the article page's public reviews was applied for another report. A
  second run without the fix, on clean code, saw the same.
