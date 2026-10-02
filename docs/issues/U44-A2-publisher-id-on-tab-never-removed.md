# A Publisher ID saved on a galley's, chapter's or format's "Identifiers" tab cannot be removed

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10826` for `pkp/pkp-lib#10821` · [3fdd61a86a](https://github.com/pkp/pkp-lib/commit/3fdd61a86aa5ba6e72aac38304de38dea4c540b5) · 2025-01-20 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor empties the "Publisher ID" box on a galley's, a chapter's or a
publication format's "Identifiers" tab and presses "Save". The window
closes as it does after any successful save, but the ID is not removed:
when the tab is opened again, the old value is back.

Nothing tells the editor that the removal did not take. The ID can be
changed to another value, but never emptied. The ID left behind stays in
the Native XML export, still blocks the same value on other items, and
goes into any URN or DOI generated later from a pattern that uses "%x".

It affects journals and preprint servers that tick "Enable for Galleys",
and presses that tick "Enable for Chapters" or "Enable for Publication
Formats", under Settings › Workflow › "Metadata" › "Publisher ID"; all
are off by default. The article's, monograph's or preprint's own
Publisher ID, on the "Metadata" page, empties normally.

## Impact

- **Lost**: the removal. The stale ID stays on the galley, chapter or
  format.
- **Who**: editors and managers who record external IDs for these
  items, on the item's "Identifiers" tab.
- **Way round**: none on screen; the ID can only be replaced by another.

