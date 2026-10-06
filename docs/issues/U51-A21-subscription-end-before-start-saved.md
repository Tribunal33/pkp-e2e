# A subscription whose end date is before its start date is saved as active and grants no access

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced to a pull request; present since the first subscription code, [d76dc5eb75](https://github.com/pkp/ojs/commit/d76dc5eb754385bc3e5cc2fece7773a3ab4704f7) (2005-02-19)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a21)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager creating or editing a subscription types a "Start
date" that is after the "End date" (the two dates swapped, or a year
mistyped) and presses "Save". The window accepts it with "Your changes
have been saved.", and the list shows the subscription as "Active" with
those dates.

A subscription gives access only on days between its start and end
dates, and with the dates swapped there is no such day. Under "Full
expiry" (also what a journal that never chose gets), the subscriber is therefore refused every
restricted article and issue, exactly like a reader without a
subscription, and nobody is told. Under "Partial expiry" the same
subscription opens, from its start date on, the content published on or
before its end date.

## Impact

- **Lost.** The subscriber's access, from the save until someone
  notices and corrects the dates.
- **Who.** A subscriber whose subscription a Journal Manager or
  Subscription Manager entered with the dates the wrong way round, on a
  journal that requires subscriptions; individual and institutional
  subscriptions alike. The manager's window is the only way such dates
  are stored: a reader's own purchase sets the dates itself, and OJS has
  no subscription import or API.
- **Way round.** "Edit" the subscription and type the dates the right
  way round. The subscriber's "My Subscriptions" page shows "Expired:"
  and the end date when that date has passed, which may prompt them to
  ask; when it has not, it shows "Expires:" and the end date.

