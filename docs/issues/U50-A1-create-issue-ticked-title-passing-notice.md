# "Create Issue" arrives with "Title" ticked and refuses an untitled issue with only a passing notice

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** [2744a3fafc](https://github.com/pkp/ojs/commit/2744a3fafcfc67e63f33eb0fadc8e1ff46c0f96a) (bug 8450 in pkp's former tracker, no PR) · 2013-10-16 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#8510` (closed without a fix), covering the same refusal on "Issue Data" when an issue's title is deleted
- **Tracked in** spec U50 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Under its boxes, the "Create Issue" form has four tick boxes, "Volume",
"Number", "Year" and "Title". Each one puts that part in the issue's
name and makes its box required. The form ticks all four on every
journal, every time it opens, and most issues have no title.

A Journal Manager or editor who fills in Volume, Number and Year and
presses "Save" gets no new issue. The window stays open, and a notice at
its top right reads "Title is required for the issue." for a few
seconds. Nothing on the form is marked, so once the notice has gone the
form looks as it did before "Save".

Unticking the "Title" tick box costs readers nothing on an untitled
issue: it is then named by volume, number and year only ("Vol. 3 No. 1
(2026)"), the usual name. The same unmarked refusal follows on "Issue
Data" when a title is deleted, and on either form for an empty "Volume",
"Number" or "Year" box whose tick box is ticked.

## Impact

- **Lost**: nothing; the typed values stay in the form. The reason shows
  for about four to five seconds and is then gone.
- **Who**: Journal Managers and editors creating an issue without a
  title, which is most issues, unless they untick "Title" first.
- **Way round**: untick the "Title" tick box and press "Save" again; the
  issue is created. The form never suggests it.

Low: the task gets done this way, and the notice names the field. It
would be medium if the notice did not name the field, or if the form
had no way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`): the
  journal `publicknowledge` has "Vol. 1 No. 2 (2014)" published and
  "Vol. 2 No. 1 (2015)" not yet published.

1. Sign in as `dbarnes`.
2. Open Issues (`/index.php/publicknowledge/manageIssues`); "Future
   Issues" is open.
3. Press "Create Issue". The tick boxes "Volume", "Number", "Year" and
   "Title" are all ticked.
4. Type 3 in the "Volume" box, 1 in "Number" and 2026 in "Year". Leave
   the Title box empty and the "Title" tick box ticked.
5. Press "Save".
6. Wait ten seconds.

**Expected.** The save is refused and the Title box is marked with
"Title is required for the issue." under it, the message staying on the
form. (Or the form arrives with the "Title" tick box unticked, and step
5 creates "Vol. 3 No. 1 (2026)".)

**Observed.** The window stays open. A notice at the top right reads
"Title is required for the issue." and is gone about four to five
seconds later. Nothing on the form is marked: there is no message under
any box, and the line under the Title box still reads "Title". "Future
Issues" still lists only "Vol. 2 No. 1 (2015)".

Control: with the "Title" tick box unticked at step 4, "Save" closes the
window with "Your changes have been saved." and "Future Issues" lists
"Vol. 3 No. 1 (2026)". An empty "Year" box with its tick box ticked is
refused the same way, with "Year is required and must be a positive,
numeric value." only in the passing notice.

## Cause

`IssueForm` (OJS, `controllers/grid/issues/form/IssueForm.php`, lines
51–62) registers its "a ticked part needs a value" checks on the tick
boxes' fields (`showVolume`, `showNumber`, `showYear`, `showTitle`), not
on the value fields (`volume`, `number`, `year`, `title`). The Title
check is `FormValidatorCustom($this, 'showTitle', 'optional',
'editor.issues.titleRequired', …)`.

A failed check records its error under that field name
(`PKP\form\Form::validate()`, `$this->errorFields[$check->getField()]`).
The form builder marks a field only where it draws a sub-label for that
name (`FormBuilderVocabulary::_smartyFBVSubLabel()`), and tick boxes
have none (`templates/form/checkbox.tpl`). So the error is attached to a
name the form cannot mark. `issueForm.tpl` has no list of errors either,
so the only trace of the refusal is the passing notice that
`Form::validate()` creates for every refused form.

2744a3fafc ("*8450* Fix issue form validation", no other text) put the
checks there. Before it, `validate()` added them only for a ticked tick
box, as `required` checks on the value fields; the commit replaced them
with these `optional` checks in the constructor. It also moved the "no
tick box ticked" check off `showVolume`, where as a `required` check it
gave the "Volume" tick box the browser-side `required` rule
(`FormValidator`'s `cssValidation`), onto the name `issueForm`. What bug
8450 reported, and why the checks went on the tick boxes, is not known:
the commit gives no reason and pkp's former tracker was not read.
One constraint is clear in the code: an `optional` check is skipped
when its own field is empty (`FormValidator::isEmptyAndOptional()`), so
an `optional` check on the empty Title box would never run. The default
of all four tick boxes ticked for a new issue (`initData()`) dates from
the form's first version, 883e6abf16.

Reach:

- "Issue Data" in "Issue Management" is the same form: deleting the
  title of an issue whose "Title" tick box is ticked is refused the same
  way (`pkp/pkp-lib#8510`): code;
- empty "Volume", "Number" and "Year" boxes with their tick box ticked:
  on screen ("Year"), and code for the other two;
- the refusal with no tick box ticked ("Issue identification is
  required. Please select at least one of the issue identification
  options.") is registered on the name `issueForm`, which no single
  field owns, so it too shows only in the notice: code.

## Proposed fix

Drop the four `addCheck()` calls on the tick boxes and make the same
tests in `IssueForm::validate()`, recording each error with
`addError()` and `addErrorField()` on the value field (`volume`,
`number`, `year`, `title`), as the same method already does for "URL
Path" (and, on `main` and 3.5, "Date Published")
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-issue-ticked-title-passing-notice/fix.diff)):

```diff
-        $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'showTitle', 'optional', 'editor.issues.titleRequired', function ($showTitle) use ($form) {
-            return !$showTitle || implode('', $form->getData('title')) != '' ? true : false;
-        }));
 …(the same for showVolume, showNumber, showYear)
+        // A ticked part of the issue's name needs a value. The error goes on the
+        // part's own field, so the form shows the message under that box.
+        foreach ([
+            'volume' => ['showVolume', 'editor.issues.volumeRequired'],
+            'number' => ['showNumber', 'editor.issues.numberRequired'],
+            'year' => ['showYear', 'editor.issues.yearRequired'],
+        ] as $field => [$showField, $message]) {
+            if ($this->getData($showField) && !$this->getData($field)) {
+                $this->addError($field, __($message));
+                $this->addErrorField($field);
+            }
+        }
+        if ($this->getData('showTitle') && implode('', (array) $this->getData('title')) === '') {
+            $this->addError('title', __('editor.issues.titleRequired'));
+            $this->addErrorField('title');
+        }
```

Each message then replaces the sub-label under its box, in the form's
error style, and the passing notice still shows. The tests are those of
today ("0" still counts as empty), and a "Volume" refused for letters
keeps its message. No check is added, so no field gains a browser-side
rule, which keeps away from what the pre-2744a3fafc `required` checks
did.

Tried on `main`: step 5 then shows "Title is required for the issue."
under the Title box, after the notice has gone too, and no issue is
created. With the fix in and out, an unticked "Title" tick box still
creates "Vol. 3 No. 1 (2026)". With the fix, an empty, ticked "Year"
shows "Year is required and must be a positive, numeric value." under
the Year box.

**Alternatives**

- Arrive with the "Title" tick box unticked on "Create Issue": it spares
  most managers the refusal, but it is a product decision on the issue's
  default name, and it leaves the unmarked refusal on "Issue Data" and
  for the other three parts.
- Keep the checks on the tick boxes and add a list of errors to the
  template (`common/formErrors.tpl`): the message stays, but away from
  the box it is about. The form lost that list in 8755b35d75, its port
  to the form builder, which shows messages under the boxes instead.
- Register the checks on the value fields as `required`: a `required`
  check also gives the box the browser-side `required` rule, so an
  empty box whose tick box is unticked could no longer be saved.

**What goes with it**

- Left out: the "no tick box ticked" refusal, which no single field
  owns; marking the tick boxes' row would need a form-section error,
  which this form does not use.
- No API, plugin hook or stored data changes, and nothing stored needs
  repair. A plugin hooking `issueform::validate` sees the same errors
  under the value fields' names instead of the tick boxes'.
- Backport: the diff applies to 3.5 as it stands. On 3.4 `git apply`
  refuses it (its constructor has no blank line after the "URL Path"
  check) while `patch` applies it with fuzz; 3.4's `validate()` has no
  "Date Published" check, only "URL Path". 3.3 has the same checks in
  `IssueForm.inc.php` and needs the change by hand.
- Guard: an e2e scenario on "Create Issue" (an empty Title box with its
  tick box ticked, refused with the message under the Title box), a
  **Planned** item in spec U50.

Small: a few lines in one method, with no new pattern, and an e2e
scenario.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-issue-ticked-title-passing-notice/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/create-issue-ticked-title-passing-notice/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). It reads the form's marks
  (`label.error`, `.error`, the Title box's sub-label) at once and after
  the notice has gone. The Control and the "Year" case:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-issue-ticked-title-passing-notice/neighbour.js),
  walked with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, with the same observation
  on both (the notice gone after 4.3 s and 4.8 s); no request failed and
  no script error was logged. OMP and OPS have no journal issues, so the
  form does not exist there.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a); `stable-3_5_0` OJS
  c346ee00a5 (pkp-lib 3bb4450bea); `stable-3_4_0` OJS 75cc2d488b
  (pkp-lib 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib
  f6ab331645).
