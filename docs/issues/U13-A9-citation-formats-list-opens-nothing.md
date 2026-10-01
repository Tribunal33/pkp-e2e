# With no additional citation format offered, "More Citation Formats" opens nothing and readers cannot download the citation

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS (code; OMP and OPS ship no citation plugin)
- **Introduced** `pkp/ojs#1498` for `pkp/pkp-lib#723` · [6307695](https://github.com/pkp/citationStyleLanguage/commit/63076950ed0a65e9f66d22458f90732e746ff2db) · 2017-07-05 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an article, book or preprint page, the "More Citation Formats" button
under "How to Cite" stops opening once a manager unticks every
"Additional Citation Formats" box in the citation plugin's settings. The
"Downloadable Formats" are in that button's list, so readers can no
longer reach the RIS and BibTeX files for their reference manager.

Nothing on the page says the button failed, and readers have no way
round. The manager brings the list back by ticking any one additional
format.

A fresh install ticks every format, so only a context whose manager
unticked them all is hit, for instance one that wants a single citation
format shown and the downloads offered. The fault is in the plugin's
script, not in a theme: the plugin's own stylesheet keeps the closed
list hidden on all three apps, whatever theme shows the button.

## Impact

- **Lost**: the citation downloads ("Endnote/Zotero/Mendeley (RIS)",
  "BibTeX") for every published item of the context, though the manager
  ticked them. Nobody is told, so the manager has no reason to look.
- **Who**: every reader of an article, book or preprint page in such a
  context. Screen-reader users hear a collapsed button that never
  expands.
- **Way round**: none for the reader. The manager can tick at least one
  additional format.

Medium rather than low, because the reader's download fails, silently,
rather than only reading wrong. Not high, because only a context that
changed the plugin's default meets it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP and OPS. The "Citation
  Style Language" plugin is off in the dataset. Once it is on, every
  "Additional Citation Formats" box and both "Downloadable Formats" boxes
  are ticked.

Steps, on each app in turn:

1. Sign in as `rvaca` (the Journal manager, Press manager or Preprint
   Server manager).
2. Go to Settings › Website › "Plugins" and tick "Citation Style
   Language".
3. Open the row's arrow, then "Settings". Under "Additional Citation
   Formats", untick every box. Leave both "Downloadable Formats"
   ("Endnote/Zotero/Mendeley (RIS)", "BibTeX") ticked. Press "OK".
4. Sign out.
5. Open the published item's page:
   - OJS: submission 17, "Antimicrobial, heavy metal resistance and
     plasmid profile of coliforms isolated from nosocomial infections in
     a hospital in Isfahan, Iran"
     (`/index.php/publicknowledge/article/view/17`);
   - OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive
     Science of LEGO Robots"
     (`/index.php/publicknowledge/catalog/book/14`);
   - OPS: submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
     Comparative Study Of Construct Equivalence"
     (`/index.php/publicknowledge/preprint/view/2`).
6. Under "How to Cite", press "More Citation Formats".

**Expected**: the list opens under the button, showing "Download
Citation" with "Endnote/Zotero/Mendeley (RIS)" and "BibTeX", and the
button reads as expanded. Pressing "BibTeX" downloads the `.bib` file.

**Observed**: nothing opens, however often the button is pressed. The
two download links are in the page but stay hidden, and the browser
console shows no error. After three presses the markup still reads:

```
<button class="citation_formats_button label" aria-controls="cslCitationFormats" aria-expanded="false" …>More Citation Formats</button>
<div id="cslCitationFormats" class="citation_formats_list" aria-hidden="true">
  … Download Citation · Endnote/Zotero/Mendeley (RIS) · BibTeX
```

Control: with "APA" left ticked in step 3, the same button opens the
list ("APA", "Download Citation", "Endnote/Zotero/Mendeley (RIS)",
"BibTeX"), and "BibTeX" downloads the file.

## Cause

The list is opened by the plugin's script,
`plugins/generic/citationStyleLanguage/js/articleCitation.js`. On
`DOMContentLoaded` it looks up the citation box, the format links
(`[data-load-citation]`), the button and the list, then stops early:

```js
// Check if the required elements exist
if (!citationOutput || citationFormatLinks.length === 0) {
	return;
}
```

That guard protects the next block, which wires each format link to
fetch its citation. But the button's click handler, which toggles
`aria-expanded` on the button and `aria-hidden` on the list, comes after
it. With no additional format ticked, the list holds no format links,
only the download links, which carry no `data-load-citation` because
the browser must download them normally. So the script returns before
the button is ever wired. The list starts with `aria-hidden="true"`, and
the plugin's own `css/citationStyleLanguagePlugin.css`, loaded on all
three apps, hides it with `display: none`
(`.citation_display [aria-hidden="true"]`). OJS's and OPS's default
themes repeat the rule; OMP's default theme has none, and the plugin's
rule alone hides the list there. So the downloads can never be seen.

The guard is as old as the downloads. `git blame` gives 6b5f515 (2023,
`pkp/citationStyleLanguage#113`), the rewrite without jQuery, which kept
it as it was. Its parent has it in jQuery form,
`if (!citationOutput.length || !citationFormatLinks.length) return;`,
written in 6307695, the commit that created the script, on 2017-07-05
for `pkp/pkp-lib#723`. The same day
[8ec32b9](https://github.com/pkp/ojs/commit/8ec32b9686b960dcd926d3777deb990ad6edf6c7)
(`pkp/ojs#1498`) put the downloadable formats into the list in OJS's
`article_details.tpl`.

Reach:

- All three apps load the same script. OJS and OMP get the list's markup
  from the plugin's `templates/citation-block.blade`; OPS prints the same
  markup from its own `templates/frontend/objects/preprint_details.tpl`.
  Walked on all three.
- OMP's chapter pages carry the same block through
  `Templates::Catalog::Chapter::Details`. Read in the code, not walked.
- A third-party theme that prints the markup the script's header
  documents meets the same fault. Read in the code.
- When both groups are unticked, the list has nothing in it, so a button
  that does not open hides nothing from the reader.

## Proposed fix

In `pkp/citationStyleLanguage`, let the guard stop only when the
citation box is missing. A missing set of format links then just means
the `forEach` that wires them has nothing to do, and the button is
wired as before:

```diff
-	// Check if the required elements exist
-	if (!citationOutput || citationFormatLinks.length === 0) {
+	// Check if the required elements exist. The format links may be absent
+	// (no additional citation format enabled) while the dropdown still holds
+	// the downloadable formats, so their absence must not stop the dropdown
+	// from being wired below.
+	if (!citationOutput) {
 		return;
 	}
```

The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-list-opens-nothing/fix.diff).
Its paths start at an app's root
(`plugins/generic/citationStyleLanguage/js/…`); in the plugin repo,
apply it with `git apply -p4`. The button keeps its own guard further
down (`if (!citationFormatBtn || !citationFormatDropdown) return;`), so
a page without the list is unchanged.

The fix was tried on `main` (OJS, OMP, OPS). With it, the list opens on
the first press with the two downloads, closes on the second, and
"BibTeX" downloads the `.bib` file. With "APA" ticked, the list, the
"APA" citation and the download behave the same with and without the
fix.

**Alternatives:**

- Always list the primary format among the additional ones, so the list
  is never without a format link: this changes what the settings mean,
  and was proposed and closed as not planned (`pkp/pkp-lib#3353`).
- Bind the button in a separate `DOMContentLoaded` handler: the same
  result with more code; the one-line guard keeps the script's shape.

**What goes with it:**

- Branches: the fix goes to `pkp/citationStyleLanguage` `main` and
  `stable-3_5_0`, where the diff applies as it stands, with the
  submodule bumps in the three apps. 3.4 and 3.3 have the same fault;
  if the team still patches them, `stable-3_4_0` takes the same diff,
  and `stable-3_3_0` (OJS only) needs it in its jQuery form,
  `if (!citationOutput.length) return;`. No data repair, API or hook
  change.
- Optional, not tried: once the fix is in, a page with both groups
  unticked shows a button that opens an empty box. Wrapping
  `.citation_formats` in
  `@if(count($citationStyles) || count($citationDownloads))` in
  `citation-block.blade`, and the same condition in OPS's
  `preprint_details.tpl`, would hide the button there.
- The e2e check: a check in U13 that unticks every additional format
  and asserts the list opens with the downloads.

Small: the change is one condition in a script nothing else calls, and
it was tried on the three apps.

## Evidence

- Walk script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-list-opens-nothing/walk.js),
  on installs freshly loaded from PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30; PostgreSQL):
  `node bin/probe.js all shared/playwright/checks/issues/citation-formats-list-opens-nothing/walk.js`
  (`neighbour` as its argument leaves "APA" ticked). The fix was applied
  for the trial with `node bin/try-fix.js apply …/fix.diff ojs omp ops`.
