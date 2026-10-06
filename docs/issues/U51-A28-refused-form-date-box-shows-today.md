# After a refused "Save", a subscription's empty date boxes show today's date, but the form does not submit it

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code)
- **Introduced** pushed without a pull request, for `pkp/pkp-lib#9303` · [22c03902e1](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5) · 2024-09-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A28](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a28)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager presses "Save" in "Create New Subscription" before
filling in "Start date" and "End date". The window refuses, as it
should, but from then on both empty date boxes show today's date, which
the form does not submit. The next "Save" is refused again with "A
subscription start date is required." and "A subscription end date is
required." beside boxes that show a date.

On the 1st to the 9th of a month, typing today's date over the one shown
does not help either, so a subscription starting today cannot be saved
until the manager types another day first and then today's date again,
or closes the window and starts over. Any "Save" pressed before both
dates are typed leads into this, since an expiring subscription type
requires both.

## Impact

- **Lost.** No data; the manager's time, with a window that says a date
  is missing while it shows one.
- **Who.** A Journal Manager or Subscription Manager whose first "Save"
  in a subscription window is refused while a date box is still empty.
- **Way round.** Close the window and open it again (the boxes are
  empty again, and a date typed into them is submitted), or type a
  different date and then the wanted one.

Medium, for one reason: "Save" keeps failing while the window shows the
dates it asks for, and only a step nobody would guess gets past it. It
would be low if retyping the shown date worked on every day of the
month.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`.
  It has no subscription type; step 2 makes one.
- Step 7 fails as described only when it is taken on the 1st to the 9th
  of a month. From the 10th on, step 7 saves the subscription (see
  Cause), and steps 4 to 6 still show the fault.

1. Sign in as `rvaca` (Journal manager).
2. Open the "Subscriptions" page at
   `/index.php/publicknowledge/en/payments`, tab "Subscription Types",
   press "Create New Subscription Type": "Name of Type" "u51sb7 Online
   Year", currency "US Dollar", "Cost" 10, "Format" "Online", "Duration"
   12, "Individual", "Save".
3. Tab "Individual Subscriptions", press "Create New Subscription".
   "Start date" and "End date" are empty.
4. Choose "u51sb7 Online Year" in "Subscription type" and press "Save",
   leaving the rest as it is.
5. Read "Start date" and "End date".
6. Under "Locate a User" search `ccorino` and choose Carlo Corino;
   "Status" "Active"; press "Save".
7. Click into "Start date" (the calendar opens), select the date, press
   Delete and type today's date as YYYY-MM-DD key by key (not pasted,
   not picked in the calendar); do the same in "End date" with the same
   day next year; press "Save".

**Expected.** After step 4 the date boxes are still empty, as the
refusal says; at step 7 the subscription is saved.

**Observed.** Step 4 is refused: the window's top reads

```
Errors occurred processing this form
A user is required.
A subscription start date is required.
A subscription end date is required.
```

and the two date messages stand beside the boxes. At step 5 both boxes
show today's date ("2026-10-01"). Step 6 is refused with the same two
messages beside the boxes, which still show today's date. Step 7 is
refused with "A subscription start date is required." beside "Start
date", which shows "2026-10-01"; the end date typed is submitted.

## Cause

A date box in these forms is two fields (lib/pkp
`templates/form/textInput.tpl`, lines 65 and 73–78): the visible box,
renamed `<name>-removed` by `js/controllers/form/FormHandler.js` (line
75), and a hidden field that carries the field's own name (`dateStart`,
`dateEnd`). jQuery UI's datepicker writes the hidden field (`altField`),
and only the hidden field is submitted.

After a refused save the form is drawn again from what was submitted, so
an empty date is `''`. The hidden field stays empty, since its value is
written only `{if !empty($FBV_value)}` (line 76). The visible box is
guarded only by `$FBV_value!==null` (line 65), so `''` goes through
`{$FBV_value|date_format:$dateFormatShort}`.

That modifier is pkp's own since 22c03902e1:
`PKPTemplateManager::smartyDateFormat()` (lib/pkp
`classes/template/PKPTemplateManager.php`, line 2422) returns
`(new \Carbon\Carbon($string))->…->translatedFormat($format)`, and
Carbon reads an empty or null value as the current time. Smarty's own
`date_format`, which it replaces, returns the `$default_date` argument
for an empty value, or nothing; the override ignores that argument. The
change was made to translate month and day names
(`pkp/pkp-lib#9303`), and the empty case was lost with it.

Why retyping today's date fails on the 1st to the 9th: jQuery UI's
`_doKeyUp` copies the box into the hidden field only on a key release
where the box's text parses as a date and differs from `lastVal`, the
text it last read, which `_setDateFromField` sets to the shown date when
the calendar opens. Typed key by key, the box holds "2026-10-0" just
before the last key, which is not a date, and then "2026-10-01", which
equals `lastVal`, so the hidden field is never written. From the 10th
on, the box holds a date one key earlier ("2026-10-1" on the way to
"2026-10-15"), which updates `lastVal`, and the last key is then
copied. Read in jQuery UI; the fault was seen on the 1st only.

Reach:

- The individual subscription window: seen on screen. The institutional
  one (`institutionalSubscriptionForm.tpl`) has the same two boxes: read
  in the code.
- Every other form drawn with `class="datepicker"` boxes shows today's
  date in an empty box after a refused save, by the code: an issue's
  "Date Published" (`issueForm.tpl`) and its "Access" date
  (`issueAccessForm.tpl`) in OJS; a chapter's "Date Published"
  (`chapterForm.tpl`, when chapter dates are on) in OMP; the review due
  dates in all three apps (`editReviewForm.tpl`,
  `reviewerFormFooter.tpl`, `resendRequestReviewerForm.tpl`), which are
  rarely empty; the Publication Facts Label settings' dates in OJS. None
  of these was driven, so Affects names only the subscription window's
  app.
