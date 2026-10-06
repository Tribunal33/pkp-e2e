# On a press or a preprint server, the References page says metadata lookup "is enabled for this Journal"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: none (code; no metadata lookup)
  - 3.4: none (code; no metadata lookup)
  - 3.3: none (code; no metadata lookup)
- **Introduced** `pkp/pkp-lib#12000` for `pkp/pkp-lib#11902` · [2516e5a60c](https://github.com/pkp/pkp-lib/commit/2516e5a60cb9c201a35cb7c2af771397aed55ba6) · 2025-10-24 · Bozana Bokan (bozana), commit by GaziYucel
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With "References Metadata Lookup" on, the References page of a press or
a preprint server reads "Structuring and Metadata Lookup is enabled for
this Journal."

Editors and authors who open a submission's "References" page see the
sentence above the "Add" box. Nothing else on the page is affected, and
lookup itself works the same.

It shows only once a manager has ticked "Enable references structuring
and metadata lookup" (Settings › Workflow › "Metadata"), which is off in
a new press or server.

## Impact

- **Lost**: nothing.
- **Who**: editors and authors who open a submission's "References"
  page on a press or a preprint server that has turned lookup on.
- **Way round**: none. The sentence is not a setting, and the Custom
  Locale plugin, which could replace it, is neither bundled with OMP or
  OPS nor offered for them in the Plugin Gallery.

Low: wording only, and every task on the page still gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP or OPS `main` (press or server
  `publicknowledge`). Lookup is off there; step 2 turns it on.

Steps:

1. Sign in as `rvaca` (the press's or server's manager).
2. Open Settings › Workflow › "Submission" › "Metadata". Below
   "References" (shown while "Enable references metadata" is ticked, as
   it is in the dataset) stands its own field, "References Metadata
   Lookup": tick "Enable references structuring and metadata lookup" and
   press "Save".
3. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture", from "Active submissions" (OPS: submission 1, "The
   influence of lactation on the quantity and quality of cashmere
   production"). In the side menu choose "Publication" › "References"
   ("Preprint" › "References").
4. Read the text under the heading "Structured References", above the
   "Add" box.

**Expected**: a sentence that fits a press or a server, or that names
no kind of context at all.

**Observed**: on both,

```
Structured References
Structuring and Metadata Lookup is enabled for this Journal. The system will process your references and retrieve DOIs and other metadata from external sources. This may take some time, but you can continue working on your submission and return to this page later to view the updated structured citations.
```

On OJS the same steps (submission 5, "Genetic transformation of forest
trees") show the same sentence, which is right for a journal.

## Cause

ui-library's `CitationManager.vue` (`src/managers/CitationManager/CitationManager.vue`,
lines 7–12) shows the text of
`submission.citations.structured.citationsMetadataLookup.description`
whenever the context has lookup on. That string lives only in lib/pkp's
`locale/en/submission.po` (line 495), and names a journal. Neither OMP's
nor OPS's `locale/en` defines the key, so a press and a server show the
journal wording.

The key's first text ("This section helps you structure your
references. Clicking "Enable Metadata Lookup" …", 4730f6707e) named no
journal.

Reach:

- Screens: the workflow's "References" page only; no other component and
  no PHP code reads the key (checked in the code).
- Languages: the key exists in English only; no translation carries it
  yet (checked in the code).
- The same file: the other `submission.citations.structured.*` strings
  name no journal ("Journal Information" is the cited work's journal).

## Proposed fix

Word the shared English string so that it names no journal, press or
server, in lib/pkp `locale/en/submission.po`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-server-lookup-text-says-journal/fix.diff),
against the app root:

```diff
 msgid "submission.citations.structured.citationsMetadataLookup.description"
 msgstr ""
-"Structuring and Metadata Lookup is enabled for this Journal. "
+"Structuring and Metadata Lookup is enabled. "
 "The system will process your references and retrieve DOIs and other metadata from external sources. "
```

Tried on OJS, OMP and OPS `main`: with lookup on, all three then read
"Structuring and Metadata Lookup is enabled. The system will process
your references …". The page with lookup off, as a control, showed no
lookup text and the same "Add" box help and the same line under the
table's title ("The above references have been organised here in a
structured format."), with the fix and without it.

This fixes every app at once, and translators have nothing to redo.

**Alternatives**

- An override of the key in OMP's and OPS's `locale/en/submission.po`
  ("…enabled for this Press", "…for this Server"), the way the apps
  already override lib/pkp keys where a press or a server needs other
  words (OMP's `editor.submission.decision.sendExternalReview`, OPS's
  `about.contact`). It keeps OJS's text, but gives translators three
  strings where one will do.
- A `{$contextName}` variable in the sentence. `CitationManager.vue`
  would have to pass the context's name, a code change for no gain over
  neutral wording.

**What goes with it**

- Test: the U42 e2e scenario that reads the lookup text on a press and a
  server (a Planned item in the spec).

Small: one English string in lib/pkp.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-server-lookup-text-says-journal/walk.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-server-lookup-text-says-journal/walk.js`.
  It takes the Steps on all three apps, OJS as the control; with
  `NB=1` in front it reads the page with lookup off instead.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). OJS's pkp-lib and ui-library commits differ from
  OMP's and OPS's; the string and `CitationManager.vue` are the same in
  both. `stable-3_5_0`: OJS
  c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (lib/pkp cf3f984335), ui-library d4e01883. `stable-3_4_0`: lib/pkp
  767353f4fe. `stable-3_3_0`: lib/pkp ac3fa73402.
- The key is absent from lib/pkp's
  `locale/en` (`en_US` on 3.3) on `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`, and `stable-3_5_0`'s ui-library has no
  `CitationManager`; its References page is the free-text box.
- Code reads: the key in every lib/pkp `locale/*/submission.po` on
  `main`; OMP's and OPS's `locale/en`; every
  `submission.citations.structured.*` English string; the ui-library and
  lib/pkp sources reading the key; every English lib/pkp string naming
  "this journal".
- Custom Locale: no app's `plugins/generic/` on `main` or
  `stable-3_5_0` holds it, and the Plugin Gallery lists it for OJS only
  (`pkp.sfu.ca/ojs/xml/plugins.xml`, newest release 1.4.0.0 for 3.5;
  the OMP and OPS lists do not carry it). Read in the code, it would
  reach this string: the plugin registers its own locale files ahead of
  all others (`Locale::registerPath(…, PHP_INT_MAX)`), and the texts the
  Vue pages use come through the same `Locale::get()`
  (`UITranslator::getTranslationStrings()`, served by `api/v1/_i18n`).
- Introduced: `git blame` on lib/pkp `locale/en/submission.po` line 495
  gives 2516e5a60c, a commit of PR `pkp/pkp-lib#12000`; the key's
  first text came with 4730f6707e (`pkp/pkp-lib#10692`).
- Upstream searched in pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library
  by "Structuring and Metadata Lookup", "Metadata Lookup" journal,
  `citationsMetadataLookup` and "this Journal". Read:
  `pkp/pkp-lib#11902` (the change's issue; no word on the wording).