Where the ID left behind goes: the item's entry in the Native XML
export; the "already exists" check, which refuses the same value on
another galley, chapter or format; and a URN or DOI suffix built from a
pattern with "%x" (the item's publisher ID), when that identifier is
generated after the removal was tried. No reader page shows these IDs,
and no deposit plugin (Crossref, DataCite, DOAJ, PubMed, the JATS
template) reads them, except through such a DOI.

Medium: the removal fails silently every time with no way round, but
only where these Publisher IDs are switched on, and the stale ID
reaches readers or a registration agency only through a "%x" pattern.
It would be high if "%x" were part of the default URN or DOI patterns.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`): submission
  1, "Signalling Theory Dividends", has an unpublished latest version
  (1.1 on `main`, version 2 on 3.5) whose galley is "PDF Version 2".
- PKP's default test dataset, OPS `main` (or `stable-3_5_0`): submission
  1, "The influence of lactation on the quantity and quality of cashmere
  production", is in Production, not posted, with the galley "PDF".
- PKP's default test dataset, OMP `main` (or `stable-3_5_0`): submission
  4, "How Canadians Communicate: Contexts of Canadian Popular Culture",
  has the chapter "Introduction: Contexts of Popular Culture"; submission
  5, "Bomb Canada and Other Unkind Remarks in the American Media", has
  the publication format "PDF". (Submission 4's own "PDF" is a remote
  format, which has no "Identifiers" tab.)

Galley (OJS, OPS):

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Galleys" and press "Save".
3. Open submission 1. The workflow opens on its latest version (OJS:
   1.1, on 3.5 version 2). Under Publication, open "Galleys".
4. On "PDF Version 2" (OPS: "PDF") open the row's menu, "Edit", then the
   "Identifiers" tab.
5. Type "u44e-galley-1" in "Publisher ID" and press "Save".
6. Open "Edit" › "Identifiers" again. The box reads "u44e-galley-1".
7. Empty "Publisher ID" and press "Save".
8. Open "Edit" › "Identifiers" again.

Chapter and publication format (OMP):

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Chapters" and "Enable for Publication
   Formats" and press "Save".
3. Open submission 4 and, under Publication, "Chapters". Press
   "Introduction: Contexts of Popular Culture", then the "Identifiers"
   tab of "Edit Chapter".
4. Type "u44e-chapter-1" in "Publisher ID" and press "Save". Reopen the
   chapter's "Identifiers" tab: it reads "u44e-chapter-1".
5. Empty "Publisher ID", press "Save", and reopen the tab.
6. Open submission 5 and, under Publication, "Publication Formats". On
   "PDF" press the arrow, "Edit", then the "Identifiers" tab.
7. Type "u44e-format-1", press "Save", and reopen the tab: it reads
   "u44e-format-1".
8. Empty "Publisher ID", press "Save", and reopen the tab.

**Expected.** After the emptied box's "Save" the window closes, and the
reopened tab's "Publisher ID" is empty.

**Observed.** The window closes with no message, and the reopened tab's
"Publisher ID" still reads "u44e-galley-1" (OJS, OPS), "u44e-chapter-1"
and "u44e-format-1" (OMP). The save request posts `publisherId=` and
answers 200 with `"status":true`; the server log has no error.

## Cause

The three tabs save through `PKPPublicIdentifiersForm::execute()`
(pkp-lib, `controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`),
which only writes the publisher ID when the posted value is truthy:

```php
if ($this->getData('publisherId')) {
    $pubObject->setStoredPubId('publisher-id', $this->getData('publisherId'));
}
```

An emptied box posts `publisherId=`, so the object keeps the value it was
loaded with, and the DAO's update (`Repo::galley()->dao` for a galley,
OMP's `ChapterDAO` and `PublicationFormatDAO`) writes that old value back.
Emptying a field must remove it, as the publication's own Metadata form
does: its API turns an empty string into `null`, and the settings row is
deleted.

The guard came with 3fdd61a86a (`pkp/pkp-lib#10826`, for the new
workflow's identifiers work in `pkp/pkp-lib#10821`), whose subject lists
"publisher-id storing" among its fixes without giving a reason. Before
it, the line stored the posted value unconditionally.

The code shows why a guard is needed. When no box is posted (the tab has
none because Publisher ID is off for that kind and only a URN is shown,
or the box is disabled), the value is `null`. OMP's
`Chapter::setStoredPubId(string $pubIdType, string $pubId)`, typed in
2024, throws on `null`. On the other items, `null` would erase a value
stored while the box was on. The guard keeps `null` out, but it also
drops the empty string a person sends by emptying the box.

Reach, where a stale ID goes (code, unless marked):

- The Native XML export of the galley or format
  (`RepresentationNativeXmlFilter`).
- The duplicate check of the tabs (`anyPubIdExists()`), which refuses
  the same value on another galley, chapter or format of the context.
- A URN suffix built with "%x" by the URN plugin, and a DOI suffix built
  with "%x" from a custom DOI pattern (each app's
  `PubIdPlugin::generateCustomPattern()`, which the apps' DOI
  `Repository::generateSuffixPattern()` also calls; OJS and OMP list
  "%x Custom Identifier" in the DOI settings' help), when the identifier
  is generated after the removal was tried.
- No reader template, and none of the deposit or export plugins besides
  Native XML (Crossref, DataCite, DOAJ, PubMed, JATS template, OMP's
  ONIX), reads a galley's, chapter's or format's publisher ID; the JATS
  and PubMed IDs are the publication's.
- An issue galley's Publisher ID is set in its own form
  (`IssueGalleyForm`), which stores the value unconditionally and
  empties.

## Proposed fix

Tell "no box posted" (`null`) from "box emptied" (`''`) in
`PKPPublicIdentifiersForm::execute()`, and remove the stored value on
the second
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publisher-id-on-tab-never-removed/fix.diff),
the same file for the three apps):

```diff
         $pubObject = $this->getPubObject();
-        if ($this->getData('publisherId')) {
-            $pubObject->setStoredPubId('publisher-id', $this->getData('publisherId'));
+        $publisherId = $this->getData('publisherId');
+        // null: no box was posted (none on this tab, or a disabled one), so the stored value stays
+        if ($publisherId !== null) {
+            if ($publisherId !== '') {
+                $pubObject->setStoredPubId('publisher-id', $publisherId);
+            } else {
+                $pubObject->unsetData('pub-id::publisher-id');
+            }
         }
```

The request trims posted strings and returns `null` for a field that was
not posted, so the two cases are told apart reliably. A disabled box
never gets this far, since `validate()` refuses a read-only tab. Unsetting
the data lets each DAO remove the row the way it already removes any
unset setting: `updateSettings()` in the `EntityUpdate` trait that
`EntityDAO` uses deletes a schema property that is not set, and
`DAO::updateDataObjectSettings()` deletes an additional field the object
does not hold.