- Other callers of the modifier: the templates read
  (`userSubscriptions.tpl`, `issue_toc.tpl`, `article_summary.tpl`,
  `reviewReminderForm.tpl`, reviewer `step1.tpl`) guard it with an `{if}`
  or always hold a date; `PKP\template\ViewHelper::dateFormat()`
  (lib/pkp `classes/template/ViewHelper.php`, line 41) delegates to it,
  and no Blade view calls it today. The other `|date_format` uses were
  not all read.

## Proposed fix

Give `smartyDateFormat()` back the empty-value handling of the Smarty
modifier it replaces, so every template gets it
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-form-date-box-shows-today/fix.diff),
against the app root):

```diff
     public function smartyDateFormat($string, $format = null, $default_date = '', $formatter = 'auto')
     {
+        // As Smarty's own modifier does: an empty date is formatted from $default_date, or not at all.
+        // (Carbon would otherwise read an empty value as the current time.)
+        if (empty($string) || $string === '0000-00-00' || $string === '0000-00-00 00:00:00') {
+            if (empty($default_date)) {
+                return '';
+            }
+            $string = $default_date;
+        }
         return (new \Carbon\Carbon($string))->locale(Locale::getLocale())->translatedFormat($format);
     }
```

Tried on OJS `main`: after step 4 both boxes are empty. At step 6 the
browser itself refuses, with "This field is required." beside the two
empty boxes, and nothing is submitted: a refused save draws the form's
required checks as browser checks, which an empty box now fails. Step 7
saves the subscription from today. A date typed before a refused "Save"
(no user chosen) is still shown and submitted afterwards, and saves once
the user is chosen; "Edit" on the saved subscription shows its stored
dates.

**Alternatives**

- Guard the visible box in `textInput.tpl` with `!empty($FBV_value)`,
  as its hidden field already is: it mends the date boxes but leaves
  every other template that formats an empty date showing today's.
- Copy the visible box into the hidden field before submitting:
  `FormHandler.submitHandler_` (lines 437–442) already does this for an
  empty box only. Extending it to a filled box would submit a date the
  person never chose.

**What goes with it**

- Callers whose output changes: only those that pass an empty value,
  which today print the current date; they print nothing (or
  `$default_date`) as they did before 22c03902e1.
- Backport: `smartyDateFormat()` is the same on `stable-3_5_0` and on
  `stable-3_4_0`, where it came with d6b045eb39 (`pkp/pkp-lib#10352`);
  `stable-3_3_0` has no override.
- Test: a unit test of the modifier with `''` and `null`, and an e2e
  scenario that saves a subscription window empty and reads the date
  boxes.

## Evidence

- Script: [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-form-date-box-shows-today/walk.js)
  (helpers in [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-form-date-box-shows-today/lib.js)),
  which types each date key by key and reads after each step what each
  box shows and what its hidden field holds, on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/refused-form-date-box-shows-today/walk.js`.
  With `neighbour` as its last argument it types both dates, saves
  without a user, reads the boxes, chooses `dsokoloff`, saves, and
  opens the row's "Edit": the case the fix must leave alone.
- Fix tried with `node bin/try-fix.js apply shared/playwright/checks/issues/refused-form-date-box-shows-today/fix.diff ojs`, the script both ways, then `revert`.
- Commits checked: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  with lib/pkp [ddd8ab243a](https://github.com/pkp/pkp-lib/commit/ddd8ab243a39584ce34cdcf379acb17b46e496b8);
  `stable-3_5_0` OJS
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  with lib/pkp 3bb4450bea; `stable-3_4_0` lib/pkp 32b0f4b4af and OJS
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315);
  `stable-3_3_0` lib/pkp f6ab331645 and OJS
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b).
  Dataset pkp/datasets c657990 (2026-10-01), PostgreSQL; nothing here
  depends on the database.
- On 3.5 the same steps gave the same results at every step. 3.4 was
  read in the code (`smartyDateFormat()` at line 2043, the same body).
  3.3 registers no `date_format`, so Smarty 4's own modifier formats
  `''` to nothing; the template lines are the same.
- Introduced: `git blame` on `smartyDateFormat()`. The template's
  `!==null` guard (8c6a01ecb4, 2022) was enough while Smarty's modifier
  formatted `''` to nothing.
- jQuery UI: `_doKeyUp`, `_showDatepicker` and `_setDateFromField` in
  `js/build/jquery-ui/jquery-ui.js` of the OJS `main` checkout.
- Upstream: `pkp/pkp-lib#10966` (closed: a 500 from the same method
  when `$format` is null) and `pkp/pkp-lib#7165` (closed: an issue's
  publication date before publishing) are other faults.
- Related, not the same fault: [U19-A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A15-oai-marc-008-date-percent-signs.md)
  (MARC 008 dates with "%" signs) also comes from 22c03902e1, where the
  override stopped reading Smarty's `strftime()` patterns; its fix is in
  the MARC templates. A change to `smartyDateFormat()` for either should
  be read beside the other. [U13-OJS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md)
  (a typed date that does not exist saved as another date) is the hidden
  field keeping the last date the datepicker could read; this one is the
  server drawing a date nobody chose.
- Not driven, unconfirmed: the other forms in the Cause's Reach, and
  what an issue saved after such a refusal stores in "Date Published";
  the calendar pick of today's date (jQuery UI's `_selectDate` writes
  the hidden field); MySQL.
