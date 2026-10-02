# The delayed open access and expiry reminder lists offer "1 Months" and "1 Weeks"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no pull request; commit for issue `pkp/pkp-lib#1816` · [f637c95ff2](https://github.com/pkp/ojs/commit/f637c95ff2f38f26f3dfb3f596910aeb7770f743) · 2017-06-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U51 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a15)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A journal manager sets how long issues stay subscription-only, or when
subscribers get expiry reminders. In those lists, the first choice
after "Disabled" reads "1 Months" or "1 Weeks". This happens in
"Delayed Open Access" on Settings › Distribution › "Access", and in the
four "Subscription Expiry Reminders" lists on the "Payments" page's
"Subscription Policies" tab.

The choice works as intended; only its wording is wrong. Most
translations have the same fault, such as German "1 Wochen" and
Spanish "1 semanas".

## Impact

- **Lost**: nothing; the wording of one choice in each of five lists.
- **Who**: a journal manager setting up subscriptions, on those two
  screens, in English and in most other interface languages.
- **Way round**: none needed; the choice saves and works as "1 month"
  or "1 week".

Low: a manager can still read "1 Months" correctly, and nothing a reader
or subscriber receives depends on the label.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`; nothing is
created or saved.

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Distribution and its "Access" tab, and under
   "Publishing Mode" choose "The journal will require subscriptions to
   access some or all of its contents." (not saved), so "Delayed Open
   Access" shows.
3. Open the "Delayed Open Access" list.
4. Open the "Payments" page at `/index.php/publicknowledge/en/payments`
   and its "Subscription Policies" tab. The side menu offers "Payments"
   only while payments are enabled, and they are off in the dataset's
   journal.
5. Under "Subscription Expiry Reminders", open each of the four lists.

**Expected**: the first count reads "1 Month" in the month lists and
"1 Week" in the week lists.

**Observed**:

- "Delayed Open Access": "Disabled", "1 Months", "2 Months", "3 Months"
  … "60 Months".
- "Notify subscribers by email before subscription expiry." (months)
  and "Notify subscribers by email after subscription expiry" (months):
  "Disabled", "1 Months", "2 Months" … "12 Months".
- "Notify subscribers by email before subscription expiry." (weeks)
  and "Notify subscribers by email after subscription expiry." (weeks):
  "Disabled", "1 Weeks", "2 Weeks", "3 Weeks".

## Cause

The five lists label every count with one string per unit, whatever
the count. `AccessForm::__construct()`
(`classes/components/forms/context/AccessForm.php`, line 49) and
`SubscriptionPolicyForm::__construct()`
(`classes/subscription/form/SubscriptionPolicyForm.php`, lines 55, 60,
65 and 70) build each list in a loop from 1. The month loops call
`__('manager.subscriptionPolicies.xMonths', ['x' => $i])` and the week
loops `__('manager.subscriptionPolicies.xWeeks', ['x' => $i])`.
`locale/en/manager.po` has only the plural form of each:

```
msgid "manager.subscriptionPolicies.xMonths"
msgstr "{$x} Months"

msgid "manager.subscriptionPolicies.xWeeks"
msgstr "{$x} Weeks"
```

f637c95ff2 (`pkp/pkp-lib#1816`, "Clean up subscription policy form")
introduced the two strings. Before it, each reminder setting was a
sentence with the list in the middle: "Notify subscribers by email",
then a list of bare numbers, then "month(s) before subscription
expiry.". The "(s)" covered every count. The new strings dropped it
and gave the count 1 no string of its own. 46eb7c6237 later reused
`xMonths` for "Delayed Open Access" when that list moved to the
"Access" tab.

Reach:

- These five loops are the only lists built from the two strings
  (checked in the code); the reminder emails do not use them.
- The translations also have one string per unit. Where the language
  has a singular, the count 1 reads wrong too. Examples in the `.po`
  files: `de` "{$x} Wochen", `es` "{$x} semanas", `fr` "{$x} Semaines",
  `fr_CA` "{$x} semaines", `it` "{$x} Settimane", `nl` "{$x} weken",
  `pt_BR` "{$x} Semanas", `sv` "{$x} veckor", `ru` "{$x} недель",
  `pl` "{$x} Tygodnie". Languages that do not inflect the noun after a
  number (`ja`, `zh_Hans`, `tr`, `id`, `vi`) read right.
- Running text with a count elsewhere ("Review overdue by {$days}
  days") has the same gap. That is wording in sentences, not a list of
  choices, and is left out here.
- OMP and OPS have neither list.

## Proposed fix

Give the count 1 its own string, and fall back to the counted string
where a language has not translated it yet
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/month-week-lists-read-1-months/fix.diff)).

