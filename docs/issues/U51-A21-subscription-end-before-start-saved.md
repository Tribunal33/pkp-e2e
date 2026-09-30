# A subscription saved with its end date before its start date is listed "Active" but opens nothing

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced; present since at least [d76dc5eb75](https://github.com/pkp/ojs/commit/d76dc5eb754385bc3e5cc2fece7773a3ab4704f7) (2005-02-19)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a21)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the "Subscriptions" page, the window that creates or edits a
subscription saves it when its "End date" is before its "Start date",
with "Your changes have been saved.". This is what happens when a
manager types the wrong year into "End date" or swaps the two dates.
The list then shows the subscription as "Active" with those dates. The
same window already refuses a date left empty or more than ten years
from today, but it never compares the two.

The subscriber gets no access from it, and nobody is told. With the
journal's subscription expiry setting at "Full expiry", which is how a
journal starts, every restricted article and issue stays locked for
them.

It happens for individual and institutional subscriptions alike. Only a
manager typing the dates can store such a subscription; a reader's own
purchase and "Renew" set the dates themselves.

## Impact

- **Lost.** The subscriber's access. Under "Full expiry" they read
  nothing restricted. Under "Partial expiry", once the start date has
  passed, they read what was published up to the end date and no newer
  issue (read in the code, not walked).
- **Who.** Journals that enter subscriptions by hand on the
  "Subscriptions" page, one subscription at a time, and only for a
  subscription whose dates are entered wrong. OJS has no subscription
  import and no REST endpoint for subscriptions.
- **Way round.** The list shows both dates, so a manager who notices can
  correct them with "Edit".

Medium: a subscriber who paid is locked out without a word, so it is
more than a wording fault (low). It stays below high because only a
typing mistake causes it and the list shows the dates. A warning in the
list would lower it to low. A purchase or renewal that could store such
dates would raise it, and none can.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- A journal that requires subscriptions and an issue that is not open
  access. The dataset's journal is open access, so steps 2–3 set this.
- One individual subscription type. The dataset has none; step 4
  creates it.
- The dates are the ones walked on 2026-10-01. The control below needs
  today to fall between the start date and the corrected end date. On a
  later day, use a start date a month before today, an end date a month
  before that, and a corrected end date eleven months after today.

Creating the subscription:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
3. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   choose "Subscription" and press "Save".
4. Open the "Subscriptions" page at
   `/index.php/publicknowledge/en/payments`. On the tab "Subscription
   Types" press "Create New Subscription Type". Type "Online Year u51w16"
   in "Name", choose "US Dollar", type "10" in "Cost", choose "Online" in
   "Format", type "12" in "Duration", choose "Individual (users are
   validated via login)" and press "Save".
5. Tab "Individual Subscriptions", "Create New Subscription". In "Locate
   a User" choose Carlo Corino (`ccorino`). Choose "Online Year u51w16"
   and "Active". Type `2026-09-01` in "Start date" and `2026-08-31` in
   "End date".
6. Press "Save".

Reading as the subscriber:

7. Sign out and sign in as `ccorino`.
8. Open the public page of the article "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran" at
   `/index.php/publicknowledge/en/article/view/17` (or through "Archives"
   › "Vol. 1 No. 2 (2014)"), and press "PDF".

**Expected.** Step 6 is refused and the window stays open, with a
message beside "End date" that it cannot be before the start date.

**Observed.** Step 6 shows "Your changes have been saved.", the window
closes and the list reads "Carlo Corino", "Online Year u51w16",
"Active", "2026-09-01", "2026-08-31". The window sends the dates as
typed:

```
dateStart=2026-09-01&dateEnd=2026-08-31
```

In step 8 the article's link reads "Requires Subscription PDF", and
pressing it opens the journal's home page instead of the PDF.

Control: as `rvaca`, "Edit" Carlo Corino's subscription, type
`2027-08-31` in "End date" and press "Save". As `ccorino`, the article's
link now reads "PDF" and opens the PDF viewer.

