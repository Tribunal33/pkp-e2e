# Saving an issue's "Issue Data" drops it below the other issues published the same day on "Back Issues"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced; present since at least [16ca116f6f](https://github.com/pkp/ojs/commit/16ca116f6fec11654764bdfc1c973777c1544a0a) (2008-06-09)
- **Upstream** `pkp/pkp-lib#9081` (open), covering more: it asks to align the date types of an issue's and a publication's Date Published, and names this loss of the time of day as one reason
- **Tracked in** spec U50 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a19)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Publish Issue" gives an issue whose "Date Published" box is empty the
date and time it was published; the box and the "Published" column show
the date alone. Every "Save" on "Issue Data", even with nothing changed,
keeps the date and drops the time. "Back Issues" lists the newest issue
first after the current one, so the saved issue then drops below every
other issue published the same day, where a Journal Manager who only
corrected a description expects the list to stay as it was.

Nothing tells the editor, and the dates shown do not change. It reaches
journals that publish two or more issues on one day, such as a journal
entering its back issues, and that have never saved an order on "Back
Issues". Readers do not see it: the journal's "Archives" does not sort
by these dates.

## Impact

- **Lost.** The time of day the issue was published, which sets its
  place among the issues of its day on "Back Issues".
- **Who.** Editors and Journal Managers reading "Back Issues". Not
  readers today: the reader's "Archives" sorts by a saved order alone,
  and without one lists the issues in no set order
  ([pkp-e2e#412](https://github.com/jardakotesovec/pkp-e2e/issues/412)).
- **Way round.** "Order" on "Back Issues" puts the issues in the wanted
  order, and a saved order wins over the dates.

Low: only the editorial list's order among issues of the same day
changes, and the edit itself is saved. It would be medium if "Archives"
sorted like "Back Issues", as the fix proposed for pkp-e2e#412 makes it
do. The fix proposed here stands alone and can land before
`pkp/pkp-lib#9081`, which asks for a time box in the form and a date
and time column for publications (Proposed fix, Alternatives).

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, on PostgreSQL. Its journal
  `publicknowledge` holds "Vol. 1 No. 2 (2014)" (published, the current
  issue) and "Vol. 2 No. 1 (2015)" (unpublished). No order was ever
  saved on "Back Issues".
- The dataset gives the 2015 issue a Date Published on the 2014 issue's
  day, a few minutes later, and "Publish Issue" does not overwrite a
  Date Published that is already set. Both dates are from the day the
  dataset was built, so the days below differ by build. To check:

  ```sql
  SELECT volume, number, year, published, date_published FROM issues ORDER BY year;
  ```

  The 2015 row must read the 2014 row's day with a later time. If it
  does not, take the steps under "Fallback" instead.
- Nothing else. The steps publish the 2015 issue, then create and
  publish a third issue, so that the two issues of the same day sit
  below the current one.

Steps:

1. Sign in as `dbarnes`.
2. Issues (`/index.php/publicknowledge/en/manageIssues`), "Future
   Issues", the arrow of "Vol. 2 No. 1 (2015)", "Publish Issue". Untick
   the notification box, "OK".
3. "Create Issue": Volume 3, Number 1, Year 2016, Title "hkk21", "Save".
4. The arrow of "Vol. 3 No. 1 (2016): hkk21", "Publish Issue". Untick
   the box, "OK".
5. "Back Issues": read the list and its "Published" column.
6. The arrow of "Vol. 2 No. 1 (2015)", "Edit", tab "Issue Data". "Date
   Published" shows the day the dataset was built (2026-10-12 in the
   walk). "Save" with nothing changed.
7. "Back Issues": read the list again.

Fallback, for a dataset whose 2015 issue has no later time on the 2014
issue's day: two issues are published on the day of the walk instead.

1. Sign in as `dbarnes`.
2. Issues, "Future Issues", the arrow of "Vol. 2 No. 1 (2015)", "Edit",
   tab "Issue Data": empty "Date Published", "Save", close the window.
3. Publish "Vol. 2 No. 1 (2015)" as in step 2 above.
4. Create and publish "Vol. 3 No. 1 (2016)", Title "hkk21", as in steps
   3 and 4 above.
5. Create and publish "Vol. 4 No. 1 (2017)", Title "hkk21b", the same
   way. It becomes the current issue.
6. "Back Issues": read the list.
7. The arrow of "Vol. 3 No. 1 (2016): hkk21", "Edit", tab "Issue Data",
   "Save" with nothing changed.
8. "Back Issues": read the list again. The 2016 issue now sits below the
   2015 one; both show the day of the walk.

**Expected:** step 7 lists the issues as step 5 does, since nothing was
changed.

**Observed:** the saved issue moves below the 2014 issue. The
"Published" column shows the same dates before and after (the dataset's
day and the day of the walk):

```
step 5:  Vol. 3 No. 1 (2016): hkk21   2026-10-15
         Vol. 2 No. 1 (2015)          2026-10-12
         Vol. 1 No. 2 (2014)          2026-10-12

step 7:  Vol. 3 No. 1 (2016): hkk21   2026-10-15
         Vol. 1 No. 2 (2014)          2026-10-12
         Vol. 2 No. 1 (2015)          2026-10-12
```

In the database, the 2015 issue's `date_published` went from
`2026-10-12 14:11:27` to `2026-10-12 00:00:00`; the 2014 issue's stays
`2026-10-12 13:54:43`.

## Cause

`issues.date_published` is a date and time. `IssueGridHandler::publishIssue()`
(`classes/controllers/grid/issues/IssueGridHandler.php`) fills an empty
one with `Core::getCurrentDate()`, the date and the time of day.

The "Issue Data" form edits it as a day. The template hands the stored
value to a jQuery UI date picker, which shows the day in the journal's
short date format and posts it as `Y-m-d` from its hidden twin
(`lib/pkp/templates/form/textInput.tpl`, `FormHandler.js`).
`IssueForm::validate()` then requires exactly `Y-m-d`.

`IssueForm::execute()` (`controllers/grid/issues/form/IssueForm.php`,
line 271) writes that day over the stored value on every save:

```php
$issue->setDatePublished(!$this->getData('datePublished') && !$issue->getPublished() ? null : $this->getData('datePublished'));
```

So a save that repeats the day stores it at midnight.

"Back Issues" (`BackIssueGridHandler`) orders by
`Collector::ORDERBY_PUBLISHED_ISSUES`: a saved custom order first, then
the current issue, then `date_published` descending. Without a saved
order, an issue saved at midnight falls below every other issue of its
day that still carries its time.

Reach, every other reader of `ORDERBY_PUBLISHED_ISSUES` or of the
column (code):

- The next current issue after the current one is deleted:
  `IssueGridHandler::deleteIssue()` takes the first issue by
  `ORDERBY_PUBLISHED_ISSUES`, so among issues of the same day a saved
  one is passed over.
- The REST API's `GET /issues?orderBy=datePublished` orders by the
  column, and its `datePublished` reads midnight after a save.
- Order only, with no effect a user meets: the sitemap,
  `OpenAccessNotification`, `PubIdPlugin`, and the issue filters of
  three export grids (`ExportPublishedPublicationsListGridHandler`,
  `ExportPublishedSubmissionsListGridHandler`,
  `PubIdExportRepresentationsListGridHandler`).
- The reader's "Archives" orders by `ORDERBY_SEQUENCE` alone today
  (pkp-e2e#412), so the dates do not reach it.

The same loss in other date boxes: none found (code).

- "Open Access Date" on the issue's "Access" tab (`IssueAccessForm`) is
  a date and time, but nothing stores a time in it: `publishIssue()`
  sets it, at midnight, and only for a journal in subscription mode
  with a delayed open access duration.
- A subscription's end date is a date and time, and
  `SubscriptionForm::execute()` sets 23:59:59 on the day its box posts,
  so a save keeps the time.

## Proposed fix

In `IssueForm::execute()`, keep the stored value when the posted day is
the stored one's day
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-data-save-drops-publish-time/fix.diff)):

