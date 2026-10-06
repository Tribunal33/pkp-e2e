# "Create Issue" fails without a message on a Volume over 32767, and saves a Year with letters cut short

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced; present since at least [2744a3fafc](https://github.com/pkp/ojs/commit/2744a3fafcfc67e63f33eb0fadc8e1ff46c0f96a) (2013-10-16)
- **Upstream** `pkp/pkp-lib#5266` (open), covering the "Volume" box's length only: its open PR `pkp/ojs#3344` narrows that box to 5 characters, which still lets 99999 through, and leaves "Year" as it is
- **Tracked in** spec U50 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a5), [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Journal Manager or editor creates an issue on Issues › "Create Issue".
With a "Volume" of 99999, "Save" fails on the server: the window stays
open with no message and no issue is created. With a "Year" of "20a6",
"Save" succeeds without a message and the issue is stored with the year
20, named "Vol. 3 No. 1 (20)".

The manager expects either the issue or a message saying what "Volume"
and "Year" accept, as "Volume" already does for letters. Nothing tells
the manager what went wrong with the volume, and the wrong year becomes
part of the issue's name.

"Year" takes four characters, so the likely case is a typo inside the
year, such as a letter O for a zero: "2O26" is stored as 2. "Issue Data"
uses the same form, so the same typo there changes the year of an issue
that is already published, and with it the issue's public name (read in
the code, not walked). Both were seen on PostgreSQL; MySQL was not
checked.

## Impact

- **Lost**: with a volume above 32767, the save fails and no reason is
  shown. With a letter in the year, the year itself: the issue is stored
  and shown with the leading digits only, and nobody is told.
- **Who**: managers and editors creating an issue, or editing one on
  "Issue Data", only on a mistyped value (a volume above 32767, or a year
  with a letter in it).
- **Way round**: retype the value. A wrong year shows in the issue's name
  on "Future Issues" or "Back Issues" right after the save, and "Issue
  Data" can correct it.

Medium: the form fails or keeps a wrong value without a word, but only on
a narrow, mistyped input, and both can be retyped on screen. It would be
high if real volume numbers reached 32767 or the wrong year were hidden
from the list, and low if a published issue's year could not be changed
this way.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`): the journal
  `publicknowledge` has "Vol. 1 No. 2 (2014)" published and "Vol. 2 No. 1
  (2015)" not yet published.

Volume:

1. Sign in as `dbarnes`.
2. Open Issues (`/index.php/publicknowledge/manageIssues`); "Future
   Issues" is open.
3. Press "Create Issue".
4. Type 99999 in "Volume", 1 in "Number" and 2026 in "Year"; untick
   "Title".
5. Press "Save".

Year:

6. Press "Cancel", then "Create Issue" again.
7. Type 3 in "Volume", 1 in "Number" and 20a6 in "Year"; untick "Title".
8. Press "Save".
9. Press the new row's arrow, then "Edit", and open "Issue Data".

**Expected.** At step 5, the issue "Vol. 99999 No. 1 (2026)" is created,
or a message under "Volume" says what it accepts. At step 8, "Year" is
refused with a message, as "Volume" is refused for letters ("Volume is
required and must be a positive, numeric value."), and no issue is
created.

**Observed.** At step 5 the window stays open as typed, with no message
and no notice, and "Future Issues" still lists only "Vol. 2 No. 1
(2015)". The save answered 500:

```
POST /index.php/publicknowledge/$$$call$$$/grid/issues/future-issue-grid/update-issue?issueId= [500]
PHP Fatal error:  Uncaught PDOException: SQLSTATE[22003]: Numeric value out of range: 7 ERROR:  value "99999" is out of range for type smallint
```

At step 8 the window closes with "Your changes have been saved.", and
"Future Issues" lists "Vol. 3 No. 1 (20)" and "Vol. 2 No. 1 (2015)". At
step 9 "Year" shows 20.

Control: a "Volume" of 32767, the largest the column holds, saves as
"Vol. 32767 No. 1 (2026)".

## Cause

`IssueForm` (OJS, `controllers/grid/issues/form/IssueForm.php`) checks
"Volume" and "Year" less strictly than the columns that store them. Both
are `smallint` columns of `issues` (`classes/migration/install/OJSMigration.php`,
lines 79 and 81) and `integer` properties in `schemas/issue.json`. The
form checks "Volume" only against `/^[0-9]+$/` (line 50), with no upper
bound, and "Year" not at all: the `showYear` check (line 57) asks only
that it is not empty. The template caps the boxes at 40 and 4 characters
(`issueForm.tpl`, lines 57 and 59).

So a volume above 32767 passes the form and reaches the database, which
refuses it. On "Create Issue" the exception comes from
`Repo::issue()->add()` (`EntityDAO::_insert()`), on "Issue Data" from
`Repo::issue()->edit()` (`EntityDAO::_update()`).
`IssueGridHandler::updateIssue()`
(`classes/controllers/grid/issues/IssueGridHandler.php`) does not catch
it, so the request answers 500. A year such as "20a6"
passes too, and `PKPSchemaService::coerce()` casts it to an integer for
the `integer` property, `(int) "20a6"`, which is 20.

The form never had these checks. Up to 2744a3fafc (2013) it checked
`$volume > 0` and `$year > 0`, which in PHP let "20a6" and 99999 through
just the same; that commit replaced them with the presence checks of
today. 2aed43a416 (2019, `pkp/pkp-lib#2071`) added the digits-only check
for "Volume", without a bound and without a twin for "Year".

