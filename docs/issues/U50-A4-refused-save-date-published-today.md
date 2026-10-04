# Empty "Date Published" boxes show today's date, unsaved: issues after a refused save, chapters after any save

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code)
- **Introduced** for `pkp/pkp-lib#9303`: on `main` [22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5), pushed without a pull request; on `stable-3_4_0` [d6b045e](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879), the merge of pull request `pkp/pkp-lib#10352` · 2024-09-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U50 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a4) · spec U72 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a4)
- **Checked** 2026-10-02 (OJS) and 2026-10-04 (OMP), each branch's tip (the commits in Evidence)

2026-10-04: widened to the same fault in a press's chapter window (OMP).

## Summary

On a press whose book has "Each chapter may have its own publication
date." chosen, an editor saves a chapter's window with "Date Published"
empty. From then on the box shows today's date every time the chapter
is opened, though the chapter has no date. Saving the window again with
that date in it does not store it. No error is needed: any save of an
undated chapter, a change of title or pages included, leads into this.

On a journal, a manager or editor leaves "Date Published" empty on
"Create Issue" or "Issue Data", and "Save" is refused for another
reason, such as a "Volume" that is not a number. The form comes back
with today's date in the box, and the issue is then saved with no date.
On a published issue whose date was emptied, the save is refused with
"Date Published is required when the issue is published.", and saving
again with today's date shown is refused the same way, because the
shown date is not sent.

An editor who wants today's date sees it set when it is not, and the
chapter's page keeps showing the book's date. Picking the date in the
calendar sets it; typing today's date over the shown one does not, on
the 1st to the 9th of a month.

## Impact

- **Lost.** No date is stored wrong, but the box shows a date the
  chapter or issue does not have. A chapter whose editor trusts it stays
  undated, so its page and citation tags carry the book's date (read in
  the code, not walked).
- **Who.** On a press, the editors of every book that dates chapters
  one by one, at every opening of a chapter saved without a date. On a
  journal, whoever has a first "Save" on "Create Issue" refused; a
  published issue's date is rarely emptied.
- **Way round.** For a chapter, pick the date in the calendar, or type
  a date other than today's. For an issue, type a real date over the
  shown one; on a published issue clearing the box is refused, so
  typing a date is the only way.

Medium: on a press that dates chapters, the window shows every undated
chapter as dated today, an editor gets no sign that the date was never
saved, and the chapter's page shows another date; the calendar sets it.
The issue form alone would be low, as nothing public is wrong there.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`,
  with "Vol. 1 No. 2 (2014)" published (Back Issues). Dates are shown as
  year-month-day.
- For the chapter steps, PKP's default test dataset, OMP `main`: press
  `publicknowledge`, with submission 4, "How Canadians Communicate:
  Contexts of Canadian Popular Culture", whose four chapters have no
  date and whose "Publication Dates" has no choice saved.

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

A chapter's date (OMP):

12. Sign in as `dbarnes` and open submission 4
    (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`).
13. In the side menu choose "Marketing" › "Publication Dates", select
    "Each chapter may have its own publication date." and press "Save".
14. Choose "Publication" › "Chapters" and press "Introduction: Contexts
    of Popular Culture". "Date Published" is empty. Press "Save" without
    changing anything.
15. Press "Introduction: Contexts of Popular Culture" again and read
    "Date Published".
16. Press "Save", open the chapter again and read "Date Published".
17. Press "Add Chapter", type "u72b Undated chapter" in "Title", leave
    "Date Published" empty and press "Save".
18. Press "u72b Undated chapter" and read "Date Published".

**Expected.** Step 4 is refused with "Volume is required and must be a
positive, numeric value.", and at step 5 "Date Published" is empty, as
it was left. Step 9 is refused with "Date Published is required when
the issue is published.", and at step 10 the box is empty. At steps 15,
16 and 18 a chapter's "Date Published" is empty: the chapter has no
date.

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

At steps 15, 16 and 18 the chapter's "Date Published" holds today's
date ("2026-10-04" on the day of the walk). Each "Save" closes the
window with "Your changes have been saved.", and the chapter still has
no date: the shown date is never sent.

