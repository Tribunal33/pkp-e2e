# "More Citation Formats" opens nothing when no additional citation format is offered, so readers cannot reach the citation downloads

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS (code; OMP and OPS do not ship the plugin)
- **Introduced** `pkp/citationStyleLanguage` commit, no pull request · [6307695](https://github.com/pkp/citationStyleLanguage/commit/63076950ed0a65e9f66d22458f90732e746ff2db) · 2017-07-05 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a manager unticks every "Additional Citation Formats" box in the
"Citation Style Language" settings and leaves the "Downloadable Formats"
ticked, the "How to Cite" block of an article's, a preprint's or a
book's page still shows "More Citation Formats", but pressing it opens
nothing. The reader expects a list with "Download Citation",
"Endnote/Zotero/Mendeley (RIS)" and "BibTeX", and cannot download the
citation.

The page's script attaches the button's handler only when the list
holds at least one format link. With the downloads unticked as well,
the button is still shown and still opens nothing.

## Impact

- **Lost.** The two citation downloads on every published item's page.
  Nobody is told: the settings window saves as usual, and the page shows
  no error.
- **Who.** Every reader of a journal, press or preprint server whose
  manager offers the citation downloads without any additional on-screen
  format. A new install ticks all eleven formats, so it takes a
  deliberate choice.
- **Way round.** None for the reader. The manager ticks one additional
  format, and the list opens again with that format and the downloads.

Low: the citation itself is shown, and the fault needs a setting few
journals choose. It would be medium if offering the downloads alone were a common setup.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main`: the OJS journal, the OPS server
  and the OMP press, each `publicknowledge`.
- The "Citation Style Language" plugin is off in the dataset. On each
  app, sign in as `rvaca`, open Settings › Website › "Plugins" and tick
  "Citation Style Language".

On each app:

1. Still as `rvaca` under "Plugins", press the arrow beside "Citation
   Style Language", then "Settings".
2. Under "Additional Citation Formats", untick all eleven boxes. Leave
   "Endnote/Zotero/Mendeley (RIS)" and "BibTeX" ticked under
   "Downloadable Formats".
3. Press "OK", then sign out.
4. Open a published item:
   - the journal's article 17, "Antimicrobial, heavy metal resistance
     and plasmid profile of coliforms isolated from nosocomial
     infections in a hospital in Isfahan, Iran":
     `/index.php/publicknowledge/article/view/17`;
   - the server's preprint 2, "The Facets Of Job Satisfaction: A
     Nine-Nation Comparative Study Of Construct Equivalence":
     `/index.php/publicknowledge/preprint/view/2`;
   - the press's book 5, "Bomb Canada and Other Unkind Remarks in the
     American Media": `/index.php/publicknowledge/catalog/book/5`.
5. Under "How to Cite", press "More Citation Formats".

**Expected.** A list opens under the button: "Download Citation",
"Endnote/Zotero/Mendeley (RIS)", "BibTeX". Each link downloads the
citation file.

**Observed.** Nothing opens, on the first press and on the second. The
button keeps `aria-expanded="false"`. The two download links are in the
page's markup, inside the list that stays hidden. No request fails and
no script error is logged.

Control: before step 1, with the plugin's settings as they are when it
is first turned on (all eleven formats ticked), the same button opens the list with the eleven formats and the
two downloads, "ACM" changes the citation shown, and the RIS file
downloads.

## Cause

The plugin's page script,
`plugins/generic/citationStyleLanguage/js/articleCitation.js`, sets up
two things in turn: the format links that swap the citation shown, and
the button that opens and closes the list. It stops before the second
when the page has none of the first:

```js
const citationFormatLinks = document.querySelectorAll('[data-load-citation]');
…
// Check if the required elements exist
if (!citationOutput || citationFormatLinks.length === 0) {
	return;
}
```

Only the additional formats' links carry `data-load-citation`; the
download links do not, since the browser handles them as plain links.
With no additional format offered, the script returns here and the
button never gets its click handler. The list keeps
`aria-hidden="true"`, which the plugin's stylesheet turns into
`display: none`.

The check has been there since the script was first written
([6307695](https://github.com/pkp/citationStyleLanguage/commit/63076950ed0a65e9f66d22458f90732e746ff2db),
which also added the downloadable formats and their setting). On the
same day OJS's article template put the download links into the list the
button opens
([8ec32b9686](https://github.com/pkp/ojs/commit/8ec32b9686b960dcd926d3777deb990ad6edf6c7),
for `pkp/pkp-lib#723`), so the list could hold downloads without a
format link from the start. The rewrite without jQuery
(`pkp/citationStyleLanguage#113`) kept the check.

A second, smaller fault sits beside it: the templates print the button
and the list whatever the two settings hold, so the button is shown even
when neither a format nor a download is offered.

Reach:

- Every page that shows the block: an article's, a preprint's and a
  book's page (walked on `main` and 3.5). A chapter's page gets the same
  block and script (code; not driven).
- The block's markup lives in two places on `main`: the plugin's
  `templates/citation-block.blade`, used by OJS and OMP, and OPS's own
  copy in `templates/frontend/objects/preprint_details.tpl`. Both print
  the button unconditionally, and both load the plugin's script.
- Themes that bring their own markup and load this script are affected
  the same way. Themes outside the three apps' repositories were not
  read.

## Proposed fix

Let the script set up the button whether or not the page has format
links, and print the button only when the list has something in it. A
proposal, tried on `main`; the team decides. It is two pull requests
that can land independently:

- `pkp/citationStyleLanguage` (`js/articleCitation.js` and
  `templates/citation-block.blade`):
  [`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/more-citation-formats-opens-nothing/fix.diff), written against the app root, so its paths
  start with `plugins/generic/citationStyleLanguage/`. This one alone
  gives readers the downloads back on the three apps.
- `pkp/ops` (`templates/frontend/objects/preprint_details.tpl`): the
  last part of [`fix-ops.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/more-citation-formats-opens-nothing/fix-ops.diff), which holds the plugin's
  change too so that it applies to an OPS checkout in one go.

```diff
--- a/plugins/generic/citationStyleLanguage/js/articleCitation.js
+++ b/plugins/generic/citationStyleLanguage/js/articleCitation.js
-	// Check if the required elements exist
-	if (!citationOutput || citationFormatLinks.length === 0) {
+	// Check if the required element exists. A page may offer no additional
+	// format (no link to load) and still list downloads in the dropdown.
+	if (!citationOutput) {
 		return;
 	}
--- a/plugins/generic/citationStyleLanguage/templates/citation-block.blade
+++ b/plugins/generic/citationStyleLanguage/templates/citation-block.blade
+                @if(count($citationStyles) || count($citationDownloads))
                 <div class="citation_formats">
…
+                        @if(count($citationStyles))
                         <ul class="citation_formats_styles">
…
                         </ul>
+                        @endif
…
                 </div>
+                @endif
--- a/templates/frontend/objects/preprint_details.tpl   (pkp/ops)
+++ b/templates/frontend/objects/preprint_details.tpl
+							{if count($citationStyles) || count($citationDownloads)}
 							<div class="citation_formats">
…
+									{if count($citationStyles)}
 									<ul class="citation_formats_styles">
…
 									</ul>
+									{/if}
…
 							</div>
+							{/if}
```

What the walks showed with the fix in:

- No additional format ticked: the button opens "Download Citation",
  "Endnote/Zotero/Mendeley (RIS)", "BibTeX", and the RIS file downloads
  (OJS, OMP, OPS).
- All eleven formats ticked: the list, the "ACM" citation and the RIS
  file are as without the fix.
- The downloads unticked as well: the button is no longer shown. On OPS
  this needs the `pkp/ops` part; with the plugin's part alone OPS still
  shows the button, and it opens an empty list.

Removing the check is safe: the loop over the format links does nothing
when there are none, and the script's second check, a few lines down,
already guards the button and the list. The template conditions follow
the block's own `count($citationDownloads)` condition around the
downloads.

The condition around the formats' `<ul>` is not decoration. The plugin's
stylesheet draws a line above "Download Citation" when a list comes
before it (`.citation_formats_styles + .label`), so an empty `<ul>` left
in the markup would draw that line at the top of a downloads-only list.
With the condition the line is gone (measured on OPS: 1px with formats,
0px without). OPS with the plugin's part alone keeps the empty `<ul>`,
so it would show that line (by the code; not looked at on screen).

For OPS the recommendation is the same conditions in its own template,
as above: four lines, and the block stays where it is on the page.

**Alternatives**

- OPS takes the plugin's block instead of its own copy, as OJS did when
  77bac8d23c (`pkp/ojs#3719`) removed the block from its article
  template. OPS's template already calls `Templates::Preprint::Details`,
  but the plugin registers `addCitationMarkup()` for the article, book
  and chapter hooks only. So this is one more `Hook::add` in the plugin
  plus deleting the block from `preprint_details.tpl`, and the block
  moves down the page to where the hook is called. It removes the
  duplicate for good; it is a larger change with a visible effect, so it
  is left to the team. Not tried.
- The template conditions alone: they remove the dead button and leave
  the downloads out of reach.
- Showing the downloads outside the list, under a heading of their own,
  as `pkp/pkp-lib#4799` asked ("Make download option more obvious",
  closed as not planned): a design change to the block and to every
  theme that copies it.

**What goes with it**

- Branches: the plugin's `main`; for a backport its `stable-3_5_0` and
  `stable-3_4_0`, where the script change applies as written and the
  conditions go into `templates/citationblock.tpl` (Smarty), and OPS's
  `preprint_details.tpl` on the same lines. On 3.3 the block is in
  OJS's own `article_details.tpl`. Not tried on the older lines.
- The script's header comment still says "This script requires jQuery",
  which has not been true since `pkp/citationStyleLanguage#113`; the fix
  edits the lines below it and could drop the sentence.
- Guard: an e2e scenario in this repository's spec, U13 Rule 16 (with no
  additional format ticked, "More Citation Formats" opens the two
  downloads).