Medium, for one reason: a subscriber loses, without a word, the access
the journal has granted them. It would be low if the window at least
warned; high if an ordinary way of entering dates made the swap common.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`,
  its current issue "Vol. 1 No. 2 (2014)" holding "Signalling Theory
  Dividends" with its "PDF". The dataset leaves "Subscription
  Expiry" ("Subscription Policies") unset, which the code treats as
  "Full expiry". Made on screen as `rvaca`
  (Journal manager), since the dataset's journal is open access:
  - Settings › Distribution › "Access": "The journal will require
    subscriptions to access some or all of its contents.", "Save".
  - Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
    "Subscription", "Save".
  - The "Subscriptions" page (`/index.php/publicknowledge/en/payments`)
    › "Subscription Types" › "Create New Subscription Type": "u51sb7
    Online Year", "US Dollar", "Cost" 10, "Format" "Online", "Duration"
    12, "Individual", "Save".

The dates below are those of the run on 2026-10-02; any start date after
the end date does the same.

1. As `rvaca`, on the "Subscriptions" page, tab "Individual
   Subscriptions", press "Create New Subscription".
2. Under "Locate a User" search `ccorino` and choose Carlo Corino;
   "Subscription type" "u51sb7 Online Year", "Status" "Active".
3. Type "2027-09-02" in "Start date" and "2026-09-02" in "End date",
   press "Save".
4. Read Carlo Corino's row in the list.
5. Sign in as `ccorino`, open "Signalling Theory Dividends" and press
   "PDF".

**Expected.** At step 3 the window stays open with a message that the
end date is before the start date, and nothing is saved.

**Observed.** Step 3 closes the window with "Your changes have been
saved.". Step 4's row reads "Carlo Corino", "ccorino@mailinator.com",
"u51sb7 Online Year", "Active", "2027-09-02", "2026-09-02". At step 5
the link reads "Requires Subscription PDF" with a padlock, and pressing
it lands Carlo Corino on the journal's home page.

Control: the row's "Edit" with "Start date" "2026-09-02" and "End date"
"2027-09-02" saves, and the same "PDF" then opens the article's PDF
viewer.

## Cause

`SubscriptionForm::readInputData()` (OJS
`classes/subscription/form/SubscriptionForm.php`, lines 141–178)
checks each date of an expiring type on its own: present, and its year,
month and day in range. Nothing compares the two, so the form accepts
an end date before the start date, and `execute()` stores both
(`date_end` at 23:59:59, line 225).

Access is then decided by date range in `IssueAction::subscribedUser()`
and `subscribedDomain()` (`classes/issue/IssueAction.php`):

- First, `IndividualSubscriptionDAO::isValidIndividualSubscription()`
  (line 458) with today as the date: `date_start <= today <= date_end`
  (`isValidInstitutionalSubscription()`: `BETWEEN s.date_start AND
  s.date_end`, line 524). With the dates swapped no day passes, so under
  "Full expiry" the subscription grants nothing.
- Under "Partial expiry" (`subscriptionExpiryPartial`), a failed first
  check is followed by one with the publication's date
  (`SUBSCRIPTION_DATE_END`: `datePublished <= date_end AND today >=
  date_start`, line 476; lines 113–126 and 147–157 of `IssueAction`). It
  passes from the start date on for content published on or before the
  end date. Read in the code, not driven.

Reach:

- The individual and the institutional subscription windows
  (`controllers/grid/subscriptions/IndividualSubscriptionForm.php` and
  `InstitutionalSubscriptionForm.php`, both on
  `SubscriptionForm::readInputData()`), creating and editing: creating
  an individual subscription driven on screen, the rest read in the
  code.
- The reader's own purchase (`UserIndividualSubscriptionForm::execute()`
  and `UserInstitutionalSubscriptionForm::execute()`, lines 191–192 and
  213–214) stores start and end as today; the duration is added when the
  payment is fulfilled (`SubscriptionDAO::_renewSubscription()`). The
  reader enters no date. OJS has no subscription import/export plugin
  and no subscription endpoint in its REST API. Read in the code.
- "My Subscriptions" (`templates/frontend/pages/userSubscriptions.tpl`)
  shows an active subscription as "Expired: {end date}" when the end
  date has passed (`Subscription::isExpired()`) and "Expires: {end
  date}" otherwise. Read in the code.

## Proposed fix

Add the missing comparison to `SubscriptionForm::readInputData()`, next
to the other date checks of an expiring type, with its own message
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-end-before-start-saved/fix.diff),
against the OJS root):

```diff
+            // End date is not before the start date
+            $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'dateEnd', 'optional', 'manager.subscriptions.form.dateEndBeforeStart', function ($dateEnd) {
+                $dateStart = $this->getData('dateStart');
+                return empty($dateStart) || strtotime($dateEnd) >= strtotime($dateStart);
+            }));
```

```diff
+msgid "manager.subscriptions.form.dateEndBeforeStart"
+msgstr "The subscription end date must not be before its start date."
```

It follows the form's own `FormValidatorCustom` checks on the two
dates. The new check is skipped when either date is empty ("optional"
for the end date, the `empty($dateStart)` test for the start date), so
an empty box gets only the "required" message already there. An end
date on the start date stays allowed: it is a one-day subscription,
valid to 23:59:59 that day.

Tried on OJS `main`: step 3 is refused with the new message beside "End
date" and the window stays open. A start date equal to the end date
still saves and opens the PDF that day, and a start date before the end
date still saves.

**Alternatives**

- Swap the dates silently in `execute()`: it would guess what the
  manager meant.
- A rule in the browser only: the other date checks are on the server,
  and a request that skips the browser would still store swapped dates.

**What goes with it**

- No automatic repair of stored subscriptions with swapped dates: what
  the manager meant cannot be known. An upgrade could list them for the
  manager (`SELECT subscription_id FROM subscriptions WHERE date_end <
  date_start`); that is a product call, not part of this fix.
- Backport: the same block sits in `SubscriptionForm` on `stable-3_5_0`
  and `stable-3_4_0` (lines 147–185), with the message in
  `locale/en/manager.po`; on `stable-3_3_0` in `SubscriptionForm.inc.php`
  (lines 133–171, `new FormValidatorCustom` without a namespace), with
  the message in `locale/en_US/manager.po`.
- Test: an e2e scenario that saves a subscription with the dates the
  wrong way round and expects the refusal.

## Evidence

- Script: [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-end-before-start-saved/walk.js)
  (helpers in [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-form-date-box-shows-today/lib.js)),
  the preconditions, steps 1 to 5 and the control, on an install freshly
  loaded from the default dataset, with the start date eleven months
  after the run and the end date a month before it:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/subscription-end-before-start-saved/walk.js`.
  With `neighbour` as its last argument it saves a start date equal to
  the end date (and opens the PDF) and a start date before the end
  date, the cases the fix must leave alone.
- Fix tried with `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-end-before-start-saved/fix.diff ojs`, the script both ways, then `revert`.
- Commits checked: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0`
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  (lib/pkp 3bb4450bea); `stable-3_4_0`
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315);
  `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b).
  Dataset pkp/datasets c657990 (2026-10-01), PostgreSQL. The access
  query compares dates in SQL; MySQL not checked.
- On 3.5 the same steps saved the swapped dates and refused the PDF the
  same way. 3.4 and 3.3 were read in the code: ten date checks, none
  comparing the two dates.
- Upstream: `pkp/pkp-lib#4941` (open: the ten-year limit on a start
  date) and `pkp/pkp-lib#11756` (closed: a type error saving an
  institutional subscription) are other faults.
- Not driven: the institutional window; "Partial expiry"; the reader's
  "My Subscriptions" page; a journal with payments set up, where a
  refused reader is sent to the "Subscriptions" page rather than the
  home page (spec U51 A5).
