# Subscription window's email refusal sends the manager to "the journal Setup", not "Subscription Policies"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no pull request (before GitHub), for the old PKP bug tracker's #2213 · [f6af5e90bf](https://github.com/pkp/ojs/commit/f6af5e90bf060629f46a12dd7a664f7a9ef1d73f) · 2006-06-08 · michaelf; it moved the contact fields off "Journal Setup", where the message had rightly sent managers since 2005
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the "Subscriptions" page, a manager saves a subscription with "Send
the user an email with their username and subscription details." ticked,
on a journal with no subscription contact. The save is refused with "In
order to send the user a notification email, the subscription contact
name and email address must be specified in the journal Setup.".

The fields it means are "Name" and "Email" under the heading
"Subscription Manager", on the same page's "Subscription Policies" tab.
No setup screen holds them: the "Setup" tab under Settings › Website is
about the website. The message was right until 2006, when the fields
moved there from the "Journal Setup" of OJS 2.

The subscription saves, and the email goes out, once the manager finds
the tab and fills the contact in.

## Impact

- **Lost.** Nothing but time spent looking for the fields.
- **Who.** A journal manager or a user with the Subscription Manager
  role, adding or editing a subscription by hand with the email box
  ticked. The box starts unticked (code), and a new journal has no
  contact until someone saves "Subscription Policies". So a journal that
  never saved that tab meets the refusal the first time a manager ticks
  the box.
- **Way round.** Fill in the contact on "Subscription Policies" and save
  the subscription again, or untick the box and save without the email.

Low: the task gets done once the manager finds the right tab.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
  Its journal has no subscription contact: the "Subscription Manager"
  boxes on "Subscription Policies" are empty.
- One individual subscription type. The dataset has none, so the journal
  manager creates it in step 2.

1. Sign in as `rvaca`.
2. Open `/index.php/publicknowledge/en/payments`. This is the
   "Subscriptions" page, which the side menu shows as "Payments" only
   while payments are switched on (Settings › Distribution › "Payments").
   On its tab "Subscription Types" press "Create New Subscription Type".
   Type "Online Year u51w19" in the English box of "Name of Type", choose
   "US Dollar", type "10" in "Cost", choose "Online" in "Format", type
   "12" in "Duration", choose "Individual (users are validated via
   login)" and press "Save".
3. Tab "Individual Subscriptions", "Create New Subscription".
4. In "Locate a User" search for `amwandenga` and choose Alan Mwandenga.
   Choose "Online Year u51w19" in "Subscription type" and "Active" in
   "Status". Type `2026-10-01` in "Start date" and `2027-09-30` in "End
   date". Tick "Send the user an email with their username and
   subscription details.".
5. Press "Save".
6. Close the window. On the tab "Subscription Policies", under
   "Subscription Manager", type "Subscriptions Desk u51w19" in "Name",
   `rvaca@mailinator.com` in "Email" and "1 Harbour Road" in "Mailing
   Address", and press "Save".
7. Tab "Individual Subscriptions": repeat steps 3–5.

**Expected.** Step 5 is refused with a message that sends the manager to
the "Subscription Manager" name and email on this page's "Subscription
Policies" tab. Step 6 shows "Your changes have been saved.". Step 7
saves the subscription, and Alan Mwandenga gets "Subscription
Notification".

**Observed.** Step 5 is refused. The window stays open with this at its
top:

```
Errors occurred processing this form
In order to send the user a notification email, the subscription contact name and email address must be specified in the journal Setup.
```

Settings › Journal ("Masthead", "Contact", "Sections", "Categories"),
Settings › Website (whose "Setup" tab holds "Information", "Languages",
"Navigation" and the like) and Settings › Distribution have no
subscription contact. Steps 6 and 7 behave as expected: the subscription
is listed as "Alan Mwandenga", "Online Year u51w19", "Active",
"2026-10-01", "2027-09-30", and `amwandenga@mailinator.com` gets
"Subscription Notification" from "Subscriptions Desk u51w19"
<rvaca@mailinator.com>.

## Cause

