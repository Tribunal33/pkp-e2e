# A manager who unticks a contributor role in the Citation Style Language settings gets it ticked again after saving

Severity: medium · Effort: small · Regression · OJS OMP OPS · 3.5

Introduced: `citationStyleLanguage#168` for `citationStyleLanguage#128`,
commit 41ddd1b265 (2026-09-29, not merged), by Kaitlin Newson
(kaitlinnewson)

Affects: main n/a (the settings are gone there, replaced by contributor
roles) · 3.5 OJS OMP OPS (driven at the PR head; the base does not show
it) · 3.4, 3.3 does not (the PR is not there)

Upstream: none found (2026-09-30)

OJS, OMP and OPS at the `stable-3_5_0` tips (ojs `788c1c2e21`, omp
`4f90dadac`, ops `0bb1ca0f6e`, lib/pkp `8809a197de`) with
`plugins/generic/citationStyleLanguage` at the PR head `41ddd1b265`
(base `62e02795c1`). Tracked in the stable-line read log
(`upstream-sync-stable-3_5_0.md`, 2026-09-30). Temporary: delete once
acted on.

## Summary

With the PR, a journal, press or server that has never saved the
Citation Style Language settings gets the default roles (Author, and
Translator, Volume editor and Chapter Author where they exist) in its
citations. That is what the issue asks for, and it works. But a manager
who unticks one of those roles and presses "Save" sees it ticked again
when the settings reopen, and the citations still list those
contributors. There is no longer a way to leave a role out, for example
to stop crediting translators in "How to Cite". Before the PR the same
untick was kept.

## Impact

A journal can't leave a contributor role out of its public citations,
and nothing on screen says the choice was dropped: the form reopens
ticked, and every citation style and download follows it. The people
who meet it are managers who deliberately cleared a setting ("Translators",
and on OMP "Editors" or "Chapter Authors"). With only the default groups
there is nothing else to tick in its place. Medium: the citations still
render correctly for most journals, but one choice the form offers is
silently ignored.

## Steps to reproduce

Preconditions:

- A fresh OJS 3.5 install with the PR's plugin; the journal "Journal of
  Public Knowledge", a journal manager.
- Settings › Website › Plugins: "Citation Style Language" enabled, its
  settings never saved.
- A submission whose contributors are one "Author" and one "Translator"
  (Contributors › "Add Contributor", its role set to "Translator").

1. As the journal manager, open Settings › Website › Plugins › Installed
   Plugins, "Citation Style Language" › "Settings".
2. Under "Translators", untick "Translator".
3. Press "Save".
4. Open "Settings" again.
5. Open the submission's citation (preview, or the article's "How to
   Cite" once published) in APA.

**Expected**: "Translators" has no box ticked; the citation lists the
author only.

**Observed**: "Translators" has "Translator" ticked again; the citation
still names the translator, "… (T. Translator, Trans.). Journal of
Public Knowledge." The same happens with "Editors"
and "Chapter Authors" on OMP, and with "Authors" on every app.

Control: a setting saved with at least one box ticked keeps exactly
those boxes ("Authors" saved with "Author" and "Guest Writer" reads back
the same).

## Cause

