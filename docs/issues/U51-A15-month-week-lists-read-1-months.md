# The journal's "Delayed Open Access" and expiry reminder lists offer "1 Months" and "1 Weeks"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** pushed without a pull request, for `pkp/pkp-lib#1816` · [f637c95ff2](https://github.com/pkp/ojs/commit/f637c95ff2f38f26f3dfb3f596910aeb7770f743) · 2017-06-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The month and week lists of "Delayed Open Access" and "Subscription
Expiry Reminders" read "1 Months" and "1 Weeks" for their first choice.
That is five lists: "Delayed Open Access" on Settings › Distribution ›
"Access" (months), and the four reminder lists on the "Payments" page's
"Subscription Policies" tab (before and after expiry, each in months and
in weeks). Until 2017 the reminder lists offered a bare "1" followed by
"month(s)", which read correctly.

The choice still means one month or one week and saves as such. Other
languages show the same fault: in French the week lists read "1
semaines".

## Impact

- **Lost.** Nothing: the first entry of five lists reads as a typo.
- **Who.** A Journal Manager on a journal that requires subscriptions,
  each time they open one of the five lists.
- **Way round.** None needed: "1 Months" works as one month.

Low: a wording fault, with the outcome right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`):
  the journal `publicknowledge`, "Journal of Public Knowledge", in
  English. The journal is open access in the dataset, and step 3
  switches it to subscriptions, since "Delayed Open Access" shows only
  then. Nothing is created.

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Distribution
   (`/index.php/publicknowledge/en/management/settings/distribution`) and
   press the "Access" tab.
3. Under "Publishing Mode" choose "The journal will require subscriptions
   to access some or all of its contents.". "Delayed Open Access" appears.
4. Open the "Delayed Open Access" list and read its first entries.
5. Press "Save", so the journal requires subscriptions, as it does
   when a manager sets its reminders. Steps 6–7 show the same lists
   without it.
6. Open the "Payments" page by its address
   (`/index.php/publicknowledge/en/payments`; the side menu offers
   "Payments" only once payments are enabled) and press the "Subscription
   Policies" tab.
7. Under "Subscription Expiry Reminders" open each of the four lists and
   read their first entries.

**Expected.** The one-month entry reads "1 Month" in "Delayed Open
Access" and in the two month lists, and the one-week entry reads "1
Week" in the two week lists.

**Observed.** The one-month entry reads "1 Months" and the one-week
entry "1 Weeks":

```
Delayed Open Access                                        Disabled, 1 Months, 2 Months, 3 Months … 60 Months
Notify subscribers by email before subscription expiry.    Disabled, 1 Months, 2 Months, 3 Months … 12 Months
Notify subscribers by email before subscription expiry.    Disabled, 1 Weeks, 2 Weeks, 3 Weeks
Notify subscribers by email after subscription expiry      Disabled, 1 Months, 2 Months, 3 Months … 12 Months
Notify subscribers by email after subscription expiry.     Disabled, 1 Weeks, 2 Weeks, 3 Weeks
```

With the address's `fr_CA` in place of `en`, the week lists read "1
semaines", "2 semaines", "3 semaines".

## Cause

The five lists take their entries from one pair of locale keys,
`manager.subscriptionPolicies.xMonths` "{$x} Months" and
`manager.subscriptionPolicies.xWeeks` "{$x} Weeks"
([`locale/en/manager.po`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/locale/en/manager.po#L1071-L1075)).
[`AccessForm::__construct()`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/components/forms/context/AccessForm.php#L49)
builds "Delayed Open Access" and
[`SubscriptionPolicyForm::__construct()`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/SubscriptionPolicyForm.php#L55-L70)
the four reminder lists, each with `__('…xMonths', ['x' => $i])` for
every count from 1. Each key has a single text for every count, so the
count of 1 gets the plural noun, in English and in every translation.

pkp-lib has had gettext plurals since `pkp/pkp-lib#6328`: `__p($key,
$count, $params)` picks the form the locale's `Plural-Forms` rule names
([`includes/functions.php`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/includes/functions.php#L61)).
But no key uses gettext plurals yet: there is no `msgid_plural` in any
locale file of OJS, OMP, OPS or pkp-lib, so these would be the first.

The wording came with f637c95ff2 ("Clean up subscription policy form"),
which replaced bare numbers followed by "month(s) before subscription
expiry." with "Disabled" and "{$x} Months" entries. `AccessForm` reused
the key when the list moved to the "Access" tab in 2019.

Reach:

- The five lists above, all in OJS; OMP and OPS have no subscriptions
  (walked: English and French, on `main` and 3.5).
- Czech "{$x} měsíců" fits only 5 and up, so 1 to 4 read wrong there
  (code).
- About twenty other English strings put a count before a plural noun
  through `__()`, for instance the review reminder slider's "{$value}
  days before due date" in `PKPReviewSetupForm` (code). They are left
  out of this fix.
- The plural support itself has two gaps that the first plural key
  would meet (code, and the translator run from the command line):
  - `LocaleBundle::getTranslator()` takes the plural rule only from the
    first file it loads, in the order the filesystem lists them, and 132
    of the 1431 `.po` files carry no `Plural-Forms` header (English
    `installer.po`, Czech `reader.po` among them). When such a file comes
    first, the language falls back to "1, or not 1", and Czech, Polish
    or Russian cannot reach their third form.
  - `Translator::getPlural()` returns nothing when the locale's entry
    lacks the form its rule asks for, and `Locale::translate()` then
    shows the raw key (`##manager.subscriptionPolicies.xMonths##`). Once the
    two keys turn plural, that is every language still holding the
    single form. A partly translated
    entry gets an empty form instead, because the gettext loader pads
    the missing forms with `''`, and the label comes out empty.
  - The one template that asks for a plural today, the search page's
    screen-reader line (`{translate key="search.searchResults.foundPlural"
    count=$count}`), meets the raw-key gap for any result count above 1
    (not seen on screen).

