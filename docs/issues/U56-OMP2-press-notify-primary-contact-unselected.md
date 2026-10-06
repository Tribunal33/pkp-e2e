# On a press, "Notify Primary Contact" opens with neither "Yes" nor "No" selected

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP; OJS and OPS only on contexts upgraded from 3.3 (code)
  - 3.5: OMP; OJS and OPS only on contexts upgraded from 3.3 (code)
  - 3.4: OMP (code); OJS and OPS only on contexts upgraded from 3.3 (code)
  - 3.3: none (code; no "Notify Primary Contact")
- **Introduced** `pkp/pkp-lib#6933` and `pkp/omp#957` for `pkp/pkp-lib#6272` · [85aa827895](https://github.com/pkp/pkp-lib/commit/85aa827895e2b6ab56f57ae39a8fbcffc5e1cefd) · 2021-04-08 · Henrique Ramos (henriqueramos)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U56 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#omp2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Notify Primary Contact" on the workflow settings' "Emails" screen
decides whether the press's primary contact gets a copy of the
submission acknowledgement email. On a press, it opens with neither
"Yes, send a copy to rvaca@mailinator.com" (the primary contact's
address) nor "No" selected, both on an existing press and on a new
one. A journal and a preprint server open at "No".

No copy is sent until a manager saves "Yes", so the press behaves as if
"No" were chosen, but the screen shows no choice. Saving the screen
leaves both options blank until the manager picks one; from then on the
saved choice shows.

The fix is medium rather than small because existing presses, and
journals and servers upgraded from 3.3, have no stored value: a new
default fixes only presses created afterwards, and an upgrade step has
to fill in the rest.

## Impact

- **Lost**: nothing; the screen does not show the choice in force.
- **Who**: every press manager who opens Settings › Workflow › "Emails"
  before saving a choice there.
- **Way round**: pick a choice and press "Save".

Low: the outcome is right and the screen offers the way round.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OMP; OJS and OPS for the comparison).
  Nothing else.

**The dataset's press:**

1. Sign in as `rvaca`.
2. Open Settings › Workflow and press the "Emails" tab
   (`/index.php/publicknowledge/en/management/settings/workflow#emails`).
3. Under "New Submission", read "Notify Primary Contact" ("Send a copy of
   the submission acknowledgement email to this press's primary
   contact.").
4. Press the form's "Save" without changing anything. "Saved" shows.
5. Reload the page and press the "Emails" tab again.

**A new press:**

1. Sign in as `admin`.
2. Open Administration › "Hosted Presses" and press "Create Press".
3. Fill in "u56g Press" as the name, "u56g" as the initials, "u56g
   Press" and `u56g@example.com` as the contact, Canada as the country
   and `u56gpress` as the path. Tick "English" under "Languages" and
   pick "English" as the "Primary locale" (the dataset's site has two
   languages, and "Save" is refused without them). Tick "Enable this
   press to appear publicly on the site" and press "Save".
4. Open Settings › Workflow › "Emails" of the new press
   (`/index.php/u56gpress/en/management/settings/workflow#emails`).

**Expected**: "No" is selected under "Notify Primary Contact" at step 3,
after step 5, and in the new press.

**Observed**: neither "Yes, send a copy to rvaca@mailinator.com" (in the
new press "Yes, send a copy to u56g@example.com") nor "No" is selected,
in all three places.

The comparison takes the same steps on a journal and a preprint server:
Administration › "Hosted Journals" › "Create Journal" and "Hosted
Servers" › "Create Server", with the same "Languages" and "Primary
locale" choices, and each context's Settings › Workflow › "Emails". Both
show "No" selected every time.

## Cause

"Notify Primary Contact" is the context setting
`copySubmissionAckPrimaryContact`.
`PKPEmailSetupForm::addCopySubmissionAckPrimaryContactField()` gives the
radio group the stored value
(`$this->context->getData('copySubmissionAckPrimaryContact')`) and the
choices `true` and `false`. With no value stored, `getData()` is `null`.
On `main`, `Field::getConfig()` turns that into the field's empty value,
`''`; on 3.5 and 3.4 it stays `null`. Neither `''` nor `null` equals
`true` or `false`, so no radio is checked.
`SendSubmissionAcknowledgement::handle()` copies the contact only when
the value is truthy, so `null` behaves as "No".

A press never has a value stored. pkp-lib's `schemas/context.json`
declares the setting with `"default": false`, and
`PKPContextService::add()` writes the schema's defaults when a context is
created. But OMP's own `schemas/context.json` (lines 33–38) declares
`copySubmissionAckPrimaryContact` again, without a default.
`PKPSchemaService::merge()` replaces pkp-lib's definition of a property
with the app's entire definition, not key by key, so the default is lost.

OMP's entry is from 2018 (88d8a48125, `pkp/pkp-lib#3594`), when nothing
read the setting. 85aa827895 (`pkp/pkp-lib#6272`, 2021) brought the
setting back in pkp-lib with its default and the radio group, and its
OMP pull request (`pkp/omp#957`) left OMP's entry in place. The same
change added no upgrade step, unlike `notifyAllAuthors`, which the 3.4
upgrade writes for every existing context
(`I7265_EditorialDecisions::upNotifyAllAuthors()`).

Reach:

- A "Save" with the choice untouched stores nothing (walked).
- Journals and preprint servers upgraded from 3.3: neither 3.3 nor any
  upgrade step writes the setting, so they hold no value either (code).
  The blank radio group for a missing value was seen on the press.
- The REST API's context answers `copySubmissionAckPrimaryContact: null`
  for the same contexts, where the schema says `false` (code).
- No other app schema entry drops a pkp-lib default (code: every
  property the three apps redefine in `context.json` and the other
  schemas compared with pkp-lib's). OMP's `copySubmissionAckAddress`
  entry also drops pkp-lib's empty default, without a visible effect;
  it has a symptom of its own, a press refusing a comma-separated
  "Notify Anyone" list
  ([U21-OMP2-press-refuses-notify-anyone-list.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-OMP2-press-refuses-notify-anyone-list.md)).

## Proposed fix

One pkp-lib migration, one line in each app's `upgrade.xml`, and one
deletion in OMP's schema. This is a proposal; the team decides. The
diffs, one per app root, each carry the same pkp-lib file:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-primary-contact-unselected/fix-omp.diff),
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-primary-contact-unselected/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-primary-contact-unselected/fix-ops.diff).

