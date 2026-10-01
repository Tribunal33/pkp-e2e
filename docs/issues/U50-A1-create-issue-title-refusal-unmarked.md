# "Create Issue" arrives with "Title" ticked and refuses "Save" without a title, marking nothing on the form

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** pkp-lib [2157c1b741](https://github.com/pkp/pkp-lib/commit/2157c1b7414d50dbdd23d22f9fc2386654a3c44d) (no PR) · 2017-12-20 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#8510` (closed as not planned in 2022, with only a comment that the tick boxes are confusing and that unticking "Title" lets the issue save), the same refusal met when deleting an existing issue's title
- **Tracked in** spec U50 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On "Create Issue", each part of the issue's name whose tick box is
ticked ("Volume", "Number", "Year", "Title") must be filled in, and the
form arrives with all four ticked on every journal; no setting changes
that. A Journal Manager or editor who fills in "Volume", "Number" and
"Year" and presses "Save" gets no new issue. The window stays open, a
notice at the top right reads "Title is required for the issue." for
about five seconds, and nothing on the form is marked: neither the
"Title" text field nor its tick box.

Once the notice has gone, nothing on screen says why the issue was not
created. The notice asks for a title; it does not say that unticking
"Title" is the other way to save.

Every journal whose issues have no title meets it, and the same happens
when a ticked "Volume", "Number" or "Year" is left empty, on new issues
and existing ones. OJS 3.1.0 still printed the message under the tick
boxes; 3.1.1 dropped it.

## Impact

- **Lost.** Nothing: the window keeps what was typed, and no issue is
  created until the form is right.
- **Who.** Anyone who creates issues on the "Issues" page of a journal
  whose issues have no title, on every "Create Issue" until they learn
  to untick "Title".
- **Way round.** Untick "Title" (or type a title) and press "Save"
  again.

Low: the task gets done after one retry and nothing is lost.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Its
  `publicknowledge` journal lists "Vol. 2 No. 1 (2015)" under "Future
  Issues".
- Nothing else to set up. `dbarnes` is the journal's Journal Editor.

1. Sign in as `dbarnes`.
2. Open "Issues" (side menu, `/index.php/publicknowledge/manageIssues`),
   "Future Issues".
3. Press "Create Issue". "Volume", "Number", "Year" and "Title" arrive
   ticked.
4. Type "3" in "Volume", "1" in "Number" and "2026" in "Year". Leave
   the "Title" field empty and the four tick boxes ticked.
5. Press "Save".

**Expected:** the window stays open with "Title is required for the
issue." shown at the "Title" text field, the way the form shows a
"Volume" that holds letters at that field; or the form arrives with "Title" unticked and
step 5 creates "Vol. 3 No. 1 (2026)".

**Observed:** the window stays open. A notice at the top right reads
"Title is required for the issue.", then goes. No field carries an
error: the labels under the text fields still read "Volume", "Number",
"Year" and "Title", and the four tick boxes look as before. "Future
Issues" still lists only "Vol. 2 No. 1 (2015)".

## Cause

`IssueForm` (OJS `controllers/grid/issues/form/IssueForm.php`, the
constructor, lines 51–62) registers the four "required when ticked"
checks on the tick boxes, `showVolume`, `showNumber`, `showYear` and
`showTitle`, not on the text fields that hold the values.
`Form::validate()` records each failed check's error under its field
name (`errorFields['showTitle']`). Only the label helpers look that
name up: `FormBuilderVocabulary::_smartyFBVSubLabel()` replaces a text
field's label with the message, while `templates/form/checkbox.tpl`
has no error output at all. So the error
reaches only the form-wide notice that `Form::validate()` raises
(`NOTIFICATION_TYPE_FORM_ERROR`).

Until the end of 2017 the form builder also collected every field's
error into its form section and printed it there (`formSectionErrors`,
shown by `templates/form/formSection.tpl`), which put "Title is required
for the issue." under the tick boxes. pkp-lib
[2157c1b741](https://github.com/pkp/pkp-lib/commit/2157c1b7414d50dbdd23d22f9fc2386654a3c44d)
("Remove dead group code") removed that collection along with the
unused group code beside it, and nothing has filled `formSectionErrors`
since. The checks themselves were moved onto the tick boxes in
[2744a3fafc](https://github.com/pkp/ojs/commit/2744a3fafcfc67e63f33eb0fadc8e1ff46c0f96a)
(2013, "Fix issue form validation"); before that they sat on the text
fields. The four tick boxes arrive ticked since
[40a5a4e3d9](https://github.com/pkp/ojs/commit/40a5a4e3d985acf3c5482fc5caf7d76e24759c1d)
(2013), which replaced the journal's own defaults (a setup option per
part) with all four ticked.

Reach:

- The four parts alike: a ticked "Volume" left empty is refused the
  same way, with "Volume is required and must be a positive, numeric
  value." in the notice only; seen in the browser.
- "Issue Data" of an existing issue goes through the same form and save
  (`IssueGridHandler::updateIssue()`); read in the code, not driven.
- With no tick box ticked, "Issue identification is required. Please
  select at least one of the issue identification options." is a check
  on the form as a whole (`issueForm`), so it too shows in the notice
  only; seen in the browser.
- Elsewhere: the URN plugin's settings check `urnObjects`, a name no
  field carries, so its message shows in the notice only as well; read
  in the code.

## Proposed fix

A proposal; the team decides. Tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-issue-title-refusal-unmarked/fix.diff).
With it, step 5 keeps the window open, and the label under the English
"Title" field reads "Title is required for the issue." in the form's
error style, after the notice has gone. A ticked, empty "Volume" is
marked the same way. Three nearby cases behave the same with and
without the fix:

- all four ticked, with a title: saves;
- "Volume" and "Title" unticked, "Volume" empty: saves;
- nothing ticked: refused, with the notice only.

Recommended: in `IssueForm`, drop the four tick-box checks from the
constructor and check the ticked parts in `validate()`, before its
`return parent::validate($callHooks)`, so that the form-error notice
and the `issueform::validate` hook still see the errors. Each error goes
on the part's own text field, with `addError()` and `addErrorField()`,
as `validate()` already reports its URL Path and Date Published errors:

```php
$parts = [
    'volume' => ['showVolume', 'editor.issues.volumeRequired'],
    'number' => ['showNumber', 'editor.issues.numberRequired'],
    'year' => ['showYear', 'editor.issues.yearRequired'],
    'title' => ['showTitle', 'editor.issues.titleRequired'],
];
foreach ($parts as $field => [$showField, $message]) {
    $value = $this->getData($field);
    $hasValue = is_array($value) ? implode('', $value) != '' : (bool) $value;
    if ($this->getData($showField) && !$hasValue) {
        $this->addError($field, __($message));
        $this->addErrorField($field);
    }
}
```

The rules stay as they are (a ticked part needs a value; a title in any
language counts), and so do the messages.

The checks were last on the text fields before
[2744a3fafc](https://github.com/pkp/ojs/commit/2744a3fafcfc67e63f33eb0fadc8e1ff46c0f96a)
(old tracker bug 8450, "Fix issue form validation"; the tracker is no
longer online). That commit removed `required` checks which
`validate()` added to `volume`, `number`, `year` and `title` whenever
the part was ticked. A `required` check also gives its field the
browser-side `required` class (the `FormValidator` constructor fills
`Form::$cssValidation`), so after one refused save the browser would
demand the field even once its tick box was unticked. `addError()` and
`addErrorField()` add nothing to `cssValidation`, so the fix cannot
bring that back; the neighbour case with "Volume" unticked and empty
saved with the fix in.

**Alternatives:**

- Restoring `formSectionErrors` in `FormBuilderVocabulary`: it would
  reach every legacy form, the URN settings included, but every text
  field's error would then show twice, at the field and at its section,
  on every legacy form.
- Arriving with "Title" unticked in `IssueForm::initData()`: it spares
  journals without issue titles the refusal, but changes the default chosen in 2013 and
  leaves the refusal unmarked for anyone who ticks it. A product
  question, best taken with the fix rather than instead of it.

**What goes with it:**

- No API client or plugin is affected: issues are not written through
  the REST API, and the `issueform::validate` hook sees the same errors,
  now under `volume`, `number`, `year` or `title`.
- No stored data to repair.
- Backport: fix.diff applies to 3.5 and 3.4 as written (a dry run); 3.3's
  `IssueForm.inc.php` holds the same checks in the old style, so the
  lines are adapted there.
- Guard: an e2e scenario in U50 ("Create Issue" refused with the "Title"
  field marked).

Small: one method in one form, with existing messages.

## Evidence

- Kept script that runs the Steps in the browser, on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-issue-title-refusal-unmarked/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/create-issue-title-refusal-unmarked/walk.js`
  after `npm run fleet-prep -- --feature issues --dataset --reset`.
  `PHASE=neighbour` in front runs the nearby cases of the Proposed fix
  and the ticked, empty "Volume". The notice showed from about 0.2 s to
  5.3 s after "Save".
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/create-issue-title-refusal-unmarked/fix.diff ojs`,
  then walk.js with and without `PHASE=neighbour`, each after a fresh
  load, then `node bin/try-fix.js revert ojs`; `PHASE=neighbour` was also
  run with the fix out.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc);
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), the same
    Observed, and the same checks in `IssueForm.php` (line 60) and the
    same `checkbox.tpl`.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7 (lib/pkp df13621c2d).
  `IssueForm.php` has the same tick-box checks (lines 49–60) and
  defaults, `issueForm.tpl` the same fields, `checkbox.tpl` no error
  output, and `Form::validate()` the same form-error notice.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a (lib/pkp d446601ebe).
  `IssueForm.inc.php` has the same checks (lines 36–47) and defaults,
  `checkbox.tpl` no error output, nothing fills `formSectionErrors`, and
  `Form.inc.php` raises the same notice.
- Introduced: the checks have been on the tick boxes since 2744a3fafc
  (2013), but the message still showed under them: pkp-lib's
  `smartyFBVElement()` pushed any field's error, a tick box's included,
  into `formSectionErrors`, and `formSection.tpl` printed it as
  `<span class="error">`. 2157c1b741 removed that push (`git log -S`),
  so it is where the regression starts. It is first in pkp-lib's
  `ojs-3_1_1-0` tag, not in `ojs-3_1_0-1`. That OJS 3.1.0 showed the
  message is from this code read; 3.1.0 was not run (unverified).
- Upstream searched 2026-10-01 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library. `pkp/pkp-lib#8510` (OJS 3.3.0.13) was closed by
  NateWr on 2022-12-20 as not planned, right after his comment that the
  UI is confusing and that unticking "Title" lets the issue save.
- Not driven: the "Issue Data" tab of an existing issue, a journal with
  one form language, MySQL (nothing here depends on the database).