Controls: a date typed at step 3 ("2025-04-01") stays in the box after
the refused save and is saved with the issue. After step 13, a date
typed in "Chapter 1. A Future for Media Studies: …" ("2024-05-01") is
saved and shown at its next opening; today's date picked in the
calendar after step 15 is saved too, while today's date typed over the
shown one is not.

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
still Smarty's own modifier and printed nothing for an empty string.
`FormHandler`'s `submitHandler_` empties the hidden field only when the
box is empty, so the shown date is never sent.

A chapter's form reaches the same `!== null` check without a refused
save. The empty
hidden field posts `datePublished` as an empty string, and
`ChapterForm::execute()` (OMP
`controllers/grid/users/chapter/form/ChapterForm.php`, lines 313 and
324) stores it as the chapter's date, kept in
`submission_chapter_settings` as `''`. The dataset's chapters, never
saved with chapter dates on, hold `NULL`, so their first opening is
empty. `ChapterForm::initData()` (line 196) passes the stored `''` to
the template at every later opening, and the box shows today's date.

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
  `updateResendRequestReviewer()`, read in the code), so they are not
  affected.
- A chapter's "Date Published", OMP: walked. Every chapter saved with
  the box empty while chapter dates are on shows today's date from then
  on; `ChapterGridHandler::updateChapter()` does not redraw a refused
  form, so a refusal adds nothing there. The stored `''` reads as no
  date everywhere else (read in the code): the chapter page
  (`CatalogBookHandler`) and the Google Scholar and Dublin Core tags
  test the chapter's date for truth and fall back to the book's.
- Typing today's date over the shown one, OMP: walked on the 4th.
  jQuery UI's `_doKeyUp` copies the box into the hidden field only when
  the text parses as a date and differs from the text it read when the
  calendar opened; typed key by key, the box holds "2026-10-0", not a
  date, and then the shown text again, so nothing is copied. From the
  10th on a date one key shorter parses first (U51's report,
  `pkp-e2e#403`, traces this). A calendar pick writes the hidden field.
- Other callers of the modifier: `PKP\template\ViewHelper::dateFormat()`
  (lib/pkp `classes/template/ViewHelper.php`, line 41) returns its
  result as a `string`; no Blade view calls it today.
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
22c0390 added is kept for every real date. It returns `''` where
Smarty's modifier returns nothing (`null`), because
`ViewHelper::dateFormat()` is declared to return a `string` and would
throw a `TypeError` on `null`.

Tried on OJS and OMP `main`. With the fix, steps 5 and 10 show an empty
"Date Published" next to the same messages, and step 11 is refused with
the box still empty; on OMP, steps 15, 16 and 18 show an empty box.
The controls give the same results with the fix as without it: a typed
date survives a refused save and is saved, a set date prints on "Back
Issues" ("2026-10-01") and on the issue's page ("Published:
2026-10-01"), and a typed chapter date is saved and shown at the next
opening.

**Alternatives**

- Change the visible box's check in `textInput.tpl` from `!== null` to
  `!empty()`, as the hidden field's is. That fixes the date boxes only,
  and leaves every other template that formats an empty value printing
  the current date.
- Have `IssueForm` turn an empty `datePublished` into `null` in
  `readInputData()`. That is a guard in one form, and the subscription
  and access forms would still show the fault.

**What goes with it**

- No stored data to repair: the shown date was never posted, and a
  chapter's stored `''` reads as no date.
- Backport: the method is the same on `stable-3_5_0` and
  `stable-3_4_0` (d6b045e), so the diff applies there with a line
  offset. `stable-3_3_0` uses Smarty's own modifier and needs nothing.