Institutional (on the same install, after step 4):

9. Open `/index.php/publicknowledge/en/management/settings/institutions`.
   (The side menu shows "Institutions" only while payments or
   institutional usage statistics are switched on.) Press "Add
   Institution", type "Harbour Library u51w16" in "Name" and
   `192.0.2.0/24` in "IP ranges", and press "Save". On the
   "Subscriptions" page's "Subscription Types" create "Campus Year
   u51w16" as in step 4, with "100" in "Cost" and "Institutional (users
   are validated via domain or IP address)".
10. Tab "Institutional Subscriptions", "Create New Subscription": choose
    Carlo Corino, "Campus Year u51w16", "Active" and "Harbour Library
    u51w16", type `2026-09-01` and `2026-08-31`, and press "Save".

**Observed.** Saved the same way; the list reads "Harbour Library
u51w16", "Campus Year u51w16", "Active", "2026-09-01", "2026-08-31".

## Cause

`APP\subscription\form\SubscriptionForm::readInputData()`
([lines 145–178](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/SubscriptionForm.php#L145-L178))
adds the date checks when the subscription type has a duration (every
type except a non-expiring one). Each date is checked on its own: that
it is given, that its year is within ten years of today, and that its
month and day are in range. Nothing compares the two dates, so a start
after the end passes, and `execute()` stores both.

`IndividualSubscriptionDAO::isValidIndividualSubscription()`
([line 480](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/IndividualSubscriptionDAO.php#L480))
grants access when today is on or after `date_start` and on or before
`date_end`. No day meets both when the end is before the start, so the
subscription never opens anything.
`InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()`
([line 524](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/InstitutionalSubscriptionDAO.php#L524))
uses `BETWEEN s.date_start AND s.date_end`, with the same result.

The reach:

- Individual and institutional "Create New Subscription": walked on
  `main` and 3.5. "Edit Subscription" uses the same form: walked on
  `main`, where moving a saved subscription's start after its end was
  saved (the fix trial below).
- "Partial expiry" under "Subscription Policies": when the check above
  fails, `IssueAction` retries it with `SUBSCRIPTION_DATE_END` (lines
  113–124 for individual subscriptions, 147–156 for institutional ones).
  That check passes for an item published on or before `date_end` once
  today is on or after `date_start`. So a reversed subscription opens
  the items published up to its end date, from its start date on. Read
  in the code, not walked.
- The reader's own purchases (`UserIndividualSubscriptionForm`,
  `UserInstitutionalSubscriptionForm`) set both dates to today, and
  "Renew" and a paid renewal (`SubscriptionDAO::_renewSubscription()`)
  only move the end date later. None of them reads a date a person
  typed, so none creates a reversed subscription (read in the code).
- Subscriptions already stored with reversed dates stay as they are;
  `date_end < date_start` on `subscriptions` finds them.

## Proposed fix

A proposal; the team decides. Add a check to
`SubscriptionForm::readInputData()`, after the end date's own checks,
that refuses an end date before the start date, with a new message
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-end-before-start-saved/fix.diff)):

```diff
--- a/classes/subscription/form/SubscriptionForm.php
+++ b/classes/subscription/form/SubscriptionForm.php
@@ -176,6 +176,11 @@
                 $dateEndDay = date('d', strtotime($dateEnd));
                 return ($dateEndDay >= 1 && $dateEndDay <= 31);
             }));
+            // End date is not before the start date (a subscription may start and end on the same day)
+            $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'dateEnd', 'required', 'manager.subscriptions.form.dateEndBeforeStart', function ($dateEnd) {
+                $dateStart = strtotime((string) $this->getData('dateStart'));
+                return $dateStart === false || strtotime($dateEnd) >= $dateStart;
+            }));
         } else {
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -1260,6 +1260,9 @@
 msgid "manager.subscriptions.form.dateEndValid"
 msgstr "Please select a valid subscription end date."
 
+msgid "manager.subscriptions.form.dateEndBeforeStart"
+msgstr "The subscription end date cannot be before its start date."
+
```

The rule belongs to the manager's subscription form. It is the only
place a person chooses both dates, and it already holds every other
date rule, for both the individual and the institutional window.
`Form::validate()` reports the first failing check per field, so the new
check speaks only when the end date is itself valid. It passes when the
start date is missing or unreadable, which the start date's own checks
report. A check that reads a second field through a closure follows
`ChangePasswordForm` (`passwordSameAsOld`). The same start and end day
stays allowed: `execute()` stores the end at 23:59:59, so that is a
one-day subscription.

Tried on `main`. With the fix in, steps 6 and 10 are refused with "The
subscription end date cannot be before its start date." beside "End
date", and nothing is stored. To show the fix refuses nothing else, a
subscription starting and ending on 2026-09-01 was created and then
saved again unchanged through "Edit": both were saved, with the fix and
without it. Moving its start to 2026-09-02 on "Edit" was refused with
the fix and saved without it.

**Alternatives**

- The date picker's `minDate` option on "End date" (the boxes are text
  boxes with a jQuery UI date picker): a check in the page's script
  only, so a request that does not go through the picker still stores a
  reversed pair.
- Swapping the two dates silently: guesses which date is wrong.

**What goes with it**

- No REST API or plugin hook writes subscription dates, and no stored
  data needs a migration.
- Backport: the diff applies to 3.5 and 3.4 at an offset. 3.3 has the
  same checks in `SubscriptionForm.inc.php` and its message file in
  `locale/en_US/manager.po`, so the same lines apply there by hand.
- Test: an end-to-end case that refuses a start after the end on both
  tabs and saves a same-day subscription.

Small: one check and one message in one form, following the form's own
pattern, and one test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-end-before-start-saved/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-end-before-start-saved/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Without an
  argument it takes steps 1–10 and the control. `neighbour` takes the
  fix trial's same-day subscription and its two "Edit" saves. The script records the posted dates, the window's messages, the
  list and the stored rows at each "Save", and where the subscriber's
  "PDF" lands.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-end-before-start-saved/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–10 and the control on `main` and `stable-3_5_0`,
  with the same result on both. No request failed and no page script
  failed. MySQL not checked; the fault is in the form's checks, before
  any query.
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
  - 3.5: `SubscriptionForm.php` is the same as on `main` (only a class
    alias added).
  - 3.4: `SubscriptionForm::readInputData()` has the same per-date checks
    and no order check.
  - 3.3: `SubscriptionForm.inc.php` has the same per-date checks
    (`strftime()` in place of `date()`) and no order check.
- Introduced: `git blame` on the date checks gives refactors of 2021 and
  2022 (the checks rewritten as closures). The form's first version,
  d76dc5eb75 ("Initial commit of subscription code", 2005), checked each
  date's year, month and day and never their order. `git log -G` over
  the subscription forms finds no commit that compared the two dates.
- Other instances: `setDateStart()` and `setDateEnd()` are called with
  typed dates only in `SubscriptionForm::execute()`. The statistics API,
  the other place a person gives a start and an end, already refuses a
  reversed range (`PKPBaseController`, `after_or_equal` on the end date,
  `api.stats.400.wrongDateRange`).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words ("subscription end date before start date",
  "subscription start date after end date", "subscription date
  validation", "subscription dates") and by `SubscriptionForm` with
  `dateEnd`. Nothing matched; `pkp/pkp-lib#10264` (date types) and
  `pkp/pkp-lib#3483` (non-expiring types) are other matters.
- Unverified: "Partial expiry" with a reversed subscription, read in the
  code only. Not driven: a reversed pair entered on "Edit" on 3.5.
- Other writers of subscription dates, read in the code: no importer
  (`plugins/importexport`) and no API handler (`api/v1`) touches
  subscriptions; the payment manager's fulfilment
  (`OJSPaymentManager`) calls `renewSubscription()`.
