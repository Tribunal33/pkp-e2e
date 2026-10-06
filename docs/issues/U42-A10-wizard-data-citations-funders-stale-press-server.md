# On a press or preprint server, the submission wizard's data citations and funders still read empty after a save

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: none (code; no Data Citations or Funders section in the wizard)
  - 3.4: none (code; no Data Citations or Funders section in the wizard)
  - 3.3: none (code; older form-by-form wizard)
- **Introduced** `pkp/ui-library#746` for `pkp/pkp-lib#6278` · [1437a3de](https://github.com/pkp/ui-library/commit/1437a3decb02cc644b49c17b73ca36e210d95d6d) · 2026-02-12 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a10), spec U43 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press or a preprint server, an author who adds a data citation or a
funder on the submission wizard's "Details" step sees no change after
"Save": the Data Citations table still reads "No data citations have been
added.", the Funders table "No funders have been added.", and the "Review"
step lists both as "None provided". A second data citation does not show
either, an edited data citation keeps its old title, and a deleted one
stays listed.

Every save is stored, so an author who adds the entry again, as the empty
table invites, submits it twice. Where the press or server requires data
citations or funders, "Review" also warns that they are required, but
"Submit" goes through.

It happens in both sections. A new press or server asks for funders by
default; data citations appear when the press or server turns them on.

## Impact

- **Lost**: nothing typed is lost. The screen says the opposite of what
  is stored: entries look missing after an add, and still present after a
  delete. An entry added a second time is stored twice and submitted with
  the submission, and nothing on screen shows the duplicate.
- **Who**: every author (or editor) submitting to a press or a preprint
  server that asks for funders or data citations, at every add, edit or
  delete in those two sections.
- **Way round**: reload the page. The wizard reopens on "Upload Files",
  and from there every step shows what is stored, duplicates included,
  which the author can then delete.

Medium: the empty table leads an author to save the same funder or data
citation again, and that duplicate is stored and submitted unseen; with
nothing lost and "Submit" never blocked, it would be low if a re-add
could not happen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP or OPS (`publicknowledge`).
  It asks for funders at submission already; data citations are off, so
  step 1 turns them on.
- The browser can reach `api.ror.org`: the funder box searches the ROR
  registry as the author types, from the fourth character on, and a ROR
  error opens a dialog that stops step 7.

Adding and editing (OMP and OPS):

1. Sign in as `rvaca`. Settings › Workflow › "Metadata": under "Data
   Citations" tick "Enable data citation metadata", choose "Ask the
   author for data citation metadata during submission.", press "Save".
   Log out.
2. Sign in as an author: `afinkel` on OMP, `ccorino` on OPS. Open "New
   Submission" (`/index.php/publicknowledge/en/submission`).
3. Type the title "u42r2 Stale wizard tables", choose "English" as the
   submission language, tick the two boxes, press "Begin Submission".
4. Press "Continue" to "Details".
5. In the "Data" section press "Add Data Citation", type "Ocean
   temperature records" in "Title", choose "Supporting data without
   specifying whether they were generated or analyzed (supporting)." as
   "Relationship type", press "Save".
6. Press "Add Data Citation" again: "Coastal salinity series", the same
   relationship type, "Save".
7. In the "Funders" section press "Add Funder", type "Test Foundation",
   pick the typed text "Test Foundation" at the top of the suggestions,
   press "Save".
8. Press "Continue" to "Review" and read "Data Citations" and "Funders"
   under "Details".
9. Reload the page (the wizard reopens on "Upload Files"), press
   "Continue" to "Details".
10. On the "Ocean temperature records" row open "More Actions" › "Edit",
    change the title to "Ocean temperature records 2020", press "Save".
11. Press "Continue" to "Review".

Required, added twice, deleted (walked on OMP):

12. Start from a freshly loaded dataset. Sign in as `rvaca`. Settings ›
    Workflow › "Metadata": under "Data Citations" tick "Enable data
    citation metadata" and choose "Require the author to add data
    citation metadata before accepting their submission."; under
    "Funders" choose "Require the author to add funder metadata before
    accepting their submission."; press "Save". Log out.
13. Sign in as `afinkel`, start a submission as in steps 2 and 3, title
    "u42r2 Required and re-added". On "Upload Files" upload any file and
    choose "Book Manuscript". Press "Continue" to "Details".
14. Add the data citation "Ocean temperature records" as in step 5, then
    add the same one again.
15. Add the funder "Test Foundation" as in step 7, then add it again.
16. Press "Continue" to "Review".
17. Reload, press "Continue" to "Details".
18. On the first "Ocean temperature records" row open "More Actions" ›
    "Delete", press "OK".
19. Press "Continue" to "Review", then "Submit" and "Submit" in the
    confirmation.

**Expected**: after each "Save" or delete the table shows the change at
once. "Review" lists exactly what is stored: at step 8 "Ocean temperature
records", "Coastal salinity series" and "Test Foundation"; at step 11
"Ocean temperature records 2020" in place of the first. At step 16 the
author sees each entry twice and no "required" warning.

**Observed** (OMP and OPS alike for steps 1–11; OMP for 12–19): each save
and the delete answer 200 and close their window, and no other request
follows. After steps 5 and 6 the Data Citations table still reads "No
data citations have been added.", and after step 7 the Funders table "No
funders have been added.". At step 8 "Review" reads:

```
Data Citations
None provided
Funders
None provided
```

After the reload (step 9) both tables list everything. After step 10 the
row still reads "Ocean temperature records", and "Review" (step 11) lists
"Ocean temperature records" and "Coastal salinity series"; only a second
reload shows the new title.

In steps 14 and 15 both tables stay empty after each of the two adds,
and two data citations and two funders are stored. At step 16 "Review"
reads:

```
Data citations are required.
Data Citations
None provided
Funders are required.
Funders
None provided
```

and "Submit" is enabled. After the reload (step 17) the tables list
"Ocean temperature records" twice and "Test Foundation" twice. After the
delete (step 18) both data citation rows stay in the table, and "Review"
(step 19) lists "Ocean temperature records" twice. "Submit" leads to
"Submission complete"; the submission holds one data citation and two
"Test Foundation" funders. No server or script error.

On OJS steps 1–11 show each save at once: after every save the page
fetches the submission and the publication again, and "Review" lists the
new entries.

## Cause

`SubmissionWizardPage.vue` (ui-library) holds the refresh in its
`setup()` (lines 36–49): `useDataChangedProvider()` provides
`triggerDataChange`, which reloads the submission and the publication.
`DataCitationManager` and `FunderManager` call it through
`useDataChanged()` after every add, edit, delete and order save
(`dataCitationManagerStore.js`, `funderManagerStore.js`). Their tables,
and the "Review" items, read `publication.dataCitations` and
`submission.funders`, which only that reload replaces.

A press and a preprint server do not mount `SubmissionWizardPage`. Their
`js/load.js` registers `SubmissionWizardPageOMP.vue` and
`SubmissionWizardPageOPS.vue`, which reuse it with `extends:
SubmissionWizardPage`. The page template calls `pkp.registry.init`,
which deep-copies the registered component and creates the app from the
copy: on OJS the copy carries `setup`, on OMP and OPS it has none. Vue
runs only the component's own `setup` (`setupStatefulComponent()` reads
`Component.setup`), never one reached through `extends`. So on OMP and
OPS nothing provides `triggerDataChange`, `useDataChanged()` finds no
provider and falls back to a no-op (`useDataChanged.js` lines 32–36,
`triggerDataChange = () => {}`), and every save leaves the page's copy of
the submission as it was loaded.

