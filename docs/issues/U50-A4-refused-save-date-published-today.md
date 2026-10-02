# After a refused "Save" on an issue's form, an empty "Date Published" shows today's date

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code)
- **Introduced** the change that made `date_format` read an empty value as now, for `pkp/pkp-lib#9303`: a commit with no pull request on `main` · [22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5), and `pkp/pkp-lib#10352` on 3.4 · [d6b045e](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879) · 2024-09-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U50 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A journal manager or editor leaves "Date Published" empty on "Create
Issue" or "Issue Data", and "Save" is refused for another reason, such
as a "Volume" that is not a number. The form comes back with today's
date in "Date Published", though nobody typed it. They expect the box
to stay empty.

The date is only shown, never saved. If the editor fixes the other
error and saves again without touching the box, the issue is saved with
no Date Published. On a published issue whose date was emptied, the
next "Save" is refused again with "Date Published is required when the
issue is published.", because the shown date is not sent.

## Impact

- **Lost.** Nothing is stored wrong; the editor may believe the issue
  is dated today.
- **Who.** On "Create Issue" the box starts empty, so every refused
  first save shows it. A published issue's date is rarely emptied, so
  the repeated refusal there is a corner case.
- **Way round.** Overwrite the shown date with a real one, or clear the
  box by hand; the box then shows what will be saved. On a published
  issue only the first works.

Low. It would be medium if an editor's belief in the shown date led to
a wrong public date, which was not seen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`,
  with "Vol. 1 No. 2 (2014)" published (Back Issues). Dates are shown as
  year-month-day.

Creating an issue:

1. Sign in as `dbarnes`.
2. Open "Issues", "Future Issues", and press "Create Issue".
3. Leave "Date Published" empty. Type "abc" in "Volume", "1" in
   "Number" and "2026" in "Year", and untick "Title".
4. Press "Save".
5. Read "Date Published".
6. Replace "abc" with "3" in "Volume" and press "Save".
7. On "Future Issues", press the arrow of "Vol. 3 No. 1 (2026)", then
   "Edit", then "Issue Data", and read "Date Published".

Editing a published issue:

8. On "Back Issues", press the arrow of "Vol. 1 No. 2 (2014)", then
   "Edit", then "Issue Data". "Date Published" holds the issue's date.
9. Empty "Date Published" and press "Save".
10. Read "Date Published".
11. Press "Save" again.

**Expected.** Step 4 is refused with "Volume is required and must be a
positive, numeric value.", and at step 5 "Date Published" is empty, as
it was left. Step 9 is refused with "Date Published is required when
the issue is published.", and at step 10 the box is empty.

**Observed.** At step 5 "Date Published" holds today's date
("2026-10-02" on the day of the walk) under the help line "If left
empty, the date will be set automatically when the issue is
published.". Step 6 creates the issue, and at step 7 its "Date
Published" is empty: the issue has no date. At step 10 the box holds
today's date under the message:

```
Date Published is required when the issue is published.
```

Step 11 is refused again with the same message, and the box still holds
today's date. The issue keeps the date it had before step 9.

A date typed before a refused "Save" ("2025-04-01" in step 3) stays in
the box and is saved with the issue.

## Cause

A legacy form's date box is rendered by pkp-lib's
`templates/form/textInput.tpl` as two fields with the same `name`: the visible box and a
hidden `<id>-altField`. Only the hidden field is posted, because
`FormHandler.js` renames each visible datepicker box to
`<name>-removed` when the form opens. They take their
value from the same variable under different checks (line 65 and line
76):

```smarty
{elseif $FBV_class|default:""|strstr:"datepicker" && $FBV_value!==null}{$FBV_value|date_format:$dateFormatShort|escape}
...
value="{if !empty($FBV_value)}{$FBV_value|date_format:"Y-m-d"|escape}{/if}"
```

When the form is first opened, an issue without a date gives `null`,
and both fields are empty. After a refused save, `IssueForm` is
redrawn from what was posted (`readInputData()` reads `datePublished`,
and `IssueGridHandler::updateIssue()` returns `$issueForm->fetch()`).
An empty box was posted as an empty string. That passes the visible
box's `!== null` check and goes through `date_format`, while the hidden
field's `!empty()` check leaves it empty.

`date_format` has been `PKPTemplateManager::smartyDateFormat()` since
22c0390, which registered it in place of Smarty's own modifier so that
dates follow the reader's language (`pkp/pkp-lib#9303`):