The message is OJS's locale string
`manager.subscriptions.form.subscriptionContactRequired`
([locale/en/manager.po, lines 1344–1345](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/locale/en/manager.po#L1344-L1345)).
`SubscriptionForm::readInputData()`
([lines 189–198](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/SubscriptionForm.php#L189-L198))
shows it when the email box is ticked and the journal's
`subscriptionName` or `subscriptionEmail` is empty. The check itself is
right: the email is sent from that name and address.

The string was written in 2005
([b63f92c7ac](https://github.com/pkp/ojs/commit/b63f92c7acd14106d9a7bc3451d62fbf2baa7875)),
when the subscription contact was on step 4 of OJS 2's "Journal Setup".
In 2006
[f6af5e90bf](https://github.com/pkp/ojs/commit/f6af5e90bf060629f46a12dd7a664f7a9ef1d73f)
moved the fields from `templates/manager/setup/step4.tpl` to the new
subscription policies form (`SubscriptionPolicyForm`) and left the
message as it was. In OJS 3 that form is the "Subscription Policies" tab
(`templates/payments/subscriptionPolicyForm.tpl`), whose heading
"Subscription Manager" (`manager.subscriptionPolicies.subscriptionContact`)
is also the name of a role.

The reach:

- Institutional subscriptions: `InstitutionalSubscriptionForm` extends
  `SubscriptionForm` and calls its `readInputData()`: code.
- Editing a subscription: the same window and check: code.
- The translations say the same as the English (the key's `msgstr` in
  every `locale/*/manager.po`; fr_CA "configuration de la revue", de
  "Einrichtung der Zeitschrift"): code.
- No other message in use sends the manager to a setup screen for
  something kept elsewhere. The other OJS strings that name a setup are
  generic or unused (`manager.setup.journalSetup`): code.

## Proposed fix

A proposal; the team decides. Reword the English text so that it quotes the heading and the tab as
they read on screen
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-notify-refusal-names-setup/fix.diff)):

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -1344,2 +1344,2 @@
 msgid "manager.subscriptions.form.subscriptionContactRequired"
-msgstr "In order to send the user a notification email, the subscription contact name and email address must be specified in the journal Setup."
+msgstr "In order to send the user a notification email, the name and email under \"Subscription Manager\" on the Subscription Policies tab must be filled in."
```

The quoted heading keeps a user with the Subscription Manager role from
reading it as their own profile. The message names only the name and
email because those are what the check and the email need. "Mailing
Address" is also required to save the tab, and the tab says so itself:
"Save" there marks the empty box "This field is required.".

The key stays the same, so no code changes. The other languages keep
their current text, still pointing to the setup, until translators
update it. That is acceptable: those readers see no worse than today. A
new key would drop every translation to the English text until each is
redone.

Tried on `main`. With the fix in, step 5 is refused with the new
message, and steps 6 and 7 behave as before. Two nearby cases give the
same result with the fix in and out, apart from the new wording:

- With no user chosen and the box ticked, the window shows "A user is
  required." beside the contact message.
- With the box unticked, the subscription saves with no contact, and no
  email is sent.

**Alternatives**

- Link the message to the tab: the refusal is plain text in a legacy
  form's notice, and the tab is on the same page, so a link adds code
  for little gain.
- Fall back to the journal's principal contact as sender, as the online
  payment notifications do (`SubscriptionAction`), and drop the check:
  subscribers would then get mail from someone the journal did not name
  for subscriptions. It needs a product decision.

**What goes with it**

- Nothing relies on the English wording: no API, no plugin hook.
- Backport: the diff applies as it stands to 3.5 and 3.4 at an offset
  (the text at line 1317 on 3.5, 1342 on 3.4). On 3.3 the file is
  `locale/en_US/manager.po`, the text at line 1338.
- Test: an e2e check that the refusal names the tab.

Small: one English string.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-notify-refusal-names-setup/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-notify-refusal-names-setup/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Without an
  argument it takes steps 1–7, and between steps 5 and 6 reads Settings ›
  Journal, Website (with its "Setup" tab) and Distribution for the
  contact's fields. `neighbour` takes the two nearby cases of the fix
  check.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-notify-refusal-names-setup/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–7 on `main` and `stable-3_5_0`, with the same
  result on both. OMP and OPS have no subscriptions.
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
  - 3.4: `locale/en/manager.po` has the same text (line 1342),
    `SubscriptionForm::readInputData()` the same check (line 191), and
    the fields are on `templates/payments/subscriptionPolicyForm.tpl`,
    a tab of `templates/payments/index.tpl`.
  - 3.3: `locale/en_US/manager.po` has the same text (line 1338),
    `SubscriptionForm.inc.php` the same check (line 176), and the fields
    are on the same "Subscription Policies" tab.
  - The email box: `individualSubscriptionForm.tpl` and
    `institutionalSubscriptionForm.tpl` render it with no `checked`, and
    `SubscriptionForm::initData()` sets no `notifyEmail`, so it starts
    unticked.
- Introduced: `git log -S` on the text leads to b63f92c7ac (2005), which
  wrote it while the fields were on "Journal Setup" step 4. `git log -S
  subscriptionName` on the setup and policy forms gives f6af5e90bf,
  which removed the fields from `step4.tpl` and `JournalSetupStep4Form`
  and added them to `SubscriptionPolicyForm`, with the message
  unchanged. Both commits are by michaelf, a CVS account with no known
  GitHub handle; #2213 is the old PKP bug tracker's number.
- Upstream: searched pkp/pkp-lib and pkp/ojs by the symptom's words
  ("subscription contact notification email setup", "journal Setup
  subscription", the email box's label) and by
  `subscriptionContactRequired`. Nothing matched.