Tried on `main` on the three apps: with the fix in, the reopened tabs
are empty after the emptied box's "Save". A second walk checks the
guard's purpose, on an OJS galley and an OMP chapter: changing the ID
to another value still saves, and with "Publisher ID" switched off and
the URN plugin on, a "Save" of the tab without the box keeps the stored
ID, with the fix in as without it.

**Alternatives**

- Store the posted value unconditionally, as 3.4 did: brings back the
  `null` problems the guard solved.
- `setStoredPubId('publisher-id', '')`: works, but leaves rows with an
  empty value, and `null` still needs its own branch.
- Decide from the context's "Enable for …" setting instead of the posted
  value: the rule that shows the box is computed in each app's
  `PublicIdentifiersForm::fetch()`, so it would need moving into the
  shared form first.

**What goes with it**

- No data repair: a value someone tried to remove cannot be told from one
  that was meant to stay.
- No API or plugin hook changes.
- Backport: the hunk applies to 3.5 as written. 3.4 and 3.3 do not have
  the guard.
- Guard: an e2e scenario in pkp-e2e's spec U44 that saves, empties and
  reopens a galley's and a chapter's "Identifiers" tab.

Small: a few lines in one pkp-lib method, following how the DAOs already
remove unset settings, plus the test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publisher-id-on-tab-never-removed/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/publisher-id-on-tab-never-removed/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). With `neighbour` as its argument it
  takes the second walk (OJS galley, OMP chapter; OPS has no URN plugin,
  so its tab disappears with the box off). The fix was tried with
  `node bin/try-fix.js apply <diff> ojs omp ops`; its comment line was
  reworded after the trial.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, with the same
  observation on both; a database read after each save found the
  `pub-id::publisher-id` row of the galley, chapter or format unchanged
  after the emptied save (with the fix in, no row).
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794, OPS
  c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (pkp-lib cf3f984335); `stable-3_4_0` OJS
  75cc2d488b, OMP 0aec65441, OPS acd8ae704b (pkp-lib 32b0f4b4af);
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161 (pkp-lib
  f6ab331645).
- 3.5 (walked), 3.4 and 3.3 (code): read `PKPPublicIdentifiersForm`
  `execute()` (3.3: `.inc.php`). 3.5 has the guard (3fdd61a86a is on
  `stable-3_5_0`); 3.4 and 3.3 store the posted value unconditionally, so
  an emptied box stores an empty value and the tab reads empty, and OMP's
  3.4 and 3.3 `Chapter::setStoredPubId()` is untyped.
- Introduced: `git blame` on the guard's line gives 3fdd61a86a; its
  parent has the unconditional `setStoredPubId()`. PR from GitHub's
  `pulls/10826`; neither it nor `pkp/pkp-lib#10821` explains the guard.
  OMP's typed `Chapter::setStoredPubId()` is from dca972683 ("Modernize
  code standards", 2024-06-14).
- Reach read on `main`: `PubIdPlugin::generateCustomPattern()` ("%x")
  in OJS, OMP and OPS; its callers in each app's `classes/doi/Repository.php`;
  the "%x" line of `doi.manager.settings.doiSuffixPattern` in OJS's and
  OMP's `locale/en/manager.po` (OPS's help text does not list it, the
  code substitutes it the same way); a search for `publisher-id` in the
  apps' frontend templates and plugins.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs, for "publisher id cannot be removed",
  "publisher id empty galley", "publisher-id remove", "publisher ID
  delete", "publisher id galley", "publisher id chapter",
  `PKPPublicIdentifiersForm` and `publisherId execute`. `pkp/pkp-lib#8946`
  (cleaning pub-ID code) and `pkp/pkp-lib#10821` (the identifiers work
  that brought the guard) are other work.
- Not driven: the Native XML export, URN and DOI "%x" patterns, the
  duplicate check against a value left behind, and the issue galley form
  (code only). The publication-level Publisher ID emptying on the
  "Metadata" page (with "Enable for Publications" ticked) is the spec's
  earlier walk on all three apps (2026-09-24), not taken again here.
  MySQL not checked (the fault is in the form, not the database).
