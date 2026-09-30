# A journal's "Delayed Open Access" shows an empty box instead of "Disabled" until a manager picks a value

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2327` for `pkp/pkp-lib#3330` · [46eb7c6237](https://github.com/pkp/ojs/commit/46eb7c6237866758e46649794ff7aa3ebc29b74b) · 2019-03-12 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal that has never saved the "Delayed Open Access" setting,
the list on Settings › Distribution › "Access" shows an empty box
instead of "Disabled", though the journal publishes issues as
"Disabled" does. Pressing "Save" with the box untouched keeps it empty.

Every journal that turns on subscriptions sees the empty box until a
manager saves a choice in it. Before the list moved to the "Access" tab
in 2019, the "Subscription Policies" page showed "Disabled" in the same
case (read in the code).

## Impact

- **Lost.** Nothing: each issue keeps the access set on its own
  "Access" tab (Issues › the issue › "Access"). The manager cannot tell
  from the settings tab whether delayed open access is on, and the list
  has no blank entry matching what the box shows.
- **Who.** A Journal Manager on a journal that requires subscriptions,
  each time they open Settings › Distribution › "Access" until someone
  saves a choice in the list.
- **Way round.** Choose "Disabled" and press "Save"; from then on the box
  reads "Disabled".

Low: a misleading display with nothing lost. It would be higher if the
empty box made issues open on a date nobody chose.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`):
  the journal `publicknowledge`, "Journal of Public Knowledge", whose
  Settings › Distribution › "Access" tab has never been saved. Nothing
  is created.

1. Sign in as `dbarnes`.
2. Open Settings › Distribution
   (`/index.php/publicknowledge/en/management/settings/distribution`) and
   press the "Access" tab. None of the three "Publishing Mode" choices is
   selected.
3. Under "Publishing Mode" choose "The journal will require subscriptions
   to access some or all of its contents.". "Delayed Open Access" appears
   below it.
4. Look at "Delayed Open Access" and open its list.
5. Leave the box untouched and press "Save". "Saved" shows.
6. Reload the page and press "Access" again.

**Expected.** At step 4 the box reads "Disabled", the first entry of its
list and what the journal does. The save at step 5 stores "Disabled",
and after step 6 the tab shows the subscription choice and "Disabled".

**Observed.** At step 4 the box is empty, and none of the list's
entries is selected. The save at
step 5 answers 200 and shows "Saved", but it sends the box as empty and
the journal stores no value for it:

```
publishingMode=1&delayedOpenAccessDuration=&enableOai=true
→ 200, "delayedOpenAccessDuration": null
```

After step 6 the subscription choice is kept and the box is still empty.

Control: choosing "Disabled", pressing "Save" and reloading shows
"Disabled"; the save sends `delayedOpenAccessDuration=0`.

## Cause

[`AccessForm::__construct()`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/components/forms/context/AccessForm.php#L63-L68)
gives the "Delayed Open Access" list the stored setting as its value,
`$context->getData('delayedOpenAccessDuration')`. The setting has no
default in
[`schemas/context.json`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/schemas/context.json#L32-L37),
so a journal that never saved it returns `null`. The list's entries run
from `0` ("Disabled") to `60`, so `null` matches none. The ui-library's
`FieldSelect` binds the native `<select>` to that value, and a `<select>`
bound to a value no option has shows no selection.

The form then posts that empty value on "Save", the API reads it as
`null`, and the journal stores nothing, so the next load shows the same
empty box. The one reader of the setting,
[`IssueGridHandler::publishIssue()`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/controllers/grid/issues/IssueGridHandler.php#L583),
treats a missing value as no delay (it acts only on a value of 1 or
more), so the form is the one place where no stored value does not mean
"Disabled".

The empty box came with 46eb7c6237, which moved the list from the
"Subscription Policies" form to Settings › Distribution › "Access". The
move answered `pkp/pkp-lib#3330`: the "Subscription Policies" form, the
only place to set the delay, could be reached only with payments
enabled. That form drew the list on the server, and a server-drawn
`<select>` with nothing selected shows its first entry, "Disabled", and
posts `0` when saved. The Vue form that replaced it has no such
fallback. This before-side is read in the code; the old form was not
run.

Reach:

- Stored data: a journal that saved the box untouched stores nothing,
  exactly like one that never saved it, so no stored value is wrong and
  there is nothing to repair (seen in the browser run: the stored
  settings after each save).
- The other context lists that take a stored setting with no fallback
  are "Currency" and "Payment Plugins" on Settings › Distribution ›
  "Payments", and the required "Country" on the masthead and the
  journal's form. None has an entry that means "off", so an empty box
  there rightly says nothing is chosen yet. The "ORCID API" and "ORCID
  request log" lists already fall back to their defaults with `??`
  (read in the code).
- "Publishing Mode" on the same tab arrives with no choice selected for
  the same reason (no stored value, no default). Which choice a new
  journal should show is a separate product question, and the fix leaves
  it alone (seen in the browser run: step 2).

## Proposed fix

A proposal; the team decides. Give the list the value the rest of the code already assumes when
nothing is stored, in the form that shows it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delayed-open-access-empty-box/fix.diff)):