The `setup()` came with data citations, `pkp/ui-library#746`
(1437a3de); the subclasses are older (3.4). `pkp/ui-library#813` (Funder
data) reused the same refresh for funders.

Reach:

- The Data Citations table and the Funders table of the wizard's
  "Details" step: add, edit, delete and "Save Order" (checked in the
  code; add, edit and delete walked).
- The "Review" step's "Data Citations" and "Funders" items and their
  "required" warnings, which read the same objects (walked).
- No other wizard section uses `useDataChanged()`: contributors, reviewer
  suggestions, OMP's chapters and OPS's galleys update through events
  (checked in the code). Of the components in ui-library that a subclass
  `extends`, `SubmissionWizardPage` is the only one with a `setup()`, so
  no other page loses its provider this way (checked in the code; the
  app repos' own `extends` are two URN plugin fields in OJS and OMP,
  without `setup()`).
- Not the workflow's "Data" and "Funding" pages: the workflow provides
  its own refresh (`workflowStore.js`), on every app (checked in the
  code).
- Stored data is what the author saved; nothing to repair.

## Proposed fix

Give both subclasses the parent's `setup()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-tables-stale-press-server/fix.diff)):

```diff
 export default {
 	extends: SubmissionWizardPage,
+	// Vue does not inherit setup() through `extends`: run the parent's, which
+	// provides the data-change refresh the wizard's managers call after a save.
+	setup: SubmissionWizardPage.setup,
 	data() {
```

