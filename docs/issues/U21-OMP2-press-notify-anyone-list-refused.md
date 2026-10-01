# A press manager cannot save two "Notify Anyone" addresses, though the box's help text asks for a comma-separated list

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no "Notify Anyone" box)
- **Introduced** `pkp/pkp-lib#6933` (with `pkp/omp#957`) for `pkp/pkp-lib#6272` · [85aa827895](https://github.com/pkp/pkp-lib/commit/85aa827895e2b6ab56f57ae39a8fbcffc5e1cefd) · 2021-04-19 · Henrique Ramos (henriqueramos)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#omp2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a press, the "Notify Anyone" box (Settings › Workflow › "Emails")
says "Separate multiple email addresses with a comma. Example:
one@example.com,two@example.com". A press manager who enters two
addresses that way and saves is refused with "This is not a valid
email address.". Nothing on the "Emails" tab is saved: any other
setting changed there before the same save is not stored either. A
journal and a preprint server save the same list.

## Impact

- **Lost:** the save itself, with every change made on the tab since
  the last save. The refused changes stay on screen with the error, so
  the manager can correct the box and save again; leaving the page
  discards them. Nothing already stored changes.
- **Who:** press managers who want the submission acknowledgement
  copied to more than one address, each time they try. The error says
  the address is not valid, although each address in the list is.
- **Way round:** one address only, for example a shared mailbox that
  forwards to the others. No setting on screen sends the copy to two
  addresses.

Low: the refusal shows at once, the other changes stay on screen to
save again, and one address works; it would be medium if the refused
save also dropped those changes from the screen, or were silent.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, OMP. Nothing
else: in the dataset "Submission Confirmation" is "Send an email to all
authors.", so "Notify Anyone" shows.

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`) and
   the "Emails" tab. Under "Notify Anyone" the help text reads "A copy
   of the submission acknowledgement email will be sent to any of the
   email addresses entered here. Separate multiple email addresses with
   a comma. Example: one@example.com,two@example.com".
3. Type `one@example.com,two@example.com` into "Notify Anyone".
4. Press "Save".
5. Reload the page and open the "Emails" tab again.

**Expected:** "Saved" shows, and after the reload "Notify Anyone"
holds `one@example.com,two@example.com`.

**Observed:** no "Saved"; under the box:

```
This is not a valid email address.
```

The save answers 400 with
`{"copySubmissionAckAddress":["This is not a valid email address."]}`.
After the reload "Notify Anyone" is empty.

Control: the same steps on OJS and OPS (same dataset) show "Saved" and
keep the list; `one@example.com` alone saves on OMP.

With a second change in the same save: at step 3 also select "Do not
send the email to editors." under "Editorial Statistics". After step 4
it is still selected on screen, beside the error; after the reload
"Send a monthly email to editors." is selected again. The refused save
had sent all six fields of the tab.

## Cause

The context settings are validated against the context schema, which
`PKPSchemaService::get()` builds from `lib/pkp/schemas/context.json`
and then the app's own `schemas/context.json`. `merge()` replaces a
property the app defines whole, so the app's entry wins.

`lib/pkp/schemas/context.json` defines `copySubmissionAckAddress` as a
string validated only as `nullable`. `PKPContextService::validate()`
then splits it on commas and checks each part with
`email_or_localhost` ("One or more of these email addresses is not
valid."). `SendSubmissionAcknowledgement` splits it on commas too and
Bccs each address; it trims only the whole string, but Symfony's
`Address` trims each address, so the result is the same. OMP's `schemas/context.json` (lines 26–32) still
defines the property itself, as one `email_or_localhost` value:

```json
"copySubmissionAckAddress": {
    "type": "string",
    "validation": [
        "nullable",
        "email_or_localhost"
    ]
},
```

So on a press the schema's single-address rule fails on the whole
list. The per-address check runs as well and passes, but the first
error is enough to refuse the save. OJS's and OPS's schemas do not
define the property.

The OMP entry dates from 2018 (88d8a48125, `pkp/pkp-lib#3594`), when
the press kept its own single copy address. `pkp/pkp-lib#6272`
re-added the setting for all apps as a comma-separated list: its
pkp-lib commit 85aa827895 added the shared property, the per-address
check and the help text, and its OMP part (`pkp/omp#957`) left the
press's older entry in place.

Reach:

- The OMP entry for `copySubmissionAckPrimaryContact` is the same
  leftover. Its validation matches pkp-lib's, but neither OMP entry
  has a default. So a new press gets no row for either setting, where
  a new journal or server gets `false` and `""` (checked in the
  dataset). No behaviour differs: `getData()` then returns `null`,
  which every use of the two settings treats like `false` or `""`
  (checked in the code).
- No other property in the three apps' schemas overrides a pkp-lib
  property with different validation, apart from the intended
  `submissionFile.fileStage` (OMP) and `submission.stageId` (OPS)
  (checked in the code).
- The Emails tab saves through the REST API (`PUT /contexts/{id}`),
  so an API client is refused a list on a press the same way (checked
  on screen through the tab's own request).

## Proposed fix

A proposal; the team decides. Remove OMP's own entries for both
settings from `schemas/context.json`, so the press uses pkp-lib's
definitions as OJS and OPS do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-anyone-list-refused/fix.diff)):