```php
return (new \Carbon\Carbon($string))->locale(Locale::getLocale())->translatedFormat($format);
```

Carbon reads an empty string, or `null`, as the current moment. Smarty's
own modifier prints nothing for an empty value, or the `$default_date`
argument when one is given. The visible box's `!== null` check came
with 2bad175b40 (2018, `pkp/pkp-lib#4216`), when `date_format` was
still Smarty's own modifier and printed nothing for an empty string. So the box shows today's date and the hidden field
posts nothing. `FormHandler`'s `submitHandler_` empties the hidden
field only when the box is empty, so the shown date is never sent.

Reach:

- "Create Issue" and "Issue Data", OJS: walked.
- Read, not walked: an issue's "Access" tab (the open access date) and
  the "Start Date" and "End Date" of individual and institutional
  subscriptions, OJS. Their handlers also redraw a refused form from
  what was posted.
- A review's due dates (pkp-lib, OJS and OMP): a refused save is
  answered without redrawing the form, so the box stays as typed.
  Walked on OJS and OMP `main`: "Review Due Date" emptied and "OK"
  stays empty after the refusal. The "Add Reviewer" and "Resend
  Request" forms are answered the same way (`updateReviewer()`,
  `updateResendRequestReviewer()`), read, so they are not affected.
- A chapter's "Date Published", OMP: `ChapterGridHandler::updateChapter()`
  does not redraw a refused form either, read.
- OPS has no date box in a legacy form on `main`.
- The other `|date_format` uses in the three apps' templates print a
  value that is set or sits behind an `{if}`; none was found that
  reaches an empty value in ordinary use.

## Proposed fix

Make `smartyDateFormat()` do with an empty value what Smarty's own
modifier, the one it replaces, does: print the `$default_date` when one
is given, otherwise nothing
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-save-date-published-today/fix.diff),
against the app root):

```diff
--- a/lib/pkp/classes/template/PKPTemplateManager.php
+++ b/lib/pkp/classes/template/PKPTemplateManager.php
@@ -2421,6 +2421,14 @@
      */
     public function smartyDateFormat($string, $format = null, $default_date = '', $formatter = 'auto')
     {
+        // As Smarty's own modifier does: no date prints the default date, or nothing.
+        // (Carbon reads an empty value as the current moment.)
+        if (empty($string) || $string === '0000-00-00' || $string === '0000-00-00 00:00:00') {
+            if (empty($default_date)) {
+                return '';
+            }
+            $string = $default_date;
+        }
         return (new \Carbon\Carbon($string))->locale(Locale::getLocale())->translatedFormat($format);
     }
     /**
```

The check is Smarty's own (`smarty_modifier_date_format()`), so every
template that called `date_format` before 22c0390 gets back the
behavior it was written for, and the translated formatting that
22c0390 added is kept for every real date. One change in the modifier
covers every date box in the Cause's Reach and any other template that
formats an empty value.

Tried on OJS `main`. With the fix, steps 5 and 10 show an empty "Date
Published" next to the same messages, and step 11 is refused with the
box still empty. A typed date still survives a refused save and is
saved, and a set date still prints on "Back Issues" ("2026-10-01") and
on the issue's page ("Published: 2026-10-01"), with the fix in and out.

**Alternatives**

- Change the visible box's check in `textInput.tpl` from `!== null` to
  `!empty()`, as the hidden field's is. That fixes the date boxes only,
  and leaves every other template that formats an empty value printing
  the current date.
- Have `IssueForm` turn an empty `datePublished` into `null` in
  `readInputData()`. That is a guard in one form, and the subscription
  and access forms would still show the fault.

**What goes with it**