## Proposed fix

A proposal; the team decides. Make the two keys gettext plurals, ask for them with `__p()`, and close
the two gaps in pkp-lib's plural support that the first plural key would
otherwise hit
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/month-week-lists-read-1-months/fix.diff)).
It is more than a one-string edit for that reason: English needs a
second form, and without the two pkp-lib changes the switch would put
raw keys or empty labels into most other languages.

- OJS `locale/en/manager.po`: `xMonths` and `xWeeks` become plural
  entries ("{$x} Month" / "{$x} Months", "{$x} Week" / "{$x} Weeks").
- OJS `AccessForm::__construct()` and the four loops of
  `SubscriptionPolicyForm::__construct()`: `__p('…xMonths', $i, ['x' =>
  $i])` in place of `__()`.
- pkp-lib `LocaleBundle::getTranslator()`: take the plural rule from the
  first file that has one, not only from the first file loaded.
- pkp-lib `Translator::getPlural()`: when the form the rule asks for is
  missing or empty, use the entry's last non-empty form:

```diff
         $translation = $this->getTranslation(null, null, $original);
-        $key = $this->getPluralIndex(null, $value, $translation === null);
+        if ($translation === null) {
+            return null;
+        }
+        $key = $this->getPluralIndex(null, $value, false);
+        if (($translation[$key] ?? '') !== '') {
+            return $translation[$key];
+        }

-        return $translation[$key] ?? null;
+        $forms = array_filter($translation, fn (string $form): bool => $form !== '');
+        return $forms ? end($forms) : null;
```

With these, each language can give the forms its own rule needs, and a
language that has not yet translated them keeps today's text.

Tried on OJS `main`, with the whole diff applied: the five lists read "1
Month" and "1 Week", then "2 Months" and "2 Weeks" onward. The same lists
in French read "1 mois" and "1 semaines", as on unpatched `main`, with no
raw key. The two pkp-lib changes were also checked from the command line
on Czech, loaded with a file without a rule first: a full three-form
entry gave "měsíc", "měsíce", "měsíců" for 1, 2 and 5 (unpatched: the
second form for 5), and one with its third form empty gave "měsíce" for
5 instead of an empty label.

**Alternatives**

- A second key for the count of 1 (`xMonth` "{$x} Month", `xWeek`
  "{$x} Week"), chosen when `$i === 1`: a few lines in OJS alone, and
  right in English. But pkp-lib does not fall back to English for a key
  a language lacks, so the other 62 languages with these lists would
  show `##manager.subscriptionPolicies.xMonth##` as the first entry until
  translated, and Czech, Polish or Russian still could not say "2
  měsíce". Not now, because it trades an English typo for raw keys
  elsewhere.