The form posts no value for a checkbox group with nothing ticked, so
`CitationStyleLanguageSettingsForm::execute()` saves
`$this->getData('groupTranslator')` as `null` (stored as a `string` row
with a NULL value). The PR's new
`CitationStyleLanguagePlugin::getContributorGroups()` treats any
non-array value as "never saved" and falls back to the default groups.
So an explicit "none" and "never configured" are now the same stored
value. Before the PR, `getTranslatorGroups()` returned `?? []` and the
NULL meant "none", which is also why journals that saved the form in its
initial state had no authors in their citations: the issue's symptom.
The same applies to all four settings (`groupAuthor`,
`groupTranslator`, and OMP's `groupEditor` and `groupChapterAuthor`).

## Proposed fix

Save an empty selection as an empty array, as the same method already
does for `enabledCitationStyles` and `enabledCitationDownloads`
(`?: []`):

```diff
-        $this->plugin->updateSetting($contextId, 'groupAuthor', $this->getData('groupAuthor'));
-        $this->plugin->updateSetting($contextId, 'groupTranslator', $this->getData('groupTranslator'));
+        $this->plugin->updateSetting($contextId, 'groupAuthor', $this->getData('groupAuthor') ?? []);
+        $this->plugin->updateSetting($contextId, 'groupTranslator', $this->getData('groupTranslator') ?? []);
         if ($this->plugin->application === 'omp') {
-            $this->plugin->updateSetting($contextId, 'groupEditor', $this->getData('groupEditor'));
-            $this->plugin->updateSetting($contextId, 'groupChapterAuthor', $this->getData('groupChapterAuthor'));
+            $this->plugin->updateSetting($contextId, 'groupEditor', $this->getData('groupEditor') ?? []);
+            $this->plugin->updateSetting($contextId, 'groupChapterAuthor', $this->getData('groupChapterAuthor') ?? []);
         }
```

`getContributorGroups()` already returns a stored array as it is, so
`[]` means "none". Rows saved before the PR stay NULL and keep getting
the defaults, which is the PR's intent for the issue's journals. The
cost: a journal that unticked everything on purpose before upgrading
can't be told apart from one that never looked, and gets the defaults
once. Saving the form again after the upgrade keeps its choice.
Alternative: a separate "configured" flag. It would be more exact for
those old rows, but it adds a setting for a case the NULL cannot
separate anyway. Small: four lines in the form. Tried: see Evidence.

## Evidence

- Kept scripts: `shared/playwright/checks/sync/citationStyleLanguage-168/`
  (`csl-defaults.js` phases `seed`/`read`/`save`/`forget` through the
  settings form's own POST and the plugin's `get` endpoint as the
  manager; `untick-screen.js` through the modal). Run on the line fleet
  with `PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=csl168 PROBE_AGENT=k1
  PHASE=<phase> node bin/probe.js all <script>`. Records in
  `.reports/csl168/k1/`. PostgreSQL; MySQL not checked (nothing here
  depends on the database).
- Seed: author.alex's unpublished submission; the line's submission seed
  leaves the submitter's contributor without a group (the contributor
  roles are `main`-only), so the script sets it to Author, and plants a
  Translator (OJS, OMP), a Volume editor (OMP) and a contributor in
  "Guest Writer", a manager-created group with the Author role and no
  locale key, by SQL.
- At the base `62e02795c1`, never saved: no box ticked and the APA
  citation has no names (the issue, reproduced on all three apps). A
  save with nothing ticked stores `groupAuthor|string|NULL` (and the
  others the same).
- At the PR head: that pre-PR NULL row and the never-saved state both
  give Author + Guest Writer (Authors), Translator (Translators; OPS has
  no Translator group), and on OMP Volume editor (Editors) and Chapter
  Author + Guest Writer (Chapter Authors). The citations read "Author,
  A., & Custom, C. (n.d.). Citation defaults probe (T. Translator,
  Trans.)" (OMP adds "V. Volumeeditor, Ed.;"), so the fix works.
- The finding at the PR head: a save with "Translator" unticked stores
  `groupTranslator|string|NULL` and reads back ticked, the citation
  unchanged (all three apps); a save with every box unticked the same
  for every setting; through the modal on OJS and OMP: "opened
  [Translator] → unticked [] → saved, re-opened [Translator]".
- The proposed fix applied in the working tree on all three apps
  (reverted after): never saved still gives the defaults; "Translator"
  (and OMP "Volume editor") unticked stays unticked and leaves the
  citation; everything unticked stores `[]` in each setting and the
  citation has no names.
- The PRs' red Cypress jobs are not this change: omp#2454's two jobs fail
  on `epilogue.pdf` / "Allan" in `CallanSubmission.cy.js`, the same two
  failures as the `stable-3_5_0` push run of `4f90dadac` (2026-09-28);
  ojs#5803's pgsql upgrade job fails in the "Article View Metadata - DC
  Plugin" before-all hook (`cy.type()` on a hidden element).
- Not driven: chapter citations on OMP (the chapter author getter goes
  through the same method); renaming a default group (the match is on
  the locale key, by code).