Reach:

- "Issue Data" in "Issue Management" is the same form and the same save
  (`updateIssue()` with the issue's ID), a published issue's included:
  code;
- the REST API has no issue write (`api/v1/issues` answers GET only):
  code;
- the Native XML import (`NativeXmlIssueFilter`, and
  `NativeXmlPublicationFilter` when it creates an issue) takes `volume`
  and `year` as `xsd:int`, so a volume above 32767 reaches the same
  column and fails the import there: code, not driven;
- issues already stored with a cut-short year cannot be told from
  intended ones: nothing records what was typed.

## Proposed fix

Check "Year" for digits as "Volume" is checked, and refuse either one
above what a `smallint` holds, in `IssueForm`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-big-volume-or-lettered-year/fix.diff)):

```diff
+    /** The largest volume or year the issues table stores (smallint) */
+    public const MAX_SMALLINT = 32767;
 …
         $this->addCheck(new \PKP\form\validation\FormValidatorRegExp($this, 'volume', 'optional', 'editor.issues.volumeRequired', '/^[0-9]+$/i'));
+        $this->addCheck(new \PKP\form\validation\FormValidatorRegExp($this, 'year', 'optional', 'editor.issues.yearRequired', '/^[0-9]+$/'));
 …
+        // Volume and year are stored in smallint columns
+        foreach (['volume', 'year'] as $field) {
+            $value = (string) $this->getData($field);
+            if (ctype_digit($value) && (int) $value > self::MAX_SMALLINT) {
+                $this->addError($field, __('validator.max.numeric', ['max' => self::MAX_SMALLINT]));
+                $this->addErrorField($field);
+            }
+        }
```