1. **New presses (OMP).** Delete OMP's `copySubmissionAckPrimaryContact`
   entry from `schemas/context.json`, so pkp-lib's definition, with its
   default, is the one in force:

   ```diff
   -		"copySubmissionAckPrimaryContact": {
   -			"type": "boolean",
   -			"validation": [
   -				"nullable"
   -			]
   -		},
   ```

2. **Contexts already stored without it (pkp-lib).** A new migration,
   `PKP\migration\upgrade\v3_6_0\I6272_AddCopySubmissionAckPrimaryContactSetting`,
   writes `false` for every context that has no value, the way
   `I7265_EditorialDecisions::upNotifyAllAuthors()` wrote its new
   setting. It finds the context tables with
   `PKP\migration\HasContextNameHelper`, as
   `I12772_UserCommentForeignKeys` and `I13109_PermitPublishedMetadataEdit`
   do. The name takes `I6272_`, the prefix of the issue that brought the
   setting back without this step, since every other `v3_6_0` migration
   is named after its issue; it changes if the team opens a new one.

   ```php
   $rows = DB::table($contextTable)
       ->whereNotExists(fn ($query) => $query->select(DB::raw(1))
           ->from($settingsTable)
           ->whereColumn("{$settingsTable}.{$key}", "{$contextTable}.{$key}")
           ->where("{$settingsTable}.setting_name", 'copySubmissionAckPrimaryContact'))
       ->pluck($key)
       ->map(fn (int $contextId) => [$key => $contextId, 'setting_name' => 'copySubmissionAckPrimaryContact', 'setting_value' => '0'])
       ->all();
   DB::table($settingsTable)->insert($rows);
   ```

3. **Each app (OJS, OMP, OPS).** `dbscripts/xml/upgrade.xml` lists the
   migration in the `<upgrade minversion="3.3.0.0" maxversion="3.5.9.9">`
   block, after its last `v3_6_0` migration and before
   `rebuildSearchIndex`.

The fix was tried on an install upgraded from the 3.5 dataset, whose
press has no value. With the fix in, the dataset's press and a new
press both opened at "No", as did a journal and a preprint server. A
"Yes" saved before the migration ran was still selected after it, with
one stored row, on all three apps.

**Alternatives**

- Show a missing value as "No" in `PKPEmailSetupForm`
  (`(bool) $this->context->getData(…)`): one line that fixes the screen
  everywhere, but only this form would read the value correctly. The
  REST API keeps answering `null`, and OMP's entry keeps new presses
  without the default.