```diff
--- a/controllers/grid/issues/form/IssueForm.php
+++ b/controllers/grid/issues/form/IssueForm.php
@@ -268,7 +268,12 @@
         $issue->setYear(empty($year) ? null : $year);
 
         // If issue is not published, allow empty datePublished
-        $issue->setDatePublished(!$this->getData('datePublished') && !$issue->getPublished() ? null : $this->getData('datePublished'));
+        $datePublished = $this->getData('datePublished');
+        // The form shows and posts the day alone: a day it repeats keeps the time of day stored with it
+        if ($datePublished && $issue->getDatePublished() && date('Y-m-d', strtotime($issue->getDatePublished())) === $datePublished) {
+            $datePublished = $issue->getDatePublished();
+        }
+        $issue->setDatePublished(!$datePublished && !$issue->getPublished() ? null : $datePublished);
 
         $issue->setDescription($this->getData('description'), null); // Localized
         $issue->setShowVolume((int) $this->getData('showVolume'));
```

The form is the only screen that writes an issue's Date Published as a
day, so the rule lives there. A changed day is still stored at
midnight, as today, and an emptied box on an unpublished issue still
stores nothing. The form keeps the purpose of `pkp/pkp-lib#7165`, which
gave unpublished issues the box. No code in the apps keeps a stored
time behind a date box; the closest is `SubscriptionForm::execute()`,
which adds a fixed time (23:59:59) to the day its box posts.

