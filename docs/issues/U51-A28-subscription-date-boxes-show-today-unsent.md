# After a refused "Save", a subscription's empty date boxes show today's date, and "Save" says they are empty

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; Smarty's own `date_format` leaves an empty date empty)
- **Introduced** no pull request, for `pkp/pkp-lib#9303` · [22c03902e1](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5) · 2024-09-06 · Alec Smecher (asmecher); on 3.4 the same change as [d6b045eb39](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879), pull request `pkp/pkp-lib#10352`, first released in 3.4.0-8
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A28](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a28)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On the "Subscriptions" page, when a "Save" in "Create New Subscription"
or "Edit Subscription" is refused while "Start date" or "End date" is
empty, the window then shows today's date in that box. The date is only
on screen: the form does not send it, so the next "Save" is refused
again with "A subscription start date is required." (or the end date's
message).

The manager sees a filled box and a message saying it is empty. It
happens for individual and institutional subscriptions alike.

## Impact

- **Lost.** Time, and trust in the message. Nothing is stored that the
  manager did not enter.
- **Who.** A journal manager or subscription manager adding or editing a
  subscription by hand, whenever a "Save" is pressed with a date box
  empty.
- **Way round.** Set the date again: pick it in the calendar that opens
  on the box, or type it in character by character. The next "Save"
  then succeeds. Nothing on screen suggests this, since the box already
  shows a date.

Medium: adding or editing a subscription fails with a message the screen
contradicts, and the way round is not obvious, though it is on the same
screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- One individual subscription type. The dataset has none, so the journal
  manager creates it in step 2. Payments need not be switched on for the
  page to open by its address.

Creating a subscription:

1. Sign in as `rvaca`.
2. Open the "Subscriptions" page at `/index.php/publicknowledge/en/payments`.
   (The side menu's "Payments" entry opens the same page. It is shown
   only while payments are switched on, under Settings › Distribution ›
   "Payments".) On its tab "Subscription Types" press "Create New
   Subscription Type". Type "Online Year u51w10" in "Name", choose "US
   Dollar", type "10" in "Cost", choose "Online" in "Format", type "12"
   in "Duration", choose "Individual (users are validated via login)"
   and press "Save".
3. Tab "Individual Subscriptions", "Create New Subscription". Leave "Start
   date" and "End date" empty.
4. In "Locate a User" search for `amwandenga` and choose Alan Mwandenga.
   Choose "Online Year u51w10" in "Subscription type" and "Active" in
   "Status".
5. Press "Save".
6. Leave everything as it is and press "Save" again.

**Expected.** Step 5 is refused with "A subscription start date is
required." and "A subscription end date is required.", and both boxes
stay empty. Step 6 is refused in the same way.

**Observed.** Step 5 is refused with those two messages, and both boxes
now read today's date (`2026-09-30`). Step 6 is refused again with the
same two messages, the boxes still reading today's date. The form posts
the shown date only under the visible box's renamed field
(`dateStart-removed`); the fields the server reads are empty:

```
dateStart=&dateStart-removed=2026-09-30&dateEnd=&dateEnd-removed=2026-09-30
```

Control: after step 6, typing `2026-09-30` into "Start date" and
`2027-09-30` into "End date", character by character, and pressing
"Save" saves the subscription. The window closes and the list shows
"Alan Mwandenga", "Online Year u51w10", "Active", "2026-09-30",
"2027-09-30".

The same on the other subscription windows (a fresh dataset, after steps
1–2):

7. On "Subscription Types", create "Campus Year u51w10" as in step 2,
   with "100" in "Cost" and "Institutional (users are validated via
   domain or IP address)". Under Settings › "Institutions" press "Add
   Institution", type "Harbour Library u51w10" in "Name" and
   "192.0.2.0/24" in "IP ranges", and press "Save".
8. Tab "Institutional Subscriptions", "Create New Subscription". Choose
   Alan Mwandenga, "Campus Year u51w10", "Active" and "Harbour Library
   u51w10", leave the dates empty, and press "Save" twice.
9. Tab "Individual Subscriptions": create Alan Mwandenga's "Online Year
   u51w10" subscription with "Start date" `2026-01-15` and "End date"
   `2027-01-15`. Press "Edit" on its row, clear "Start date" and press
   "Save" twice.
10. Click "Start date", pick the highlighted day in the calendar and
    press "Save".