- `main` and 3.5 (walked): read `IssueForm.php`, `issueForm.tpl`, and
  pkp-lib's `classes/form/Form.php`, `FormBuilderVocabulary.php`,
  `validation/FormValidator.php`, `validation/FormValidatorCustom.php`,
  `templates/form/checkbox.tpl` and `subLabel.tpl`.
- 3.4 (code): `IssueForm.php` has the same four checks on the tick boxes
  and `initData()` ticks all four; `issueForm.tpl` draws them as tick
  boxes; pkp-lib's `Form.php` creates the same notice.
- 3.3 (code): `IssueForm.inc.php` has the same checks and defaults,
  `issueForm.tpl` the same tick boxes, and pkp-lib's `Form.inc.php` and
  `FormBuilderVocabulary.inc.php` record and mark errors the same way.
- Introduced: `git blame` on the check lines leads to the 2021 namespace
  and formatting commits (dc776bf5ca, 665ed1f925); `git log -S` on
  `'showTitle', 'optional'` then to 2744a3fafc, which has no PR on
  GitHub (b72cbebf95 is the same change on the `ojs-alpha-3_0` branch).
  Its parent's `validate()` was read for the earlier checks. The commit
  predates OJS 3.0's release, so no released version marked these
  errors.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-02 by the message's text, `showTitle` and `titleRequired`.
  `pkp/pkp-lib#8510` (OJS 3.3.0.13, "Once added, issue title can't be
  deleted") is the only match; its one comment calls the tick boxes
  "really confusing" and says to untick "Title", and it was closed as
  not planned.