Tried on OJS `main`: with the fix, step 7 lists the issues as step 5
does and the 2015 issue keeps `2026-10-12 14:11:27`; a changed day is
saved as before (Evidence).

**Alternatives:**

- A time box beside the date, as `pkp/pkp-lib#9081` suggests: it lets
  editors set the time, but it is a new control and a product decision.
  The order of same-day issues would still rest on a time the
  "Published" column never shows.
- Store issues' Date Published as a date, as publications' is: a
  migration, and issues of the same day would then have no order at all
  without a saved one.

**What goes with it:**

- No data repair: an issue already saved at midnight has lost its time;
  re-ordering it is the way round above.
- Backport: the diff applies as it stands to `stable-3_5_0`. On
  `stable-3_4_0` the same check goes inside `if (!$isNewIssue)`. This
  hunk applies there, and to `stable-3_3_0` (`IssueForm.inc.php`,
  tab-indented) with `patch -l`, which ignores whitespace:

  ```diff
  --- a/controllers/grid/issues/form/IssueForm.php
  +++ b/controllers/grid/issues/form/IssueForm.php
  @@ -241,7 +241,12 @@
           $issue->setNumber(empty($number) ? null : $number);
           $issue->setYear(empty($year) ? null : $year);
           if (!$isNewIssue) {
  -            $issue->setDatePublished($this->getData('datePublished'));
  +            $datePublished = $this->getData('datePublished');
  +            // The form shows and posts the day alone: a day it repeats keeps the time of day stored with it
  +            if ($datePublished && $issue->getDatePublished() && date('Y-m-d', strtotime($issue->getDatePublished())) === $datePublished) {
  +                $datePublished = $issue->getDatePublished();
  +            }
  +            $issue->setDatePublished($datePublished);
           }
           $issue->setDescription($this->getData('description'), null); // Localized
           $issue->setShowVolume((int) $this->getData('showVolume'));
  ```
- Test: an e2e check that saves "Issue Data" unchanged on one of two
  issues published the same day and reads "Back Issues" (a **Planned**
  item for spec U50).

