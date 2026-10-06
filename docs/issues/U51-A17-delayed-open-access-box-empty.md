# "Delayed Open Access" shows an empty box instead of "Disabled" until a manager saves a choice

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2327` for `pkp/pkp-lib#3330` · [46eb7c6237](https://github.com/pkp/ojs/commit/46eb7c6237866758e46649794ff7aa3ebc29b74b) · 2019-03-12 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U51 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a17)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Distribution › "Access", the "Delayed Open Access" list
shows an empty box instead of "Disabled" on a journal that has never
saved a choice in it. The list appears once "Publishing Mode" is set to
subscriptions. Pressing "Save" with the list untouched shows "Saved",
stores nothing for it, and the box stays empty on every later visit.

The journal behaves as "Disabled", so nothing is published differently.
Only the screen does not say which setting is in force.

It concerns subscription journals whose managers have never saved this
list. Every journal created on OJS 3.2 or later starts that way.

## Impact

- **Lost**: nothing; the box does not show that delayed open access is
  off.
- **Who**: the manager of a subscription journal that has never saved a
  choice in "Delayed Open Access", each time they open the "Access"
  tab. A journal whose manager saved the old "Subscription Policies"
  form before OJS 3.2 kept a stored value through its upgrades and is
  not affected (read in the code).
- **Way round**: choose "Disabled" and press "Save"; the list reads
  "Disabled" from then on.

Low: the empty box hides a setting but changes no issue's access, and
the manager can set it in one save.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`. Its journal has
never saved "Publishing Mode" or "Delayed Open Access", and nothing is
created.

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Distribution and its "Access" tab. None of the three
   "Publishing Mode" choices is selected (U51 A1, see Cause), and
   "Delayed Open Access" is hidden.
3. Under "Publishing Mode", choose "The journal will require
   subscriptions to access some or all of its contents.".
4. Look at "Delayed Open Access".
5. Press "Save".
6. Reload the page and open the "Access" tab again.

**Expected**: "Delayed Open Access" reads "Disabled" at step 4, and
again at step 6.

**Observed**: at step 4 the box is empty; no entry of the list is
chosen. "Save" shows "Saved". The save request sends
`delayedOpenAccessDuration` with an empty value, and the answer returns
`"delayedOpenAccessDuration": null`. The journal now stores "Publishing
Mode" and no "Delayed Open Access" value, and at step 6 the box is
empty again.

Control: choosing "Disabled" before "Save" sends `0`, and the list
reads "Disabled" after a reload.

## Cause

`APP\components\forms\context\AccessForm::__construct()`
(`classes/components/forms/context/AccessForm.php`; line 66 on `main`
and 3.5, 69 on 3.4, 63 on 3.3) builds the list with "Disabled" as the
value `0` and passes the journal's stored value as the field's value:

```php
'value' => $context->getData('delayedOpenAccessDuration'),
```

A journal that has never saved the list has no
`delayedOpenAccessDuration`, so the value is `null`. `Field::getConfig()`
then gives the field its empty value: `''` on `main`, `null` on 3.5 and
3.4, and no `value` key at all on 3.3. None of these matches an option,
so the ui-library renders a `<select>` with nothing chosen (the
`v-model` `<select>` is in `SelectInput.vue` on `main`, in
`FieldSelect.vue` on the older lines). Saving it sends the empty value
back. The schema allows `null` (`"nullable"`), so nothing is stored, and
the state never ends by itself.

`IssueGridHandler::publishIssue()` applies a delay only when
`delayedOpenAccessDuration` is truthy, so an empty value acts as
"Disabled".

Before 46eb7c6237, the list was on the "Subscription Policies" form.
That form showed it as a plain `<select>` with no entry marked selected,
so the browser showed the first entry, "Disabled". Its `readInputData()`
also added a `'required'` check on the field, so every save stored a
value. 46eb7c6237 moved the list to the "Access" tab so it could be set
without payments (`pkp/pkp-lib#3330`). The Vue field shows nothing for a
missing value, and the move gave it no fallback.

Reach:

- The "Publishing Mode" radio on the same form has the same pattern: it
  is unset in a new journal, its schema has no default, and the empty
  value matches none of the three choices. Whether a new journal should
  arrive with "open access" selected is an open product question,
  tracked as U51
  [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a1),
  so it is not part of this fix.
- The "Access" tab is the only screen for this setting (checked in the
  code). The REST API returns `delayedOpenAccessDuration: null` for
  such a journal, which is a correct "not set".
- Other selects on the context forms: `OrcidSettingsForm` falls back
  to an entry (`?? OrcidManager::API_PUBLIC_PRODUCTION`,
  `?? OrcidManager::LOG_LEVEL_ERROR`), and `PKPSiteConfigForm` offers an
  empty entry. `PKPPaymentSettingsForm`'s "Currency" and "Payment
  Plugins" are empty until chosen, but an empty box there means "not
  chosen yet", and no setting is in force that the box hides (checked
  in the code).
- OMP and OPS have no such list.

## Proposed fix

Fall back to "Disabled" in the form, as `OrcidSettingsForm` does for its
selects
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delayed-open-access-box-empty/fix.diff)):

```diff
-                'value' => $context->getData('delayedOpenAccessDuration'),
+                'value' => $context->getData('delayedOpenAccessDuration') ?? 0,
```

Tried on OJS `main`: the list read "Disabled" at step 4. The untouched
"Save" sent and stored `0`, and the list read "Disabled" after the
reload. Saving "6 Months" and then "Disabled" stored and showed each
one the same with the fix in and out.

**Alternatives**

- `'default' => 0` on the field, the `Field` property for "no value
  specified": the same effect. The `??` form is what the other context
  forms use.
- A schema default (`"default": 0` in `schemas/context.json`): new
  journals would store `0`, but journals that exist already would keep
  the empty box, so the form would still need the fallback.

**What goes with it**

- No data repair: an unset value already acts as "Disabled", and the
  first save after the fix stores `0`.
- Backport: the same line on 3.5, 3.4 and 3.3. `Field::getConfig()`
  passes `0` through on all three (`$this->value ?? …` on 3.4 and 3.5,
  `isset($this->value)` on 3.3).

Small: it is one fallback in one form, copied from a sibling form, and
it needs no change to stored data.

## Evidence

- Script that takes the Steps and the control, on an install freshly
  loaded from the default dataset (3.5: `PKP_E2E_LINE=stable-3_5_0` in
  front):
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delayed-open-access-box-empty/walk.js):
  `PROBE_FEATURE=issues-sb8 PROBE_AGENT=sb8 node bin/probe.js ojs shared/playwright/checks/issues/delayed-open-access-box-empty/walk.js`
- The fix, with
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delayed-open-access-box-empty/neighbour.js)
  checking that a saved choice still shows:
  `node bin/try-fix.js apply shared/playwright/checks/issues/delayed-open-access-box-empty/fix.diff ojs`
- Commits checked (the head of each branch): OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a, lib/ui-library 64d6736318); `stable-3_5_0`
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  (lib/pkp 3bb4450bea, lib/ui-library d4e0188353); `stable-3_4_0`
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315)
  (lib/pkp 32b0f4b4af, lib/ui-library ee684b341b); `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp f6ab331645, lib/ui-library 96959f9ed4). Dataset pkp/datasets
  c657990 (2026-10-01).
- Introduced: `git blame` on the line gives 665ed1f925 (2021, the PSR-12
  reformatting). Before it, 46eb7c6237 adds the field with this value.
  Its parent's `subscriptionPolicyForm.tpl` shows the list as an
  `fbvElement` select with `selected=$delayedOpenAccessDuration`, and
  `SubscriptionPolicyForm::readInputData()` adds the `'required'`
  `FormValidatorInSet`. github.com lists `pkp/ojs#2327` for the commit.
  The first release with the change is OJS 3.2.0.
- The claim about journals upgraded from before 3.2 is read in the
  code (the old form's required check and its `execute()`); no such
  upgrade was run.
- Upstream: `pkp/pkp-lib#4925` (open) says the setting was not used when
  an issue is published, which is another fault.
