# A "Counter R5" report date outside the possible range is refused with a raw locale key around the date

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the message shows the plain date there)
  - 3.3: none (code; no "Counter R5" page)
- **Introduced** `pkp/pkp-lib#10497` for `pkp/pkp-lib#4787` · [08d4cf9c89](https://github.com/pkp/pkp-lib/commit/08d4cf9c89dbf559f3a3becb5af86f13d48fb849) · merged 2025-02-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U64 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In a "Counter R5" report's "Report Settings", a "Start Date" before the
earliest possible date is refused with "The start date may not be
earlier than ##validation.values.begin_date.2026-11-01##.", and an "End
Date" after the last possible date with the same kind of message.

The refusal is right, and the date the user needs is in the message,
wrapped in an untranslated locale key. Both dates are typed into plain
text boxes.

The "Counter R5" form is the only screen that shows this today. The
fault sits in the validator every form shares, so any later rule whose
message names a value would show it too.

## Impact

- **Lost**: nothing. No file is downloaded until the date is changed,
  and the window stays open with the other settings as they were.
- **Who**: a manager or editor who downloads a COUNTER report from
  Statistics › "Counter R5" and types a date outside the range the form
  allows.
- **Way round**: the date can be read out of the key, and the line
  above the box names it ("Earliest possible date is 2026-11-01.").

Low: nothing is lost and one screen shows it. A core form showing the
same key would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), nothing else.

Steps:

1. Sign in as `dbarnes`.
2. Open Statistics › "Counter R5".
3. Press "Edit" on "Platform Master Report (PR)". The "Report Settings"
   window opens. The lines above "Start Date" and "End Date" name the
   earliest and the last possible date.
4. Type `2001-01` into "Start Date" and press "Download".
5. Close the window with the X in its head (the X has no visible label;
   a screen reader reads it as "Close"), press "Edit" on the same report
   again, type `2099-01` into "End Date" and press "Download".

**Expected**: under "Start Date", "The start date may not be earlier
than 2026-11-01."; under "End Date", "The end date may not be later than
2026-09-30.".

The two dates depend on the day and on the install's age. The earliest
is the first day of the month after the install or the first
publication, whichever is later; the last is the last day of the
previous month. On an install less than a month old, such as a freshly
loaded dataset, the earliest is therefore after the last.

**Observed**: no file arrives and the window stays open. After step 4,
under "Start Date":

```
The start date may not be earlier than ##validation.values.begin_date.2026-11-01##.
```

After step 5, under "End Date":

```
The end date may not be later than ##validation.values.end_date.2026-09-30##.
```

The summary beside "Download" repeats the text ("Go to Start Date: The
start date may not be earlier than
##validation.values.begin_date.2026-11-01##.").

Control: on such an install the window opens with the start after the
end, and "Download" pressed at once is refused with "The start date must be
before the end date.", which names no date and reads well.

## Cause

`PKPStatsSushiController::_validateUserInput()` (lib/pkp
`api/v1/stats/sushi/PKPStatsSushiController.php`, lines 310–315) gives
the two rules their messages as `__('stats.dateRange.invalidStartDateMin')`
and `__('stats.dateRange.invalidEndDateMax')`, "The start date may not be
earlier than {$date}." and its twin. It leaves `{$date}` for the
validator to fill: `ValidatorFactory::getMessages()` turns it into
Laravel's `:date`, and Laravel's `replaceAfterOrEqual()` and
`replaceBeforeOrEqual()` put the rule's date there.

Laravel does not insert the date as it is. It first asks the translator
for a display name of the value
(`FormatsMessages::getDisplayableValue()`, key
`validation.values.<attribute>.<value>`), and takes any answer other
than the key itself as that name:

```php
$key = "validation.values.{$attribute}.{$value}";

if (($line = $this->translator->get($key)) !== $key) {
    return $line;
}
```

PKP's translator answers a missing key with `##key##`, not with the key
(`Locale::translate()`, lib/pkp `classes/i18n/Locale.php`, lines
523–525: `'##' . htmlentities($key) . '##'`). Laravel reads that as a
translation and prints it.

The same lines answer with a missing-key handler's text instead when one
is set (`Locale::setMissingKeyHandler()`). Three places set one, each
returning an empty string: `editorialTask\Repository`, `Installer` and
`emailTemplate\DAO`. Each sets it around its own `__()` calls and puts
the previous one back right after, and no validator runs in between. So
during a validated request the answer is always `##key##`.

The validator has run on PKP's translator since 08d4cf9c89
(`pkp/pkp-lib#10497`), which moved it into the application container
(`ValidationServiceProvider::registerValidationFactory()`) so that rules
and messages could be multilingual. That change overrides `getMessage()`
in PKP's `Validator` subclass to allow for the `##key##` answer (line
261, `$customMessage !== '##' . $customKey . '##'`), but not
`getDisplayableValue()`. Before it, `ValidatorFactory::make()` built the
validator on a Laravel translator with no files, which answers a missing
key with the key, so the date was printed as it is.