in `src/components/Container/SubmissionWizardPageOMP.vue` and
`SubmissionWizardPageOPS.vue`, then the ui-library submodule bump in
pkp/omp and pkp/ops. Handing a parent's `setup` to a subclass is new to
the code base; no component does it today. The parent's `setup()` uses
`getCurrentInstance()` and calls `reloadSubmission()` /
`reloadPublication()` through the instance, so it works unchanged on the
subclass, whose methods include the parent's.

Tried on OMP and OPS: with the fix each save fetches the submission and
the publication again, every table and "Review" show the change at once
(the Expected of steps 1–11), and the press's chapters and the server's
galleys added in the wizard still reach "Review" as they do without it.

**Alternatives**:

- Move the provider into the parent's options (`provide()`, which
  `extends` does merge): it covers any future subclass too, but rewrites
  `useDataChangedProvider()` as options, a second way of doing what the
  composable already does.
- Replace the two subclasses by composition (the parent taking the
  press's chapters and the server's galleys as features): the cleaner
  long-term shape, but a far larger change for the same result.

**What goes with it**:

- No data repair, no API or plugin change.
- Optionally, a development warning in `useDataChanged()` when no
  provider is found, which would have shown this at once.
- The guard: the U42 and U43 wizard scenarios on OMP and OPS assert the
  new row and the "Review" item right after "Save", without a reload (a
  **Planned** item in each spec), or a ui-library test that mounts
  `SubmissionWizardPageOMP` and `SubmissionWizardPageOPS` and checks that
  `triggerDataChange` is provided.

Medium: one line in each of two ui-library files, but in a way the code
base has not used before, and it reaches users only with submodule bumps
in two app repos, plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-tables-stale-press-server/walk.js)
  (helpers in `lib.js` beside it), on PKP's default test dataset freshly
  loaded:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-tables-stale-press-server/walk.js <mode>`.
  `steps` takes steps 1–11 (OJS as the control) and a second reload;
  `severity` takes steps 12–19 and reads what is stored after each;
  `neighbour` adds an OMP chapter or an OPS galley in the wizard and
  reads "Review", the check that the fix leaves the subclasses' own
  wiring alone (walked with the fix in and out).
- Walked on `main`, PostgreSQL, pkp/datasets 566bb1f (2026-10-03), at
  OJS ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363), OMP
  3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6, ui-library
  280f98c5). The files of the Cause are the same in both ui-library
  commits. The browser reached `api.ror.org` (200) during the funder
  steps.
- Mount path: `lib/pkp/templates/layouts/backend.tpl` calls
  `pkp.registry.init`; `VueRegistry.init()` copies
  `pkp.controllers[type]` with `$.extend(true, …)` and passes the copy to
  `createApp()`.
- Vue 3.5.18 (the apps' `node_modules`): `extends` copies the parent's
  `setup` into the merged options (`resolveMergedOptions()`), but
  `setupStatefulComponent()` takes `const { setup } = Component`, so the
  merged copy is never called.
- 3.5 (code): `stable-3_5_0` at OMP 9c5e24246 and OPS 38b61882d3
  (lib/pkp cf3f984335, ui-library d4e01883): `SubmissionWizardPage.vue`
  has no `setup()`, ui-library has no `DataCitationManager` or
  `FunderManager`, and `templates/submission/wizard.tpl` mounts neither.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` (OMP 0aec65441, OPS
  acd8ae704b, lib/pkp 767353f4fe, ui-library ee684b34) has the
  `extends` subclasses but no `setup()` in the parent and neither
  section; `stable-3_3_0` (OMP 8e72fc883, OPS c5532e2161, lib/pkp
  ac3fa73402, ui-library 96959f9e) has neither subclass nor section.
- Introduced: `git blame` on the `setup()` lines of
  `SubmissionWizardPage.vue` names 1437a3de ("pkp/pkp-lib#6278 Implement
  Data Citations support"); the GitHub API's `commits/<sha>/pulls`
  names `pkp/ui-library#746` (ajnyga, merged 2026-02-14). The funders'
  use of the refresh came with 32636ed8, `pkp/ui-library#813` (merged
  2026-07-06).
- Upstream: `pkp/pkp-lib`, `pkp/ui-library`, `pkp/omp` and `pkp/ops`
  searched on 2026-10-04 for the symptom ("wizard funders refresh",
  "data citations wizard", "funder not showing until reload", the two
  empty-table texts) and the cause (`SubmissionWizardPageOMP`,
  `useDataChangedProvider`, `triggerDataChange`). The hits
  (`pkp/pkp-lib#12392`, `pkp/pkp-lib#6278`, `pkp/ui-library#746`,
  `pkp/ui-library#813`) are the features' own issues and pull requests;
  none mentions a stale wizard on a press or a server.
- Not walked: steps 12–19 on OPS (the same component path as OMP).