**Observed.** Step 8 behaves as steps 5–6. In step 9 both saves are
refused with "A subscription start date is required.", and "Start date"
reads today's date after the first. Step 10 saves the subscription with
today's start date.

## Cause

`PKPTemplateManager::smartyDateFormat()`
([lines 2422–2425](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/template/PKPTemplateManager.php#L2422-L2425))
replaces Smarty's `date_format` modifier with
`(new \Carbon\Carbon($string))->…->translatedFormat($format)`. Carbon
reads an empty string or `null` as "now", so an empty date is formatted
as today's date. Smarty's own modifier, which the override replaced,
returns nothing for an empty value (or formats its `$default_date`).

The date boxes are jQuery UI date pickers. lib/pkp
`templates/form/textInput.tpl`
([lines 65 and 73–78](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/templates/form/textInput.tpl#L65-L78))
renders each as a visible box and a hidden field. The visible box passes
any value that is not `null` through `date_format`. The hidden field is
filled only when `!empty($FBV_value)`. `FormHandler`
([lines 64–76](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L64-L76))
renames the visible box to `dateStart-removed`, so only the hidden field
is posted as `dateStart`.

On the first render the form holds no date (`null`), and both parts are
empty. After a refused "Save", `SubscriptionForm::readInputData()` has
read the empty boxes as `''`. The visible box then shows today's date,
while the hidden field stays empty.

The same `readInputData()`
([lines 143–187](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/SubscriptionForm.php#L143-L187))
adds the dates' `required` checks only when the form is posted, since
they depend on the type chosen. So the first render has no required
dates, and the re-rendered window does: `FormBuilderVocabulary` gives
every field the form requires the `required` class, which the form's
jQuery Validate checks before posting. It checks the visible box. That
box holds today's date, so the "Save" goes through, and the server reads
the empty hidden field and refuses.

The date picker copies a date into the hidden field only when the box's
text changes to a valid date (jQuery UI 1.14.1, `_doKeyUp`), or when a
day is picked in the calendar. Typing the date character by character
changes the text at each key, so it is taken. Pasting the same date over
it leaves the text unchanged, so it would not be (code).

Before 22c03902e1 the same template used Smarty's own modifier, and an
empty date stayed empty. The change was for `pkp/pkp-lib#9303`, which
asked for dates shown in the reader's language.

The reach:

- Institutional subscriptions, and editing an existing subscription: the
  same, walked on `main` (steps 7–10).
- OJS "Issues" › "Future Issues" › "Create Issue", "Date Published":
  walked on `main` (volume 9, number 1, year 2027, "Title" ticked and
  left empty). After a "Save" refused with "Title is required for
  the issue." the empty box shows today's date. The next "Save" is
  accepted and stores no date, as the box's help line promises for an
  empty box ("If left empty, the date will be set automatically when
  the issue is published."). The issue then takes the day it is
  published, not the date the box showed.
- OJS "Open Access Date" (the issue's "Access" tab) and the PFL
  plugin's settings have the same box: code.
- The reviewer windows' "Response Due Date" and "Review Due Date" (OJS
  and OMP) have the same box, but `ReviewerForm` and `EditReviewForm`
  require both dates from the first render. So the browser refuses an
  empty one before anything is posted, and a server refusal never
  meets an empty box: code.
- OMP's chapter window has the same box when chapter publication dates
  are switched on. Its title check is its only server check: code, not
  established.
- Other templates that pass an empty or `null` value to `date_format`
  would show today's date. The ones read on `main` guard their empty
  dates, for example `reviewReminderForm.tpl` with
  `{if $reviewAssignment->getDateConfirmed()}`: code.
- 22c03902e1 also calls Carbon directly in `DateGridCellProvider` (the
  event log's date), `FileDateGridColumn` (a file's `updatedAt`),
  `PKPStatsServiceTrait` (the statistics timeline) and
  `QueriesGridCellProvider` and `QueryNotesGridCellProvider` (a note's
  `dateCreated`, read with `?->`). Each always has a date.
  `ReviewAssignmentEmailVariable::formatDate()` returns `null` when
  `strtotime()` fails. None needs the guard: code.

## Proposed fix

A proposal; the team decides. Make the override return nothing for an
empty date, or format `$default_date`, as Smarty's own modifier does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-date-boxes-show-today-unsent/fix.diff)):

```diff
--- a/lib/pkp/classes/template/PKPTemplateManager.php
+++ b/lib/pkp/classes/template/PKPTemplateManager.php
@@ -2421,6 +2421,14 @@
      */
     public function smartyDateFormat($string, $format = null, $default_date = '', $formatter = 'auto')
     {
+        // As Smarty's own date_format: no date formats as nothing (or as $default_date),
+        // never as the current date, which is what Carbon makes of an empty value.
+        if (empty($string) || $string === '0000-00-00' || $string === '0000-00-00 00:00:00') {
+            if (empty($default_date)) {
+                return '';
+            }
+            $string = $default_date;
+        }
         return (new \Carbon\Carbon($string))->locale(Locale::getLocale())->translatedFormat($format);
     }
```

22c03902e1 is the change that turned empty dates into today's date, in
every template at once. Following Smarty's
`smarty_modifier_date_format()` restores the behaviour those templates
were written against. A real date is still formatted by Carbon in the
user's language, which is what `pkp/pkp-lib#9303` added.

Tried on `main`. With the fix in, both boxes stay empty after step 5. At
step 6 jQuery Validate stops the "Save" with "This field is required."
under each box, and nothing is sent. The dates typed afterwards save the
subscription.

The neighbour check gives the same result with the fix in and out.
Dates typed as 2026-01-15 and 2027-01-15 survive a refusal for "A user
is required.", are sent and saved, and the subscription's "Edit" shows
them.

**Alternatives**

- Test with `!empty($FBV_value)` in `textInput.tpl`'s visible box, as its
  hidden field already does: fixes the date pickers only, and leaves
  every other template showing today for no date.
- Guard in `SubscriptionForm`: fixes one window of several.

**What goes with it**

- No REST API or plugin hook is involved. A template that prints an
  empty date now prints nothing, as it did before 3.4.0-8.
- Backport: the diff applies to 3.5 and 3.4 at an offset (the method
  starts at line 2074 on 3.5 and 2043 on 3.4). Its paths are relative to
  the app, so a pkp-lib pull request drops the `lib/pkp/` prefix
  (`patch -p3`).
- Test: a unit test for `smartyDateFormat()` with `''` and `null`.

Small: a few lines in one method, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-date-boxes-show-today-unsent/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-date-boxes-show-today-unsent/walk.js [neighbour|reach]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Without an
  argument it takes steps 1–6 and the control. `reach` takes steps 7–10,
  switches payments on to read the side menu, and walks the issue
  window. `neighbour` is the fix check. The script records the visible
  boxes, the hidden fields and the posted dates at each "Save".
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-date-boxes-show-today-unsent/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–6 on `main` and `stable-3_5_0`, with the same
  result on both; steps 7–10 and the issue window on `main`. No request
  failed and no page script failed.
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
  - 3.5: `smartyDateFormat()` and `textInput.tpl` are as on `main`.
  - 3.4: `smartyDateFormat()` is the same, registered as
    `[$this, 'smartyDateFormat']`. `textInput.tpl`, the subscription
    templates (`class="datepicker"`) and
    `SubscriptionForm::readInputData()` (which reads `dateStart` and
    `dateEnd`) are as on `main`. d6b045eb39 is in the tags from
    `3_4_0-8` on.
  - 3.3: `PKPTemplateManager.inc.php` registers no `date_format`, so
    Smarty 4's own modifier runs. It returns nothing for an empty value.
    The template and form are the same shape.
- Introduced: `git blame` on `PKPTemplateManager.php` line 2424 gives
  22c03902e1, which added the override. The GitHub API lists no pull
  request for it on `main`. It follows pull request `pkp/pkp-lib#10348`
  (1bc3cce1ff, same author, same issue), which moved PHP-side date
  formatting to Carbon. The `$FBV_value!==null` test in `textInput.tpl`
  dates from 8c6a01ecb4 (2022, `pkp/pkp-lib#7690`). That test was
  harmless while Smarty's modifier returned nothing for `''`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words ("start date is required", "datepicker today",
  "subscription date today") and by `smartyDateFormat`, `date_format`
  with Carbon, and `textInput` datepicker. `pkp/pkp-lib#10966` (a `null`
  `$format` in the same method) and `pkp/pkp-lib#12984` (RSS dates
  localized by the same override) are other faults of the same method.
- Unverified: the date boxes marked "code" under Cause, and a pasted
  date. Not driven: steps 7–10 and the issue window on 3.5; MySQL (the
  fault is in PHP and the browser, before any query).