```diff
-		"copySubmissionAckAddress": {
-			"type": "string",
-			"validation": [
-				"nullable",
-				"email_or_localhost"
-			]
-		},
-		"copySubmissionAckPrimaryContact": {
-			"type": "boolean",
-			"validation": [
-				"nullable"
-			]
-		},
```

This keeps the intent of `pkp/pkp-lib#6272`, which made pkp-lib the
owner of the setting, and leaves one definition of it.

Tried on `main`, OMP: `one@example.com,two@example.com` saves ("Saved")
and is still there after a reload. One address still saves, and
`one@example.com,not-an-address` is still refused, now with "One or
more of these email addresses is not valid." alone (without the fix
both messages show). OJS and OPS behave the same with the fix.

**Alternatives:**

- Remove only the `email_or_localhost` rule from OMP's entry: fixes
  the list but keeps a second definition that has already drifted
  from pkp-lib's (no default, no description).
- Change the help text on a press to ask for one address: takes away
  a feature the other apps have, from shared code that sends to every
  address in the list.

**What goes with it:**

- No data repair: no press can hold a list today, and a stored single
  address stays valid.
- Backport: the same two entries are in OMP `stable-3_5_0` and
  `stable-3_4_0`; the diff applies to both as written (checked with
  `patch --dry-run`).
- Guard: an e2e check that saves two addresses on each app's Emails
  tab (a **Planned** item in spec U21).

Small: two entries removed from one file in OMP, and a check.

## Evidence

- Kept script, on a fresh load of the default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-anyone-list-refused/walk.js)
  takes the Steps on all three apps and records the box's help text,
  value and error, the save's answer and the stored setting:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-notify-anyone-list-refused/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NEIGHBOUR=1` in
  front saves `one@example.com`, then `one@example.com,not-an-address`,
  to show that with the fix a single address still saves and a list
  with a bad address is still refused. `ALSO=1` in front adds the
  "Editorial Statistics" change to the same save (the paragraph after
  Observed; walked on OMP `main`).
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/press-notify-anyone-list-refused/fix.diff omp`,
  then `walk.js` on OMP and `walk.js` with `NEIGHBOUR=1` on all three
  apps, then `node bin/try-fix.js revert shared/playwright/checks/issues/press-notify-anyone-list-refused/fix.diff omp`;
  `NEIGHBOUR=1` on OMP without the fix for the comparison.
- What a refused save stores (code, besides the `ALSO=1` walk):
  `PKPContextController::edit()` validates all the posted fields and
  answers 400 before `PKPContextService::edit()` stores any of them.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` (OJS bade233f73, OMP 3b0ecf794c, OPS
  c8af945bb7; their `lib/pkp` 2e377d27fc, 3dc90c81a6, 3dc90c81a6) and
  `stable-3_5_0` (OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd;
  `lib/pkp` a9c76aed62). On 3.5 OMP refuses the list with the same
  message and answer, and OJS and OPS save it.
- 3.5 (code): OMP 3081c9b00d `schemas/context.json` has the same entry;
  `lib/pkp` a9c76aed62 `PKPContextService` has the per-address check.
- 3.4 (code): OMP `stable-3_4_0` (0aec65441) `schemas/context.json` has
  the same entry; `lib/pkp` `stable-3_4_0` (df13621c2d) has pkp-lib's
  `nullable` property with the comma help text, the per-address check
  in `PKPContextService` and the "Notify Anyone" field in
  `PKPEmailSetupForm`.
- 3.3 (code): `lib/pkp` `stable-3_3_0` (d446601ebe) has no
  `copySubmissionAckAddress` in its classes or schema (only obsolete
  translations); OMP `stable-3_3_0` (8e72fc883) keeps the schema entry,
  but no screen offers the box.
- Introduced: `git blame` on OMP `schemas/context.json` lines 26–32
  gives 88d8a48125 (2018-12-21, Nate Wright, `pkp/pkp-lib#3594`), when
  the entry was right. `git log -S copySubmissionAckAddress` on
  pkp-lib's `schemas/context.json` and `PKPContextService` gives
  85aa827895 (`pkp/pkp-lib#6272`, PR `pkp/pkp-lib#6933`, merged
  2021-04-19); OMP's part of the change, 631258c320 (merged in
  `pkp/omp#957`), touched only the old submission form and a locale
  file.
- Search for other instances: every property of the three apps'
  `schemas/*.json` that pkp-lib's schemas also define, compared by
  validation.
- Upstream search (2026-10-01), issues and PRs, open and closed:
  pkp/pkp-lib by `copySubmissionAckAddress`, "Notify Anyone",
  acknowledgement with multiple addresses and comma, and
  `email_or_localhost` with schema; pkp/omp by
  `copySubmissionAckAddress`, acknowledgement email copy, and "not a
  valid email"; pkp/ui-library by "Notify Anyone". Only
  `pkp/pkp-lib#6272` and its PR came up.
- Not driven: a submission on a press with two addresses saved (the
  copies to both addresses; `SendSubmissionAcknowledgement` is shared
  and splits on commas, read in the code); languages other than
  English; MySQL not checked (nothing depends on it).
