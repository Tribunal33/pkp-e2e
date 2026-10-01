# A preprint server's "DOIs" settings box is labelled "Allow … (DOIs) to assigned to works …"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; no "DOIs" settings tab)
- **Introduced** `pkp/ops#252` for `pkp/pkp-lib#4056` · [a607c43790](https://github.com/pkp/ops/commit/a607c43790a70d13928e31df2aed7955c6f9fb58) · 2022-05-06 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ops1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager of a preprint server opens Settings › Distribution › "DOIs".
The box under "DOIs" is labelled "Allow Digital Object Identifiers (DOIs)
to assigned to works published on this server."; "to be assigned" is
meant.

Only the English label of a preprint server has the slip. A journal's
and a press's labels read correctly.

## Impact

- **Lost.** Nothing. The sentence is still understood and the box works.
- **Who.** Every manager of a preprint server who opens the "DOIs"
  settings in English.
- **Way round.** None is needed.

Low: a wording slip in one label.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Distribution, the "DOIs" tab, its "Setup" side tab
   (`/index.php/publicknowledge/management/settings/distribution#dois`).
3. Read the label of the box under "DOIs".

**Expected.** "Allow Digital Object Identifiers (DOIs) to be assigned to
works published on this server."

**Observed.** "Allow Digital Object Identifiers (DOIs) to assigned to
works published on this server."

The journal's and the press's labels are not affected: the same box on a
journal reads "…to be assigned to work published in this journal.", and
on a press "…to be assigned to work published by this press."

## Cause

The label is the locale string `manager.setup.enableDois.description`,
which each app defines for itself and
`PKPDoiSetupSettingsForm::__construct()` in pkp-lib prints as the box's
label. OPS's English text in `locale/en/manager.po` (lines 186 to 189)
lacks "be"; the diff under "Proposed fix" shows the lines.

The sentence came in with `pkp/ops#252`, which replaced the earlier
label ("Assign Digital Object Identifiers (DOIs) to preprints and
galleys."). OJS's and OMP's own texts of the same key hold "to be
assigned".

Reach:

- The string is used once, by that form (checked in the code: one caller
  of the key in OPS and its pkp-lib).
- No other English string of OPS, its pkp-lib or its plugins holds "to
  assigned to" as a slip (checked in the code; the two other hits, in
  pkp-lib's `manager.po`, are the correct "sent to assigned editors").
- The other languages did not copy the slip where they were read
  (checked in the code): the German text is a complete sentence
  ("Erlauben Sie die Zuweisung von Digital Object Identifiers (DOIs) für
  auf diesem Server veröffentlichte Werke."), and the Canadian French
  and Spanish files hold the key with an empty translation. The other
  languages were not read.

## Proposed fix

Add the missing word in OPS's `locale/en/manager.po`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-dois-box-label-wording/fix.diff)):

```diff
 msgid "manager.setup.enableDois.description"
 msgstr ""
-"Allow Digital Object Identifiers (DOIs) to assigned to works published on "
-"this server."
+"Allow Digital Object Identifiers (DOIs) to be assigned to works published "
+"on this server."
```

This is a proposal. It was tried on OPS `main`: the box then reads "Allow
Digital Object Identifiers (DOIs) to be assigned to works published on
this server.", and the "Items with DOIs" help below it and the journal's
and the press's labels read as before.

**Alternatives**

- Moving the sentence to pkp-lib as one shared string: not proposed,
  since each app names its own kind of work and place ("in this
  journal", "by this press", "on this server").

**What goes with it**

- What happens to the existing translations when the English source
  changes (kept, or flagged for review): not checked.
- The same change applies as written to `stable-3_5_0` and
  `stable-3_4_0`, where the file holds the same four lines.
- No test is proposed for a label's wording; the kept script below reads
  it.

Small: one word in one locale file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-dois-box-label-wording/walk.js).
  It takes the steps as `dbarnes` on the default dataset on OJS, OMP and
  OPS and reads the box's label and the "Items with DOIs" help. Run on
  `main`:
  `PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/preprint-server-dois-box-label-wording/walk.js`;
  on 3.5 with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front and
  `PROBE_FEATURE=issues-ir1-3_5`.
- Walked on `main` and on `stable-3_5_0`, OJS, OMP and OPS, on the
  default dataset (pkp/datasets 38ab955, 2026-09-30), PostgreSQL. A
  locale string does not depend on the database.
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-server-dois-box-label-wording/fix.diff ops`,
  the same walk, then `revert`. With the fix in, OPS showed the Expected
  label; OJS's and OMP's labels and all three "Items with DOIs" helps
  read the same with the fix in and out.
- Tips: pkp/ops `main` c8af945bb7, `stable-3_5_0` cf4fce69bd,
  `stable-3_4_0` acd8ae704b, `stable-3_3_0` c5532e2161; OJS `main`
  bade233f73, 3.5 92b9a16b48; OMP `main` 3b0ecf794c, 3.5 3081c9b00d.
- Code reads: `locale/en/manager.po` of OPS on `main`, `stable-3_5_0`
  and `stable-3_4_0` holds the same sentence. On `stable-3_3_0` neither
  OPS nor its pkp-lib has the key `manager.setup.enableDois.description`
  (DOIs are a plugin's settings there). OJS's and OMP's
  `locale/en/manager.po` on `main` hold "to be assigned".
- The trace: `git log -S'to assigned to works' -- locale` in pkp/ops
  names a607c43790 alone; `git blame` on the line names eb1d961fe7
  (2023-01-30), which only re-wrapped the file's lines. The GitHub API's
  `commits/<sha>/pulls` gives `pkp/ops#252`.
- Upstream search (2026-10-01): pkp/pkp-lib and pkp/ops, issues and PRs,
  for "to assigned to works", "DOIs to assigned" and
  `enableDois.description`. No issue or PR is about this label.
- Not driven: 3.4 and 3.3 (read in the code). Unverified: the label in the
  languages other than English, German, Canadian French and Spanish, and
  what a language with an empty translation shows on screen.
