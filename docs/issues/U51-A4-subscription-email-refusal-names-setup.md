# A manager saving a subscription with its email is told to look in a "journal Setup" that has no such fields

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced to a pull request; [f6af5e90bf](https://github.com/pkp/ojs/commit/f6af5e90bf060629f46a12dd7a664f7a9ef1d73f) · 2006-06-08 · michaelf (commit author; no GitHub handle known)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager creates or edits a subscription, individual or
institutional, ticks "Send the user an email with their username and
subscription details." and presses "Save" while the journal has no
subscription contact. The window refuses with "In order to send the
user a notification email, the subscription contact name and email
address must be specified in the journal Setup." No "Setup" screen
holds those fields: they are "Name" and "Email address" under
"Subscription Manager" on the "Subscription Policies" tab of the same
"Subscriptions" page.

The refusal itself is right: the subscription is not saved, and nothing
else changes. The manager has to find the fields without help. Any
journal whose subscription contact is still empty gives this refusal
when the box is ticked, and a new journal starts with it empty.

## Impact

- **Lost.** Nothing; only the manager's time looking for the fields.
- **Who.** A Journal Manager or Subscription Manager who saves a
  subscription with the email box ticked, on a journal whose
  subscription contact is empty.
- **Way round.** On "Subscription Policies", fill in "Name", "Email
  address" and "Mailing Address" under "Subscription Manager" (the tab
  will not save without all three), or untick the email box.

Low: the message names the wrong place, but it names the right thing to
fill in, so a manager who looks around the page finishes the task.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`. Its
  subscription contact is empty and it has no subscription type.

1. Sign in as `rvaca` (Journal manager).
2. Open the "Subscriptions" page at
   `/index.php/publicknowledge/en/payments` (the side menu's "Payments"
   once payments are enabled), tab "Subscription Types", press "Create
   New Subscription Type": "Name of Type" "u51sb7 Online Year", currency
   "US Dollar", "Cost" 10, "Format" "Online", "Duration" 12,
   "Individual", "Save".
3. Tab "Individual Subscriptions", press "Create New Subscription".
4. Under "Locate a User" search `ccorino` and choose Carlo Corino.
5. "Subscription type" "u51sb7 Online Year", "Status" "Active".
6. In "Start date" type today's date as YYYY-MM-DD, key by key (the
   dataset's date format), and in "End date" the same day next year.
7. Tick "Send the user an email with their username and subscription
   details." and press "Save".

**Expected.** The refusal names the fields where they are: the
subscription contact on the "Subscription Policies" tab.

**Observed.** The window stays open, with at its top:

```
Errors occurred processing this form
In order to send the user a notification email, the subscription contact name and email address must be specified in the journal Setup.
```

The "Subscription Policies" tab holds, under "Subscription Manager",
"Name", "Email address", "Phone" and "Mailing Address"; it is saved
only with "Name", "Email address" and "Mailing Address" filled in. Once
it is saved, steps 3 to 7 save the subscription with "Your changes have
been saved.".

## Cause

`SubscriptionForm::readInputData()` (OJS
`classes/subscription/form/SubscriptionForm.php`, line 191) refuses a
ticked `notifyEmail` while the journal's `subscriptionName` or
`subscriptionEmail` is empty, with the message
`manager.subscriptions.form.subscriptionContactRequired` (OJS
`locale/en/manager.po`, msgstr on line 1345).

The message came with the email option in 3d4151d868 (2005), when the
subscription contact was a part of Journal Setup. f6af5e90bf (2006,
"Updates to subscription related UIs") moved the contact fields from
Setup step 4 to the subscription policies form and left the message as
it was. Today they are `subscriptionName` and `subscriptionEmail` of
`SubscriptionPolicyForm`, under the heading "Subscription Manager"
(`manager.subscriptionPolicies.subscriptionContact`). The tab's
template (`templates/payments/subscriptionPolicyForm.tpl`, lines 23–26)
also marks `subscriptionMailingAddress` required, so the browser will
not save the tab without it.

Reach:

- Creating and editing, individual and institutional: the check sits in
  the shared `readInputData()`, which
  `controllers/grid/subscriptions/IndividualSubscriptionForm.php` and
  `controllers/grid/subscriptions/InstitutionalSubscriptionForm.php`
  call for both. Creating an individual subscription was driven on
  screen; the other three were read in the code.
- The translations send the manager to the same place in their own
  words (French (Canada) "dans la configuration de la revue", German
  "bei der Einrichtung der Zeitschrift", `zh_Hant` "期刊設置"). Read
  in the `.po` files.
- No other message in OJS's or pkp-lib's English locale sends the
  reader to "the journal Setup" (a search of `locale/en`).

## Proposed fix

Change the English text to name the tab and every field the tab
requires
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-email-refusal-names-setup/fix.diff),
against the OJS root):

```diff
 msgid "manager.subscriptions.form.subscriptionContactRequired"
-msgstr "In order to send the user a notification email, the subscription contact name and email address must be specified in the journal Setup."
+msgstr "In order to send the user a notification email, the subscription contact's name, email address and mailing address must be filled in on the Subscription Policies tab."
```

The key stays, so no code changes. The text says "subscription
contact", not "Subscription Manager", because Subscription Manager is
also the name of a role, and a manager could take it for the user who
holds that role. It names the mailing address too: the check needs only
the name and email, but the tab cannot be saved without the address,
and a manager told only of the first two is refused again there.

Tried on OJS `main`: step 7 shows the new text at the window's top, and
with the contact saved the subscription saves.

**Alternatives**

- A link to the tab in the message: `formErrors.tpl` already wraps each
  message in a link to its field, so a link inside the message would
  nest two links and need a template change for one message.
- Checking the contact in the browser when the box is ticked: more work
  for the same information.

**What goes with it**

- Backport: the same msgid and text on `stable-3_5_0`, `stable-3_4_0`
  (`locale/en/manager.po`) and `stable-3_3_0`
  (`locale/en_US/manager.po`).

## Evidence

- Script: [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-email-refusal-names-setup/walk.js)
  (helpers in [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-form-date-box-shows-today/lib.js)),
  steps 1 to 7 and then the contact saved and steps 3 to 7 again, on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/subscription-email-refusal-names-setup/walk.js`.
- Fix tried with `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-email-refusal-names-setup/fix.diff ojs`, the script, then `revert`.
- Commits checked: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0`
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  (lib/pkp 3bb4450bea); `stable-3_4_0`
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315);
  `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b).
  Dataset pkp/datasets c657990 (2026-10-01), PostgreSQL; nothing here
  depends on the database.
- 3.4 and 3.3 were read in the code: the same check and the same English
  text (3.3 in `SubscriptionForm.inc.php` and `locale/en_US/manager.po`,
  line 1338).
- Introduced: found with `git log -S` on the message text and on
  `subscriptionName`; both commits predate pkp's pull requests. Counted
  as a defect rather than a regression for its age.