Small: a few lines in each of two repositories, and neither pull request
waits for the other.

## Evidence

- Kept script that takes the Steps on OJS, OPS and OMP, on installs
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/more-citation-formats-opens-nothing/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/more-citation-formats-opens-nothing/walk.js),
  run with `PROBE_FEATURE=issues-ir26 PROBE_AGENT=ir26 node bin/probe.js all shared/playwright/checks/issues/more-citation-formats-opens-nothing/walk.js`.
  It records the control first, then the block after step 3 (the button,
  its state after each press, the links in the page's markup, the page's
  script errors), then the block after `rvaca` also unticks both
  downloads.
- Walked on `main` (OJS bade233f73, OMP 3b0ecf794c, OPS c8af945bb7; the
  plugin at 9dd6eba) and on `stable-3_5_0` (OJS 92b9a16b48, OMP
  3081c9b00d, OPS cf4fce69bd; the plugin at 41ddd1b), with the same
  result on the six installs.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/more-citation-formats-opens-nothing/fix.diff ojs omp`
  and `… apply …/fix-ops.diff ops`, then the script as above, compared
  with the run without the fix; then reverted. OPS was walked twice with
  a fix in: with `fix.diff` alone and with `fix-ops.diff`.
- Code reads on `main`: `js/articleCitation.js`,
  `templates/citation-block.blade`, `css/citationStyleLanguagePlugin.css`,
  `getEnabledCitationStyles()`, `getEnabledCitationDownloads()` and the
  hooks in `CitationStyleLanguagePlugin.php`, `execute()` in
  `CitationStyleLanguageSettingsForm.php` (it stores an empty list when
  no box is ticked); OPS's
  `templates/frontend/objects/preprint_details.tpl`. A search of the
  three apps' templates and themes for `cslCitationFormats` and
  `data-load-citation` gave the plugin's block and OPS's copy.
- 3.5 (code, beside the walk): the same script; the block in the
  plugin's `templates/citationblock.tpl` (OJS, OMP) and in OPS's
  `preprint_details.tpl`.
- 3.4 (code): the three apps' `stable-3_4_0` branches (OJS 9571d8fde7,
  OMP 0aec65441f, OPS acd8ae704b) pin the plugin at 8f54149, whose
  script has the same check, whose `citationblock.tpl` prints the button
  unconditionally and whose settings form stores an empty list. Not
  walked.
- 3.3 (code): OJS `stable-3_3_0` (9fdb9bcf9a) pins the plugin at
  648ae36, whose jQuery script has the same check
  (`!citationFormatLinks.length`) and whose settings form stores an
  empty list; the button is printed by OJS's own
  `templates/frontend/objects/article_details.tpl`. OMP (8e72fc8836) and
  OPS (c5532e2161) do not ship the plugin there. Not walked.
- The trace: `git blame` on the check gives 6b5f515
  (`pkp/citationStyleLanguage#113`, the rewrite without jQuery), which
  carried it over; `git log -S` on the jQuery form gives 6307695, the
  commit that created the script. `git log -S` on `citationDownloads` in
  OJS's `article_details.tpl` gives 8ec32b9686, and 77bac8d23c as the
  commit that moved the block out of OJS's template into the plugin.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs and
  pkp/citationStyleLanguage for "More Citation Formats", "Download
  Citation", the dropdown, the button doing nothing and
  `articleCitation.js`. No issue or pull request covers it.
  `pkp/pkp-lib#6287` ("Download option does not appear on frontend",
  closed) was a fault of the Bootstrap 3 theme; `pkp/pkp-lib#4799` is
  the design request named under Alternatives. `citationFormatLinks`
  was not searched for in pkp/pkp-lib.
- Not driven: a chapter's page, and themes other than the default.