The "Year" check copies the "Volume" one and its existing message ("Year
is required and must be a positive, numeric value."). The bound goes in
`validate()`, where the form already adds its "URL Path" and "Date
Published" errors the same way, with pkp-lib's existing
`validator.max.numeric` ("This may not be greater than {$max}."), so no
new text is needed. The form is the only form that writes an issue's
volume and year, so one place covers both "Create Issue" and "Issue
Data". Like the "Volume" check, the new "Year" check applies to any
value typed, so its message shows even when "Year" is unticked.

Tried on `main`: step 5 then shows "This may not be greater than 32767."
under "Volume", step 8 shows "Year is required and must be a positive,
numeric value." under "Year", and neither creates an issue. Two saves
the fix must leave alone still work, with and without the fix: a
"Volume" of 32767, and "Issue Data" of "Vol. 2 No. 1 (2015)" saved
unchanged.

**Alternatives**

- Widen `volume` (and `year`) to `integer`: a schema change and an
  upgrade migration for values no journal uses, and the year would still
  need its digits check.
- Only shorten the "Volume" box (`pkp/ojs#3344` makes it 5 characters):
  99999 still fits, and a request sent outside the form is not limited by
  the box's length.
- Validate through `Repo::issue()->validate()` with a `max` rule added to
  `schemas/issue.json`: the right home once issues have a REST write, but
  today nothing on the form's path calls it, and the form would need its
  props and errors mapped.

**What goes with it**

- No API or plugin hook change; the form refuses what the database
  refused or corrupted before.
- Left out: the Native XML import's `xsd:int` volume, which needs a check
  in the import filters; and the same unbounded check on the
  subscription type form's "Duration" (`SubscriptionTypeForm`,
  `is_numeric($duration) && $duration >= 0` against a `smallint` column),
  read in the code only.
- Backport: the form's lines are the same on 3.5, 3.4 and 3.3. The diff
  applies to 3.5 and 3.4 as written; 3.3 needs the file name
  `IssueForm.inc.php` and the unnamespaced `FormValidatorRegExp`.
- Guard: an e2e scenario on "Create Issue" (a "Volume" of 99999 and a
  "Year" with a letter, each refused with its message), a **Planned**
  item in spec U50.

Small: a few lines in one form, following the checks it already makes,
and an e2e scenario.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-big-volume-or-lettered-year/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/issue-big-volume-or-lettered-year/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). It also reads the server log lines
  and the stored `issues` rows (`3|3|1|20`). The neighbour checks (the
  Control and the unchanged "Issue Data" save):
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-big-volume-or-lettered-year/neighbour.js).
- Walked on `main` and `stable-3_5_0`, OJS, with the same observation on
  both; on each, one request answered 500 (step 5) and no script error
  was logged. OMP and OPS have no issues.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a); `stable-3_5_0` OJS
  c346ee00a5 (pkp-lib 3bb4450bea); `stable-3_4_0` OJS 75cc2d488b
  (pkp-lib 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib
  f6ab331645).
- `main` and 3.5 (walked) and 3.4 (code): read
  `controllers/grid/issues/form/IssueForm.php`,
  `templates/controllers/grid/issues/form/issueForm.tpl`,
  `classes/migration/install/OJSMigration.php` and pkp-lib's
  `classes/services/PKPSchemaService.php`.
- 3.3 (code): read `IssueForm.inc.php` (the same checks), `issueForm.tpl`,
  `classes/migration/OJSMigration.inc.php` (`smallInteger` for both) and
  `IssueDAO::insertObject()`, which stores both through pkp-lib's
  `DAO::nullOrInt()` (`(int) $value`), so the year is cut the same way.
- Introduced: `git blame` on the checks leads to the 2021 namespace and
  formatting commits (dc776bf5ca, 665ed1f925); `git log -S` on the check
  lines then to 2aed43a416 and 2744a3fafc. The form's history before 2013
  was not followed.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-02 for "issue volume smallint", "issue volume out of range",
  "issue year validation", "IssueForm volume", "volume 32767", "issue
  year integer"; `pkp/pkp-lib#5266` is the only match. Its two open PRs,
  `pkp/pkp-lib#7785` (pkp-lib) and `pkp/ojs#3344` (OJS), loosen or align
  `maxlength` limits across the templates; of these, only the
  `issueForm.tpl` change of `pkp/ojs#3344` was read.
- MySQL not checked: there a strict-mode install refuses 99999 as
  PostgreSQL does, and a non-strict one stores 32767 instead without an
  error (unverified). The cut-short year happens in PHP, before the
  database.