- Delete OMP's entry alone: new presses are fixed, but every existing
  press, the dataset's included, and every context upgraded from 3.3
  still opens blank.

**What goes with it**

- OMP's `copySubmissionAckAddress` entry, just above, is deleted by the
  fix for the "Notify Anyone" report; both deletions can go in one OMP
  pull request.
- Backport: the schema deletion applies as it stands to `stable-3_5_0`
  and `stable-3_4_0`; the migration would go into that line's upgrade
  instead of `v3_6_0`.
- The guard: an e2e check that a new press's "Emails" tab opens at "No"
  (a **Planned** item in spec U56).

Medium: a pkp-lib upgrade migration listed in three apps' upgrade
scripts, beside a one-entry deletion in OMP.

## Evidence

- The kept script, which takes the Steps on all three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-primary-contact-unselected/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-primary-contact-unselected/lib.js).
  On an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/press-notify-primary-contact-unselected/walk.js`.
  `MODE=neighbour` checks that a saved "Yes" survives the migration;
  with the fix applied and `PROBE_RUN=nb-in`, it runs the migration's
  `up()` through
  [inapp.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-notify-primary-contact-unselected/inapp.php)
  between the save and the reload.
- The fix was tried on OJS, OMP and OPS `main`, with the three diffs
  applied together. The walk ran on an install loaded from the
  `stable-3_5_0` dataset and upgraded with the app's own
  `php tools/upgrade.php upgrade`, so the migration ran from
  `upgrade.xml`. The "saved Yes" check ran on the `main` dataset, with
  the fix in and out. The migration was then named
  `AddCopySubmissionAckPrimaryContactSetting`; only the name has changed
  since. No unit test was written or run.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL.
  Datasets: pkp/datasets 566bb1f (2026-10-03). Each walk also read the
  context's stored `copySubmissionAckPrimaryContact` rows: none on the
  press before and after the "Save", `0` on the journal and the server.
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04), OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
  and OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OJS
  d68934d0d1, OMP 0aec65441f, OPS acd8ae704b (lib/pkp 767353f4fe);
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads:
  - `main` and 3.5: the three apps' and pkp-lib's `schemas/context.json`,
    `PKPSchemaService::merge()` and `setDefaults()`,
    `PKPContextService::add()`, `PKPEmailSetupForm`, `Field::getConfig()`
    and `FormComponent::getFieldConfig()`,
    `SendSubmissionAcknowledgement`, the upgrade migrations
    (`I7265_EditorialDecisions`, `HasContextNameHelper`, the `v3_6_0`
    ones) and the apps' `upgrade.xml`. A script compared every property
    the three apps redefine in their schemas with pkp-lib's defaults.
  - 3.4: OMP's entry and pkp-lib's default, form and listener as on 3.5;
    `Field::getConfig()` ends in `?? null`; no 3.4 migration or app
    upgrade step writes the setting, while `I7265_EditorialDecisions`
    writes `notifyAllAuthors`.
  - 3.3: OMP's entry is there; pkp-lib has neither the setting nor the
    "Notify Primary Contact" field, and OJS and OPS do not declare it.
- Unverified:
  - Saving "No" on the press was not walked. Saving "Yes" was, and on
    the journal a save sends `false` and stores `0`, which shows "No".
  - An install upgraded from 3.3 was not walked, since no 3.3 dataset
    was upgraded.
  - OJS up to 3.1 read the setting; `pkp/ojs` commit
    [43b3907299](https://github.com/pkp/ojs/commit/43b3907299b8cfd08c0903f672027fc32320beeb)
    (`pkp/pkp-lib#3594`, first released in 3.2.0) removed that read from
    `SubmissionSubmitStep4Form`. No upgrade step on 3.3, 3.4 or `main`
    names the setting, so a journal's row from those releases would
    survive, holding `1` where "Yes" was chosen. That journal would open
    at "Yes" and send copies, which is a different symptom. Not checked
    on an upgraded install; the migration leaves any stored row as it
    is.
- Upstream searches (2026-10-04): pkp/pkp-lib by "Notify Primary
  Contact", "primary contact" with acknowledgement and
  `copySubmissionAckPrimaryContact`; pkp/omp, pkp/ojs and pkp/ops by
  `copySubmissionAckPrimaryContact`, pkp/omp also by "Notify Primary
  Contact" and its schema defaults; pkp/ui-library by an unselected
  radio default. Only the introducing issue and pull request matched.