Reach:

- Every message that shows a rule's value goes through
  `getDisplayableValue()`: Laravel's `:date`, `:value`, `:values` and
  `:input`. Four of PKP's default texts hold such a placeholder:
  `validator.after` and `validator.before` (`{$date}`),
  `validator.required_if` (`{$value}`) and `validator.required_unless`
  (`{$values}`) (checked in the code).
- The "Counter R5" form is the only screen that shows it today (checked
  in the code, lib/pkp and the three apps). The statistics pages'
  `PKPBaseController::_validateStatDates()` uses the same rules, but
  its messages are the plain strings 'tooEarly', 'tooLate' and
  'invalidRange', which it maps to locale keys itself, so no placeholder
  is filled. A task's "Due Date" (`EditTask`, `after_or_equal:today`)
  and the Crossref plugin's `required_if:citedBy,true` have messages of
  their own without a value.
- The check runs only when the report is asked for as a TSV file, which
  is the form's "Download". A SUSHI client's JSON request for the same
  report does not pass through it (checked in the code,
  `getReportResponse()`).
- Any later rule or plugin that relies on a default message with a value
  meets it: a rule `after:today` without a message of its own would read
  "This date must be after ##validation.values.<field>.today##.".

## Proposed fix

Teach PKP's `Validator` subclass that a `##key##` answer means "no
translation", next to the `getMessage()` override that already does so
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-report-date-refusal-raw-code/fix.diff)):

```diff
--- a/lib/pkp/classes/core/ValidationServiceProvider.php
+++ b/lib/pkp/classes/core/ValidationServiceProvider.php
@@ -288,6 +288,34 @@
                                     $lowerRule,
                                     $this->fallbackMessages
                                 ) ?: $key;
+                            }
+
+                            /**
+                             * Laravel takes any answer other than the key itself as the value's
+                             * translated name, but the PKP translator answers a missing key with
+                             * ##key##, so a value without a translation must fall back to itself here.
+                             *
+                             * @see \Illuminate\Validation\Concerns\FormatsMessages::getDisplayableValue()
+                             */
+                            public function getDisplayableValue($attribute, $value)
+                            {
+                                $line = parent::getDisplayableValue($attribute, $value);
+
+                                if (is_array($value) || isset($this->customValues[$attribute][$value])) {
+                                    return $line;
+                                }
+
+                                $key = "validation.values.{$attribute}.{$value}";
+
+                                if ($line !== '##' . htmlentities($key) . '##') {
+                                    return $line;
+                                }
+
+                                return match (true) {
+                                    is_bool($value) => $value ? 'true' : 'false',
+                                    is_null($value) => 'empty',
+                                    default => (string) $value,
+                                };
                             }
                         };
                     }
```

Laravel expects a missing key to come back as the key, and PKP's
translator breaks that expectation. The fix sits where 08d4cf9c89 joined
the validator to that translator, so it covers every validation rule,
in the apps and in plugins. It keeps what that change was for: a
`validation.values.…` key that a locale does define is still used.

The comparison uses `htmlentities($key)` on purpose, because that is
what `Locale::translate()` returns. The `getMessage()` override beside
it compares with the plain `'##' . $customKey . '##'`, which is equal
only while the key holds no character that `htmlentities()` changes. A
custom-message key never does; a value's key can (a user's input with
"<" or "&"). The override does not allow for a missing-key handler, and
neither does `getMessage()`: as the Cause says, none is set while a
validator runs.

It was tried on all three apps. The steps now show "The start date may
not be earlier than 2026-11-01." and "The end date may not be later than
2026-09-30.". "The start date must be before the end date.", "The date
format is not valid." and the Crossref form's own messages read the same
with the fix in and out. A wrongly formatted start date (`2026/07/01`)
shows two messages, the format one and the earliest-date one; with the
fix the second shows the plain date as well.

**Alternatives**:

- Pass the date in the controller, `__('stats.dateRange.invalidStartDateMin',
  ['date' => $earliestDate])` and the same for the end. Two lines, and
  the form reads well, but the next rule with a value in its message
  shows the key again.
