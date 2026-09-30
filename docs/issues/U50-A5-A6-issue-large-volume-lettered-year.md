# "Create Issue" fails silently on a Volume above 32767 and saves "Year" 20a6 as 20

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced; present since at least [4f015c4bf5](https://github.com/pkp/ojs/commit/4f015c4bf5a859033a9827d5c4e5a41ef0ba9b60) (2004-11-12)
- **Upstream** `pkp/pkp-lib#5266` (open), which asks for box lengths that match the database. Its open OJS PR `pkp/ojs#3344` shortens the "Volume" box to 5 characters, which still admits 99999. This report adds the server error, the upper bound on "Volume" and the missing check on "Year".
- **Tracked in** spec U50 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a5), [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor who types a "Volume" above 32767 (99999, say) on "Create Issue"
or "Issue Data" and presses "Save" gets nothing. The save fails on the
server, the window stays open, and no message says what is wrong.

A "Year" with a letter in it ("20a6") is saved as its leading digits,
without a message, so the issue is named "Vol. 3 No. 1 (20)".

Both come from a mistyped value.

## Impact

- **Lost.** Nothing stored is lost; the window keeps what was typed
  after the failed save. A mistyped year is stored as a wrong year. It
  goes into the issue's name on every page and in the OAI-PMH records,
  into the Google Scholar `citation_date` of each of the issue's
  articles (the Google Scholar plugin is on in the default dataset), and
  into DOI suffixes built from a custom pattern with `%Y`. Crossref,
  DataCite and DOAJ deposits and the article citations take the year
  from the publication date instead.
- **Who.** A journal manager or editor creating or editing an issue on
  the "Issues" page, in any setup, who mistypes "Volume" or "Year".
- **Way round.** A smaller "Volume" saves, but nothing says the number
  is too large. The wrong year shows at once, at the top of "Future
  Issues" (the list sorts by year), and can be corrected on "Issue
  Data" before the issue is published.

Medium: the wrong year is saved silently and reaches values others rely
on (Google Scholar's date, a custom DOI suffix), which rules out low.
It is no higher because only a typo causes either fault, and the
editor sees "(20)" in the list before publishing. The failed "Volume"
save alone would be low: no journal has a volume above 32767, and a
smaller number saves.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded from the
  PostgreSQL (`pgsql`) dump. Its `publicknowledge` journal has "Vol. 2
  No. 1 (2015)" under "Future Issues".
- No other setup: `dbarnes` is its Journal Editor.

A large "Volume":
1. Sign in as `dbarnes`.
2. Open "Issues" (side menu, `/index.php/publicknowledge/manageIssues`).
3. Press "Create Issue".
4. Type "99999" in "Volume", "1" in "Number" and "2026" in "Year", and
   untick "Title" (the dataset's issues have no title).
5. Press "Save".

A letter in "Year":
6. Press "Cancel", then "Create Issue" again.
7. Type "3" in "Volume", "1" in "Number" and "20a6" in "Year", and
   untick "Title".
8. Press "Save".

**Expected:** step 5 creates "Vol. 99999 No. 1 (2026)", or keeps the
window open with a message saying what "Volume" accepts. Step 8 keeps
the window open with "Year is required and must be a positive, numeric
value.", the message "Volume" shows when it holds letters.

**Observed:** at step 5 the window stays open with no message, and
"Future Issues" still lists only "Vol. 2 No. 1 (2015)". The save request,
`POST /index.php/publicknowledge/$$$call$$$/grid/issues/future-issue-grid/update-issue`,
returned 500. The server log:

```
Illuminate\Database\QueryException: SQLSTATE[22003]: Numeric value out of range: 7 ERROR:  value "99999" is out of range for type smallint
… SQL: insert into "issues" ("journal_id", "volume", "number", "year", "published", "date_published", "access_status", "show_volume", "show_number", "show_year", "show_title", "url_path") values (1, 99999, 1, 2026, 0, ?, 1, 1, 1, 1, 0, ?))
```

At step 8 the window closes with "Your changes have been saved.", and
"Future Issues" lists "Vol. 3 No. 1 (20)" first.

On MySQL or MariaDB, step 5 depends on the server's `sql_mode`, which
the app leaves at the server's default. In strict mode (the default
since MySQL 5.7 and MariaDB 10.2.4) the insert fails the same way; in
non-strict mode the issue is saved as "Vol. 32767 No. 1 (2026)" without
a message. Step 8 is the same on every database.

A "Volume" of 32767 saves.

## Cause

`IssueForm` (OJS `controllers/grid/issues/form/IssueForm.php`, the
constructor's checks at lines 50–59) checks "Volume" and "Year" less
strictly than the columns that store them. Both are `smallInteger`
columns of `issues` (`classes/migration/install/OJSMigration.php` lines
79 and 81), which hold whole numbers up to 32767.

- "Volume" has one format check, `FormValidatorRegExp` with
  `'/^[0-9]+$/i'`, and no upper bound; the box takes 40 characters. A
  value above 32767 passes, and PostgreSQL refuses the insert or update.
  Nothing catches the exception, so the save answers 500 and the form
  shows nothing.
- "Year" has no format check, only the "required when ticked" check.
  `IssueForm::execute()` stores the typed string, and
  `PKPSchemaService::coerce()` casts it to the schema's `integer` with
  `(int)`, which keeps the leading digits ("20a6" becomes 20).

The volume check was added in [2aed43a416](https://github.com/pkp/ojs/commit/2aed43a4166920409a18bb0da491a1326f6c90c1)
(2019, for `pkp/pkp-lib#2071`, a volume of "1b" that stalled the same
window). It covered letters in "Volume" only. The schema's
`Repo::issue()->validate()` would catch the letters (`integer`), but
nothing calls it.

Reach:

- "Create Issue" and the "Issue Data" tab of an existing issue share
  the form and the save (`IssueGridHandler::updateIssue()`). "Create
  Issue" was walked; "Issue Data" is from the code.
- Uses of the stored year, from the code: the issue's name
  (`Issue::getIssueIdentification()`: the issue and article pages, OAI-PMH
  Dublin Core `dc:source` and MARC, DataCite's series text); the JATS
  OAI-PMH format's collection date; `GoogleScholarPlugin`'s
  `citation_date`, which takes the issue's year when it differs from the
  article's publication year; `PubIdPlugin::generateCustomPattern()`'s
  `%Y`; the order of "Future Issues" (`Collector::ORDERBY_UNPUBLISHED_ISSUES`,
  seen in the walk); the REST API's `year` and `years` filter; the
  LOCKSS and CLOCKSS gateway's year list. Crossref, DataCite's
  `publicationYear`, DOAJ and `CitationStyleLanguagePlugin` use the
  publication date.
- The native XML import writes the same fields
  (`NativeXmlIssueFilter::parseIssueIdentification()`). `native.xsd`
  types `volume` and `year` as `int`, so it refuses letters, but a volume
  above 32767 passes and fails the insert the same way (code, not run).

## Proposed fix

A proposal; the team decides. A proposal, tried on `main` as [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-large-volume-lettered-year/fix.diff).
With it, step 5 keeps the window open with "This may not be greater
than 32767." where the "Volume" label was (the legacy form shows a
field's error in place of its label), and step 8 with "Year is required
and must be a positive, numeric value.". Neither creates an issue.
Three nearby cases behave the same with and without the fix: a "Volume"
of 32767 saves, "abc" in "Volume" is refused with its message, and an
empty "Year" with "Year" unticked saves.

Recommended: give "Year" the format check "Volume" has, and give both
the column's upper bound, in `IssueForm::__construct()`:

```php
public const MAX_SMALLINT = 32767;
…
$this->addCheck(new \PKP\form\validation\FormValidatorRegExp($this, 'year', 'optional', 'editor.issues.yearRequired', '/^[0-9]+$/'));
foreach (['volume', 'year'] as $field) {
    $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, $field, 'optional', 'validator.max.numeric', function ($value) {
        return !ctype_digit((string) $value) || (int) $value <= self::MAX_SMALLINT;
    }, [], false, ['max' => self::MAX_SMALLINT]));
}
```

This form is the only screen where these fields are typed, and it
already checks "Volume" this way. Both messages exist:
`editor.issues.yearRequired` in OJS and `validator.max.numeric` ("This
may not be greater than {$max}.") in pkp-lib. The "Year" box takes 4
characters, so the year's upper bound matters only for a request that
bypasses the browser.

**Alternatives:**

- Widening `volume` and `year` to `integer`: it needs an upgrade
  migration, sets a larger limit the form still does not check, and
  does nothing for a year with letters.
- Calling `Repo::issue()->validate()` from the form, with `min:0` and
  `max:32767` added to `schemas/issue.json`: the legacy form would have
  to map the schema's errors to its fields, which no other legacy form
  does.
- Shortening the "Volume" box (`pkp/ojs#3344`): the browser's limit is
  not checked on the server, and 5 digits still admit 99999.

**What goes with it:**

- No change for an API client or a plugin: the REST API does not write
  issues.
- Stored data: years already saved from a typo cannot be told apart
  from real ones, so there is no repair.
- The native XML import is left out. A `maxInclusive` of 32767 on
  `volume` and `year` in `plugins/importexport/native/native.xsd` would
  cover it.
- Backport: it applies to 3.5 as written and to 3.4 with a line offset
  (the volume check sits at line 48 there). On 3.3, `IssueForm.inc.php`
  uses the unnamespaced `FormValidatorRegExp` and `FormValidatorCustom`,
  so the lines are adapted.
- Guard: an e2e scenario in U50.

Small: a few lines in one form, following an existing check, with
existing messages.

## Evidence

- Kept script that runs the Steps in the browser, on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-large-volume-lettered-year/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/issue-large-volume-lettered-year/walk.js`
  after `npm run fleet-prep -- --feature issues --dataset --reset`.
  `PHASE=neighbour` in front runs the three nearby cases.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/issue-large-volume-lettered-year/fix.diff ojs`,
  then walk.js with and without `PHASE=neighbour`, then
  `node bin/try-fix.js revert ojs`; `PHASE=neighbour` also run with the
  fix out.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc);
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), the same Observed,
    and the same form checks and columns in the code.
  - The log lines are from the app's error log. MySQL not checked: its
    outcome is from `PKPContainer`'s connection settings, which set no
    `strict` or `modes`, so Laravel leaves the server's `sql_mode`.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7 (lib/pkp df13621c2d).
  `IssueForm.php` has the same checks (the volume regexp at line 48,
  nothing on year), `issueForm.tpl` the same box lengths (40 and 4),
  `OJSMigration.php` the same `smallInteger` columns, and
  `PKPSchemaService::coerce()` the same `(int)` cast. fix.diff applies
  there (a dry run).
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a (lib/pkp d446601ebe).
  `IssueForm.inc.php` has the same checks, `OJSMigration.inc.php` the
  same columns, and `IssueDAO::insertObject()` and `updateObject()` write
  `nullOrInt()` of both, which keeps a year's leading digits and passes a
  large volume to the database.
- Introduced: the form's first version, 4f015c4bf5 (2004, jasonc), had
  only "required" checks beside `I2` (smallint) columns in
  `dbscripts/xml/ojs_schema.xml`. `git log -S` finds the volume regexp
  in 2aed43a416 (Alec Smecher).
- Upstream search 2026-10-01 in pkp/pkp-lib and pkp/ojs (issue volume,
  volume smallint, "out of range", issue year validation, year letters,
  `IssueForm` volume and year). `pkp/pkp-lib#5266` has two open PRs:
  `pkp/pkp-lib#7785` changes pkp-lib's templates and three column sizes
  (emails and a navigation menu URL), nothing about issues;
  `pkp/ojs#3344` sets the "Volume" box to 5 characters.
  `pkp/pkp-lib#2071` is closed by the volume regexp.
- Not driven: the "Issue Data" tab of an existing issue, the native XML
  import, the pages and exports that read the year.