- Convert the entries to plural form in all 63 `manager.po` files that
  hold them, with the existing text in each form, instead of the
  `Translator` fallback: it keeps `getPlural()` as it is, but edits files
  Weblate manages, still needs the rule-loading change, and leaves the
  raw-key gap for the next key made plural.

**What goes with it**

- The fallback also mends the search page's screen-reader line (code).
- The locale completeness check (`LocaleMetadata`) counts keys only, so
  a plural entry counts as one (code).
- Weblate: the English entries become plural, and translators then add
  each language's forms. How Weblate presents a source entry that turns
  plural was not checked.
- A site's cached translations keep the old plural rule until its cache
  is cleared, as after any upgrade.
- Backport: 3.5 and 3.4 have `__p()` and the same `getPlural()` and
  `getTranslator()`, so the diff applies there. 3.3 has no plural
  support; a backport there would need the second-key approach.
- Guard: unit tests for `Translator::getPlural()` with a missing and an
  empty form and for the rule taken past a file without one, and the e2e
  check that "Delayed Open Access" offers "1 Month".

Medium: three small changes in two repos (OJS and pkp-lib), and the
first plural entry in any PKP locale file, with unit tests.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–7 and records each list's entries; `neighbour` takes
  the same steps with `fr_CA` in the addresses.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/month-week-lists-read-1-months/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`. `neighbour` was also walked on
  unpatched `main`, with the same entries.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–7 on `main` and on `stable-3_5_0`, which matched.
  No request failed and no page script failed.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - main: the lines the Cause links, and the same keys in the `fr_CA`,
    `cs` and `de` files; pkp-lib `__p()`, `Locale::translate()`,
    `Locale::_getLocaleFiles()`, `LocaleBundle::getTranslator()`,
    `LocaleBundle::translatePlural()`, `Translator::getPlural()`,
    `LocaleMetadata::getCompletenessRatio()`, and the vendored gettext
    `Translator::addTranslations()`, `Translator::getPluralIndex()`,
    `ArrayGenerator::generateArray()` and
    `Translation::getPluralTranslations()`; every caller of the two keys
    (only these five); the `Plural-Forms` headers of every `.po` file
    under `locale/` and `lib/pkp/locale/`; `msgid_plural` in OJS, OMP,
    OPS and pkp-lib; the English `.po` files for other count strings.
  - 3.5: the same files (`manager.po` lines 1043–1047), the same
    `getPlural()` and `getTranslator()`, `__p()` present.
  - 3.4: `AccessForm.php` line 52, `SubscriptionPolicyForm.php` lines
    56–71, `locale/en/manager.po` lines 1062–1066; pkp-lib
    `includes/functions.php` `__p()` and the same `getPlural()`.
  - 3.3: `AccessForm.inc.php` line 46, `SubscriptionPolicyForm.inc.php`
    lines 50–65, `locale/en_US/manager.po` lines 1064–1068; pkp-lib has
    no `__p()` and no plural support.
- The command-line checks load the checkout's `.po` files with its
  vendored gettext loader into pkp-lib's `Translator`, merging them as
  `getTranslator()` does (a Czech file without a rule first, then a
  scratch Czech plural entry), with and without the diff's two pkp-lib
  changes.
- Introduced: blame on the `__()` lines gives 665ed1f925 (PSR-12
  formatting) and on the `.po` lines 5880a5a87d (conversion to PO); the
  key and its use in the lists came with f637c95ff2, pushed without a PR
  (`commits/<sha>/pulls` is empty). Before it, the reminder lists held
  bare numbers followed by "month(s) before subscription expiry." (the
  removed `expiryReminderBeforeMonths2` keys).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library
  for "1 Months", "1 weeks", "plural" with "months", `xMonths`,
  "delayed open access" with "months", "expiry reminder" with "weeks",
  `msgid_plural`, `__p` and `getPlural`. `pkp/pkp-lib#11294` (open) asks
  to replace duplicated singular and plural keys with gettext plurals,
  naming the search keys; it does not name these lists.
- Unverified: the Czech, Polish and Russian results on screen (checked
  from the command line only).
- MySQL not checked; nothing here depends on the database.