- Make `Locale::get()` answer a missing key with the key, as Laravel's
  translator does. Every `__()` call relies on the `##key##` answer, so
  this would need a second entry point for the validator alone.

**What goes with it**:

- No stored data is involved. The REST API's answers change only in
  this one text.
- With the fix, a strict-mode install still logs "Missing locale key
  "validation.values.…"" for each such refusal, as it does today. A
  version of the override that does not call the parent avoids the
  lookup; it would copy more of Laravel's method.
- Backport: the diff does not apply to `stable-3_5_0` as written (`git
  apply --check` fails there). The class has the same logic on 3.5 in
  another layout, so the method is added by hand after its
  `getMessage()` override. Not tried on 3.5.
- The related report
  [U37 A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U37-A10-past-due-date-speaks-of-start-date.md)
  names this lookup as the second change a general `after_or_equal`
  default would need: tried there, the refusal read "This date must be on
  or after ##validation.values.dateDue.today##.". By the code, with this
  fix it would read "This date must be on or after today." (not tried).
- A unit test beside lib/pkp's `tests/classes/validation`: a rule
  `after_or_equal:2020-01-01` with the message "{$date}" fails with
  "2020-01-01". An e2e check that reads the message under "Start Date"
  after `2001-01`.

Small: one method in one class and a unit test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-report-date-refusal-raw-code/walk.js)
  takes steps 1–5 on each app. Run it on an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/counter-report-date-refusal-raw-code/walk.js`.
  With `neighbour` as its argument it takes the control and a wrong
  format ("Start Date" `2026/07/01`, which without the fix shows "The
  date format is not valid." and the same raw key under it); with
  `reach`, the Crossref form on
  OJS ("Enable Cited-by" ticked, "Username" empty).
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on 2026-10-03,
  on PostgreSQL. Dataset: pkp/datasets e8dafbc (2026-10-02). The requests
  answered 400 (`GET …/api/v1/stats/sushi/reports/pr?begin_date=2001-01&…`);
  no server error and no script error was recorded on the "Counter R5"
  page.
- "Download" stays greyed while a field still shows its error, which is
  how every PKP form behaves; step 5 therefore opens the window afresh.
- The fix was tried on `main` only: `node bin/try-fix.js apply
  shared/playwright/checks/issues/counter-report-date-refusal-raw-code/fix.diff ojs omp ops`,
  the three modes of the script, then `revert`.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5).
  `ValidationServiceProvider.php`, `ValidatorFactory.php`, `Locale.php`
  and `PKPStatsSushiController.php` are the same in the two lib/pkp
  commits. `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c, OPS
  38b61882d3 (lib/pkp cf3f984335, lib/ui-library d4e01883). pkp-lib
  `stable-3_4_0` 9e41f10273 and `stable-3_3_0` ac3fa73402.
- Code reads of the other lines. `stable-3_5_0`: the same
  `_validateUserInput()` messages, and a `ValidationServiceProvider`
  without `getDisplayableValue()`; 08d4cf9c89 is in the branch.
  `git apply --check` of `fix.diff` was run in the 3.5 OJS checkout
  (nothing applied) and fails on the hunk's context.
  `stable-3_4_0`: `PKPStatsSushiHandler::_validateUserInput()` has the
  same rules and messages, and `ValidatorFactory::make()` builds the
  validator on `new Translator(new FileLoader(…, 'lang'), 'en')`.
  `stable-3_3_0`: no `api/v1/stats/sushi`, and no rule outside
  `APIHandler::_validateStatDates()` that names a value.
- The message before 08d4cf9c89 was not driven on screen. It was checked
  in PHP: a validator built the 3.4 way on `main`'s Laravel, with the
  rule `after_or_equal:2026-11-01` and the message "The start date may
  not be earlier than :date.", answers "The start date may not be
  earlier than 2026-11-01.".
- Introduced: `git log -S` on `ValidatorFactory.php` for the removed
  `new Translator($loader, 'en')` names 08d4cf9c89, which also adds
  `ValidationServiceProvider.php`. The form's messages came with
  `pkp/pkp-lib#10149` (28b974e8f1, for `pkp/pkp-lib#9666`), merged
  2024-10-15, and are unchanged since.
- Tracker search on 2026-10-03, pkp/pkp-lib, pkp/ojs, pkp/ui-library
  and pkp/crossref-ojs, issues and PRs: "validation.values", "may not be
  earlier than", "getDisplayableValue", "invalidStartDateMin",
  "##validation", and the symptom in a user's words.
- Unverified: plugins outside the three apps' checkouts were not
  searched for rules that show a value.