- No stored data to repair: the shown date was never posted.
- Backport: the method is the same on `stable-3_5_0` and
  `stable-3_4_0` (d6b045e), so the diff applies there with a line
  offset. `stable-3_3_0` uses Smarty's own modifier and needs nothing.
- Test: a unit test of `smartyDateFormat()` with `''`, `null` and a
  `$default_date`, and an e2e scenario in which a refused "Create Issue"
  keeps an empty "Date Published" empty.

Small: a few lines in one shared method, following the modifier it
replaces.

## Evidence

- Kept scripts, which take the Steps through the screens on installs
  freshly loaded from PKP's default test dataset (pkp/datasets c657990,
  PostgreSQL):
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-save-date-published-today/walk.js)
  (steps 1 to 11, OJS), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/refused-save-date-published-today/walk.js`,
  with its helpers in `lib.js` beside it. It records the visible box,
  the hidden field the form posts, the messages and the stored
  `issues.date_published`. Beside it:
  - `neighbour.js` (a typed date kept through a refused save, and a set
    date on "Back Issues" and the issue's page);
  - `review.js` (a review's "Review Due Date" emptied and refused, OJS
    submission 12 and OMP submission 17, Julie Janssen's row), run with
    `ojs,omp` in place of `ojs`.
- The fix was tried with `walk.js` and `neighbour.js`, each on a
  freshly loaded install; `neighbour.js` was also run without the fix.
  OMP was not tried, since no OMP screen showed the fault.
- Tips: OJS `main` b84f8e2e44 with pkp-lib ddd8ab243a; OMP `main`
  3b0ecf794c with pkp-lib 3dc90c81a6; OJS `stable-3_5_0` c346ee00a5
  with pkp-lib 3bb4450bea; OJS `stable-3_4_0` 75cc2d488b with pkp-lib
  32b0f4b4af; OJS `stable-3_3_0` ac77c9fb35 with pkp-lib f6ab331645.
- 3.5 (walked, and read): `walk.js` on the `stable-3_5_0` install gave
  the same results at every step. The read: `smartyDateFormat()` and
  the two checks in `textInput.tpl`, the same as on `main`.
- 3.4, read in the code: `smartyDateFormat()` has the same body
  (d6b045e), `textInput.tpl` the same checks, and
  `IssueGridHandler::updateIssue()` redraws a refused form. `IssueForm`
  there has no "Date Published is required" check, so the
  published-issue group of the Steps does not apply on 3.4 as written
  (what an emptied date saves there was not checked). The "Create
  Issue" group applies as written.
- 3.3, read in the code: `PKPTemplateManager.inc.php` registers no
  `date_format`, so Smarty's own modifier is used, which prints nothing
  for an empty value (read in the Smarty copy vendored in `main`'s
  pkp-lib, `smarty_modifier_date_format()`).
- Introduced: `git blame` on `smartyDateFormat()` names 22c0390
  (2024-09-06, "pkp/pkp-lib#9303 Fix localized date formatting").
  GitHub lists no pull request for it. On `stable-3_4_0` the same change
  is d6b045e ("Override Smarty date formatter to support
  multilingualism (#10352)"), the squash merge of pull request
  `pkp/pkp-lib#10352`, which cites `pkp/pkp-lib#9303`. `git log -S '$FBV_value!==null'` on
  `textInput.tpl` names 2bad175b40 (2018, `pkp/pkp-lib#4216`).
- Upstream search (2026-10-02), issues and pull requests, open and
  closed: pkp/pkp-lib for "date published today", "datepicker today",
  "date_format empty", "smartyDateFormat", "carbon empty date current"
  and "date_format carbon"; pkp/ojs for "date published today", "issue
  date published current date" and "datepicker refused"; pkp/ui-library
  for "date today empty". Read and found to be other faults:
  `pkp/pkp-lib#10966` (closed: a 500 on the article page from the
  same method's `$format`), `pkp/pkp-lib#7165` (closed: setting an
  issue's date before publishing) and `pkp/pkp-lib#10264` (open: date
  types in general).
- Not driven: the "Access" tab and the subscription forms (Cause,
  Reach); MySQL (the fault is in rendering an empty string and does
  not depend on the database).