- Test: a unit test of `smartyDateFormat()` with `''`, `null` and a
  `$default_date`, and e2e scenarios in which a refused "Create Issue"
  keeps an empty "Date Published" empty and a chapter saved without a
  date opens with an empty box.

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
- The chapter steps (12 to 18, OMP):
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-date-published-shows-today/walk.js)
  in `chapter-date-published-shows-today/`, run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-date-published-shows-today/walk.js`
  on an install loaded from pkp/datasets 566bb1f (2026-10-03),
  PostgreSQL. It records the visible box, the hidden field the form
  posts and the stored `submission_chapter_settings` value; with
  `neighbour` as its last argument it types 2024-05-01 into "Chapter 1.
  A Future for Media Studies: …", saves and reopens; with `wayround`, it
  saves two chapters empty, then gives one today's date typed key by key
  and the other today's date picked in the calendar, and reads what was
  stored (walked 2026-10-04).
- The fix was tried with `walk.js` and `neighbour.js`, each on a
  freshly loaded install; `neighbour.js` was also run without the fix.
  On OMP the chapter `walk.js` with the fix, and its `neighbour` mode
  with and without it, each on a freshly loaded install
  (`node bin/try-fix.js apply shared/playwright/checks/issues/refused-save-date-published-today/fix.diff omp`,
  then `revert`).
- Tips: OJS `main` b84f8e2e44 with pkp-lib ddd8ab243a; OMP `main`
  3b0ecf794c with pkp-lib 3dc90c81a6; OJS `stable-3_5_0` c346ee00a5
  with pkp-lib 3bb4450bea; OJS `stable-3_4_0` 75cc2d488b with pkp-lib
  32b0f4b4af; OJS `stable-3_3_0` ac77c9fb35 with pkp-lib f6ab331645.
  For the chapter steps (2026-10-04): OMP `main` 3b0ecf794c with
  pkp-lib 3dc90c81a6; OMP `stable-3_5_0` 9c5e24246c with pkp-lib
  cf3f984335; OMP `stable-3_4_0` 0aec65441 with pkp-lib 767353f4fe;
  OMP `stable-3_3_0` 8e72fc883 with pkp-lib ac3fa73402.
- 3.5 (walked, and read): `walk.js` on the `stable-3_5_0` install gave
  the same results at every step. The read: `smartyDateFormat()` and
  the two checks in `textInput.tpl`, the same as on `main`. The chapter
  `walk.js` on OMP `stable-3_5_0` gave the same results at every step;
  `ChapterForm` reads and stores the date as on `main`.
- 3.4, read in the code: `smartyDateFormat()` has the same body
  (d6b045e), `textInput.tpl` the same checks, and
  `IssueGridHandler::updateIssue()` redraws a refused form. `IssueForm`
  there has no "Date Published is required" check, so the
  published-issue group of the Steps does not apply on 3.4 as written
  (what an emptied date saves there was not checked). The "Create
  Issue" group applies as written. OMP: `ChapterForm.php` reads and
  stores `datePublished` as on `main` (lines 196, 313, 324) and
  `chapterForm.tpl` draws the same `datepicker` box, so the chapter
  group applies as written; whether 3.4's "Publication Dates" choice
  sits on the same screen was not checked.
- 3.3, read in the code: `PKPTemplateManager.inc.php` registers no
  `date_format`, so Smarty's own modifier is used, which prints nothing
  for an empty value (read in the Smarty copy vendored in `main`'s
  pkp-lib, `smarty_modifier_date_format()`). OMP's
  `ChapterForm.inc.php` stores an empty date the same way, which that
  modifier prints as nothing.
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
  types in general). Again on 2026-10-04 for the chapter: pkp/pkp-lib
  "chapter date published today", "chapter publication date",
  "datepicker current date empty", "smartyDateFormat" and "date_format
  carbon"; pkp/omp "chapter date published", "chapter publication date
  today" and "enableChapterPublicationDates"; pkp/ui-library "date
  published today". Nothing new: `pkp/pkp-lib#4920` and `pkp/omp#687`
  (closed) brought chapter dates in, `pkp/pkp-lib#12984` (closed) is an
  RSS datestamp.
- Not driven: the "Access" tab and the subscription forms (Cause,
  Reach); the reader's chapter page for a chapter saved so; MySQL (the fault is in rendering an empty string and does
  not depend on the database).