Small: a few lines in one form, and one e2e check.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-data-save-drops-publish-time/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-data-save-drops-publish-time/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-data-save-drops-publish-time/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It also reads each
  issue's stored `date_published` beside steps 5 and 7. The Fallback
  steps:
  [fallback.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-data-save-drops-publish-time/fallback.js),
  walked on `main` on 2026-10-15. Before the save the list read 2017,
  2016, 2015, 2014; after it, 2017, 2015, 2016, 2014. The 2016 issue's
  `date_published` went from `2026-10-15 11:21:04` to
  `2026-10-15 00:00:00`, below the 2015 issue's `11:20:59`.
- The fix, tried 2026-10-15 on the `main` tip below with walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-data-save-drops-publish-time/neighbour.js),
  each on a freshly loaded dataset. neighbour.js takes steps 1 to 4,
  then types the day before the shown one (2026-10-11) into the 2015
  issue's "Date Published" and saves: with the fix in and out,
  "Published" reads 2026-10-11, the issue sits below the 2014 one, and
  `date_published` is `2026-10-11 00:00:00`. No server error or page
  script error in any run.
- Walked 2026-10-15 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [7912e09](https://github.com/pkp/datasets/commit/7912e09c2191e44b25b6926d1755bc5f2aa00f09)
  (2026-10-14), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed.
  - main: OJS [378eced941](https://github.com/pkp/ojs/commit/378eced94154d9367f9a6fd02a7fc363400f7f6b)
    (lib/pkp b17fadae59).
  - 3.5: OJS [ca763c91cd](https://github.com/pkp/ojs/commit/ca763c91cda7ac28d679bce0f6c1e25de9eb7c78)
    (lib/pkp 4045d9241e). The same lists as on `main` at both steps; the
    2015 issue's `date_published` went from `2026-10-12 13:43:18` to
    `2026-10-12 00:00:00`, below the 2014 issue's `13:33:14`.
    `IssueForm::execute()` and `publishIssue()` read as on `main`.
- Code reads:
  - 3.4 (code): OJS `upstream/stable-3_4_0`
    [daf0ca971d](https://github.com/pkp/ojs/commit/daf0ca971d7ac1985c2941240a444629adc2dfa4):
    `IssueForm::execute()` sets the posted day on every save of an
    existing issue; the box shows on a published issue as a date picker;
    `publishIssue()` fills an empty date with `Core::getCurrentDate()`;
    the Collector's `ORDERBY_PUBLISHED_ISSUES` is `main`'s.
  - 3.3 (code): OJS `upstream/stable-3_3_0`
    [d7d9dd14ec](https://github.com/pkp/ojs/commit/d7d9dd14ec9d08d48b30d55c49cc97d714866b61):
    the same `execute()` line; `publishIssue()` sets
    `Core::getCurrentDate()` on every publish; "Back Issues" reads
    `IssueDAO::getPublishedIssues()`,
    `ORDER BY o.seq ASC, i.current DESC, i.date_published DESC`.
    On 3.3 "Publish Issue" replaces the 2015 issue's dataset date with
    the time of publishing, so the Steps would need both issues
    published the same day there.
- Introduced: blame on line 271 gives d182a00ec3 (`pkp/pkp-lib#7165`,
  2025), which kept the earlier
  `$issue->setDatePublished($this->getData('datePublished'))`.
  `git log -S` on that call reaches 16ca116f6f (2008-06-09, "Added
  issue date published widget"), where the box was a day picker
  (`html_select_date`) from the start.
- Upstream: searched 2026-10-15 in pkp/pkp-lib and pkp/ojs, issues and
  PRs, by the symptom's words and by `IssueForm` and `datePublished`.
  `pkp/pkp-lib#9081` (2023, no comments) says: "the
  `issues.date_published` is a datetime, but its interface input only
  displays the date".
- MySQL not checked: the order of the `date_published` values does not
  depend on the database, but the walks ran on PostgreSQL.