```diff
--- a/classes/components/forms/context/AccessForm.php
+++ b/classes/components/forms/context/AccessForm.php
@@ -63,7 +63,7 @@ class AccessForm extends FormComponent
             ->addField(new FieldSelect('delayedOpenAccessDuration', [
                 'label' => __('about.delayedOpenAccess'),
                 'options' => $validDelayedOpenAccessDuration,
-                'value' => $context->getData('delayedOpenAccessDuration'),
+                'value' => $context->getData('delayedOpenAccessDuration') ?? 0,
                 'showWhen' => ['publishingMode', Journal::PUBLISHING_MODE_SUBSCRIPTION],
             ]))
             ->addField(new FieldOptions('enableOai', [
```

This follows the pattern the other form components use for a setting
with a known fallback (`OrcidSettingsForm`'s
`$context->getData(OrcidManager::LOG_LEVEL) ?? OrcidManager::LOG_LEVEL_ERROR`,
the ORCID API type's `?? OrcidManager::API_PUBLIC_PRODUCTION`,
`PKPSiteSecurityForm`'s `?? false`). Tried on OJS `main`: the box reads
"Disabled" at step 4, the untouched save sends `0` and stores it, and
the reload shows "Disabled". With and without the fix, a journal that
saves "6 Months" reads "6 Months" after a reload, and then reads
"Disabled" after a save of "Disabled" and a reload.

**Alternatives**

- A `"default": 0` for `delayedOpenAccessDuration` in
  `schemas/context.json`: defaults are written only when a journal is
  created, so every existing journal would still show the empty box
  unless an upgrade migration also writes `0` for each. It could go
  with the form fix rather than replace it.
- An empty "not set" entry in the list: it would make the empty box
  honest, but an empty value publishes exactly as "Disabled", so the
  list would offer a choice that means nothing different.

**What goes with it**

- Every save of the "Access" tab now stores `0` for a journal with no
  value, whatever the "Publishing Mode": the ui-library's
  `Form.vue` `submitValues()` sends fields that `showWhen` hides, so an
  open-access journal saving only "Enable OAI" writes it too. That is
  harmless, since `publishIssue()` reads the setting only in
  subscription mode and treats `0` as no delay.
- No change to the REST API: a journal that never saved the setting
  still returns `null` for it, and `publishIssue()` is unchanged.
- Backport: the same line exists in 3.5 (the diff applies as written),
  3.4 (`AccessForm.php`, line 69) and 3.3 (`AccessForm.inc.php`, line
  63).
- Guard: neither OJS's nor pkp-lib's Cypress tests cover this tab. The
  team would add a Cypress case: on a journal that has never saved the
  list, choose the subscription mode and check that "Delayed Open
  Access" reads "Disabled". The pkp-e2e scenario for this tab (spec U51,
  scenario 13) checks the same from outside PKP's repos.

Small: one line in one form and a Cypress case, with no data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delayed-open-access-empty-box/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/delayed-open-access-empty-box/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–6 and the Control; `neighbour` saves "6 Months",
  reloads, saves "Disabled", reloads. It records the box's shown entry,
  what each save sent and answered, and the journal's stored settings
  after each save.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/delayed-open-access-empty-box/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–6 and the Control on `main` and on
  `stable-3_5_0`, which matched. No request failed and no page script
  failed. The `main` run without the fix did not catch the brief "Saved" at step 5 (its 200 was recorded).
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    and ui-library
    [280f98c5](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1)
    and ui-library
    [1a7a4750](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with ui-library
    [ee684b34](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with ui-library
    [96959f9e](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708).
- Code reads:
  - main and 3.5: `classes/components/forms/context/AccessForm.php`
    lines 45 and 63–68, `schemas/context.json` lines 32–37 (no default),
    `IssueGridHandler::publishIssue()` (line 583 on main, 579 on 3.5);
    ui-library `FieldSelect.vue` (the `<select>` through `SelectInput`
    with `v-model`, no empty entry); every other `FieldSelect` in OJS's
    and pkp-lib's form components that takes a context setting as its
    value.
  - 3.4: `AccessForm.php` lines 48 and 66–69, `schemas/context.json`
    (no default), `IssueGridHandler.php` line 571, ui-library
    `FieldSelect.vue` (a `<select>` with `v-model`, no empty entry).
  - 3.3: `AccessForm.inc.php` lines 42 and 60–63, `schemas/context.json`
    (no default), `IssueGridHandler.inc.php` line 470, ui-library
    `FieldSelect.vue` (the same `<select>`).
- Introduced: blame on `AccessForm.php` line 66 gives 665ed1f925
  (`pkp/pkp-lib#5678`, formatting to PSR-12, no change to the line); the
  line was added by 46eb7c6237, merged as `pkp/ojs#2327`. Before it,
  `templates/payments/subscriptionPolicyForm.tpl` line 73 rendered the
  list with `fbvElement type="select" … selected=$delayedOpenAccessDuration`,
  which selects nothing for a missing value, so the browser showed the
  first entry, "Disabled" (code; the old form was not driven).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library
  for "delayed open access", `delayedOpenAccessDuration`, "embargo"
  with "dropdown", "empty" and "blank", and `AccessForm`/`FieldSelect`
  with "empty". `pkp/pkp-lib#4925` ("delayedOpenAccessDuration setting
  not used") is a question about whether the delay is applied, answered
  that it is; `pkp/ojs#1799` fixed a typo in the old list in 2018.
  Neither is this fault.
- MySQL not checked; nothing here depends on the database.