1. Two strings in OJS's `locale/en/manager.po`:
   `manager.subscriptionPolicies.oneMonth` "1 Month" and
   `manager.subscriptionPolicies.oneWeek` "1 Week".
2. One helper on `SubscriptionPolicyForm`, which the five loops call
   with the month pair (`oneMonth`, `xMonths`) or the week pair
   (`oneWeek`, `xWeeks`):

   ```php
   public static function getCountLabel(int $count, string $oneKey, string $countKey): string
   {
       if ($count === 1 && ($one = Locale::getBundle()->translateSingular($oneKey))) {
           return $one;
       }
       return __($countKey, ['x' => $count]);
   }
   ```

`LocaleBundle::translateSingular()` returns `null` for a key the current
language does not have. `__()` cannot be used for that test, because it
returns `##key##` instead. Without the fallback, every language other
than English would show `##manager.subscriptionPolicies.oneMonth##` in
place of a choice that reads right in many of them today. That was seen
on the Canadian French screen with a first version of this fix. With
the fallback, a language keeps its current label until its translators
add the two strings.

Tried on OJS `main`: the five English lists read "1 Month" and "1 Week".
The other counts read as before. The count 1, saved in all five lists,
was stored as `1` and read back. The Canadian French lists read as they
do without the fix ("1 mois", "1 semaines").

The pattern of two strings is the one OJS uses for search results:
`templates/frontend/pages/search.tpl` (lines 99–101) picks
`search.searchResults.foundSingle` or `foundPlural` by the count.

**Alternatives**

- gettext plural forms (`msgid_plural`, read through `__p()`). pkp-lib
  has supported them since `pkp/pkp-lib#6328`, and `pkp/pkp-lib#11294`
  (open) proposes them for strings like these. They would also give
  languages with more than two plural forms the right ending. But no
  PKP `.po` file uses them yet. `Translator::getPlural()` returns nothing
  for a count above 1 when a language has only the singular entry, so
  `__p()` would show the raw key in every list in all 55 translated
  languages until each was re-translated. That route needs a fallback
  in pkp-lib's `Translator` first.
- Ship the two strings with every translation in the same change: 55
  languages translate these strings today. A developer cannot write
  them, and they arrive through Weblate.
- Reuse pkp-lib's `common.oneMonth` / `common.oneWeek`: they read
  "1 month" and "1 week" in lower case beside "2 Months", and only
  English and Hindi have them.

**What goes with it**

- Translators get the two new strings through Weblate.
- No data or API change: the stored values stay 1 to 60 and 1 to 12.
- Backport: the same loops and strings on 3.5, 3.4 and 3.3 (3.3 in
  `.inc.php` files and `locale/en_US`). `Locale::getBundle()` exists on
  3.4 and 3.5; 3.3's `AppLocale` would need its own check for a missing
  key.

Small: the change stays inside OJS's two subscription forms and its
English strings, and it was tried as written.

## Evidence

- Script that takes the Steps, on an install freshly loaded from the
  default dataset (3.5: `PKP_E2E_LINE=stable-3_5_0` in front):
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js):
  `PROBE_FEATURE=issues-sb8 PROBE_AGENT=sb8 node bin/probe.js ojs shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js`
- The fix, with
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/month-week-lists-read-1-months/neighbour.js)
  checking the other counts, the saved count 1 and the Canadian French
  lists:
  `node bin/try-fix.js apply shared/playwright/checks/issues/month-week-lists-read-1-months/fix.diff ojs`
- Commits checked (the head of each branch): OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0`
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  (lib/pkp 3bb4450bea); `stable-3_4_0`
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315)
  (lib/pkp 32b0f4b4af); `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp f6ab331645). Dataset pkp/datasets c657990 (2026-10-01).
- 3.3 is read in `AccessForm.inc.php`, `SubscriptionPolicyForm.inc.php`
  and `locale/en_US/manager.po`, which have the same loops and strings.
- The translations were read from each locale's `manager.po` on
  `main`. Only Canadian French (`fr_CA`, the dataset's second language)
  was seen on screen: without the fix, its week lists read
  "1 semaines" and its month lists "1 mois".
- `__p()` on a string with no plural form was run from the command
  line on `main`: `en`, `fr_CA` and `hr` all return the raw key for 2
  and 5. `pkp/pkp-lib#10691` (open) is that same raw key on the search
  results page.
- Seen in the `.po` files, not on screen: `uz_Latn` writes the
  placeholder as `{$ x}`. `LocaleBundle::_format()` replaces only
  `{$x}`, so Uzbek (Latin) lists read "{$ x} oy" for every count. That
  is a translation fault, apart from this one.