- Branch heads walked: OJS `main` bade233f73 (2026-09-30), OMP `main` 3b0ecf794 and OPS
  `main` c8af945bb7 (2026-09-29), with the plugin at 9dd6eba
  (2026-09-18) in all three. On `stable-3_5_0`, walked with the same
  script on the 3.5 dataset, with the same result on the three apps:
  OJS 92b9a16b48, OMP 3081c9b00 and OPS cf4fce69bd, with the plugin at
  41ddd1b, whose `js/articleCitation.js` differs from `main`'s only in
  the copyright years.
- 3.4, read in the code: `upstream/stable-3_4_0` of OJS (9571d8fde7), OMP
  (0aec65441) and OPS (acd8ae704b) record the plugin at 8f54149. Its
  script differs from `main`'s only in the copyright years, and its
  `templates/citationblock.tpl` (OJS, OMP) and OPS's
  `preprint_details.tpl` put the downloads in the same list.
- 3.3, read in the code: OJS `upstream/stable-3_3_0` (9fdb9bcf9a) records the
  plugin at 648ae36, whose jQuery script has the same guard before the
  button's handler; OJS's `article_details.tpl` prints the list with
  the downloads. OMP (8e72fc883) and OPS (c5532e2161) have no
  `plugins/generic/citationStyleLanguage`.
- Settings: `CitationStyleLanguageSettingsForm::execute()` saves an
  empty list when every box is unticked (`?: []`), and
  `getEnabledCitationStyles()` then returns no format, since the stored
  value is an array.
- A search of pkp/citationStyleLanguage by 6307695's sha found no pull
  request for it.
- Upstream searched in pkp/pkp-lib, pkp/citationStyleLanguage, pkp/ojs,
  pkp/ops, pkp/omp and pkp/ui-library ("More Citation Formats", "Additional Citation Formats",
  citation formats dropdown, citation download, `articleCitation.js`,
  `aria-expanded`): no report of this fault. `pkp/pkp-lib#4799` (the
  downloads are hard to find behind the button) and `pkp/pkp-lib#3353`
  (list the primary format too) are about other things.
- Not walked: an OMP chapter page, and a page with
  nothing ticked in either group. MySQL not checked; nothing here
  depends on the database.
