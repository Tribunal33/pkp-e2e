# Saving a journal section while its review form is inactive silently clears the section's review form

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced to a PR; [b27ab37bd1](https://github.com/pkp/ojs/commit/b27ab37bd17a682e9865fd498a19f02a0fafeeaa) · 2008-06-19 · Alec Smecher (asmecher), which added the section's "Review Form" list
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U17 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a11)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager deactivates a review form that a section has chosen
under "Review Form". The section's "Edit" window then shows "None / Free
Form Review" chosen, and nothing says the section has a form that is not
shown. "Save", even with nothing changed, answers "Your changes have
been saved." and clears the section's form. When the form is made active
again, the section still reads "None / Free Form Review", and "Add
Reviewer" no longer preselects the form for the section's submissions.

From then on, review requests in the section go out without the
journal's form unless an editor picks it by hand each time, until
someone notices and chooses the form again in the section's window.

It needs a form deactivated while a section still uses it, and a save
of that section, for any reason, before the form is active again. A
journal deactivates a form in use when it stops using it for a while,
or when it replaces it with a revised copy: a form that reviews have
used offers only "Copy" and "Preview", so the journal edits a copy and
deactivates the old form while sections still point at it.
Only a journal's sections have a "Review Form" field; a press's series
and a preprint server's sections have none.

## Impact

- **Lost**: the section's review form, silently. The save that removes
  it says only that the changes were saved.
- **Who**: journal managers who save a section while its form is
  inactive; then the editors who add reviewers in that section, and the
  reviewers, who answer in free text instead of the journal's questions.
- **Way round**: the manager chooses the form again in the section's
  window; editors can choose it by hand in "Add Reviewer".

Medium: the loss is silent, but only after a form in use was
deactivated and the section saved before it came back, and the form
can be chosen again on screen. It would be high if a section lost its
form without being saved while the form was inactive.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS, the journal `publicknowledge`.
- The dataset has no review form, so steps 1 and 2 make two. Its
  sections "Articles" and "Reviews" have no review form.
- Submission 12, "Sodium butyrate improves growth performance of weaned
  piglets during the first period after weaning", is in "Articles", at
  Review. Aisla McCrae is not a reviewer on it.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open Settings ›
   Workflow › "Review" › "Review Forms", press "Create Review Form",
   type the Title "u17h13e form A" and press "Save". On its row press
   "Edit", open "Form Items", press "Create New Item", type the Item
   "u17h13e question", choose "Extended text box" and press "Save".
   Close the window. Tick the row's "Active" box and press "OK".
2. Make "u17h13e form B" the same way, with the Item "u17h13e other
   question", and make it active.
3. Open Settings › Journal › "Sections". On "Articles" press "Edit",
   choose "u17h13e form A" under "Review Form" and press "Save".
4. Do the same on "Reviews".
5. Open submission 12's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`),
   press "Add Reviewer" and "Select" on Aisla McCrae. Read "Review
   Form", then close the window.
6. Open "Review Forms", untick "u17h13e form A"'s "Active" box and press
   "OK" on "Are you sure you wish to deactivate this review form? It
   will no longer be available for new review assignments."
7. Open "Sections" and press "Edit" on "Articles". Read "Review Form".
   Press "Save" without changing anything.
8. Open "Review Forms", tick "u17h13e form A"'s "Active" box and press
   "OK".
9. Open "Sections", press "Edit" on "Articles" and read "Review Form".
   Press "Cancel", then do the same on "Reviews".
10. Repeat step 5.

**Expected**: at step 5 "Review Form" shows "u17h13e form A" chosen. At
step 7 the window shows that the section has "u17h13e form A", and
"Save" with nothing changed leaves it. At step 9 both sections read
"u17h13e form A", and at step 10 "Add Reviewer" preselects it.

**Observed**: step 5 shows "u17h13e form A" chosen. At step 7 "Review
Form" lists "None / Free Form Review", chosen, and "u17h13e form B";
"u17h13e form A" is not in the list. "Save" closes the window with
"Your changes have been saved.". At step 9 "Articles" reads "None / Free
Form Review", with "u17h13e form A" back in the list. At step 10 "Add
Reviewer" shows "None / Free Form Review" chosen.

"Reviews", not saved while the form was inactive, reads "u17h13e form
A" at step 9. With no other active form (step 2 left out), the window at
step 7 has no "Review Form" field at all, and "Save" clears the form the
same way.

## Cause

`SectionForm` (OJS, `controllers/grid/settings/sections/form/SectionForm.php`)
builds the window's "Review Form" list from the active forms only, and
its save stores whatever the list posts. `fetch()` (line 120) reads
`$reviewFormDao->getActiveByAssocId(...)`, and the template
(`sectionForm.tpl`, lines 42 to 46) selects the section's stored
`reviewFormId` among those options. An inactive form is not among them,
so the browser selects the first option, "None / Free Form Review"
(value `""`). With no active form at all, the template's
`{if count($reviewFormOptions)>0}` leaves the field out, and nothing is
posted.

`execute()` (lines 167 to 172) then turns the empty or missing value
into `null` and stores it:

```php
$reviewFormId = $this->getData('reviewFormId');
if (!$reviewFormId) {
    $reviewFormId = null;
}
$section->setReviewFormId($reviewFormId);
```

Deactivating a form says only that it "will no longer be available for
new review assignments"; it does not say that choices already made are
undone. Here a save the manager did not mean as a change undoes one. The
section's validator (`ReviewFormDAO::reviewFormExists()`) accepts any
form of the journal, active or not, so only the list withholds the
inactive one.

Reach:

- Add Reviewer (`ReviewerForm::initData()`) preselects the section's
  stored form from a list of active forms only. While the form is
  inactive it preselects nothing, whether the section was saved or not;
  once the section's form is cleared, it no longer preselects the form
  after it is active again (seen on screen).
- A reviewer's "Edit" window (`EditReviewForm`) drops an inactive form
  from a review request the same way, through its own list and save:
  [pkp-e2e#911](https://github.com/jardakotesovec/pkp-e2e/issues/911),
  a separate fix in pkp-lib.
- A press's series and a preprint server's sections have no "Review
  Form" field (OMP's `section.json` carries `reviewFormId`, but no
  window sets it) (code).
- The sections programming interface only reads sections, so the
  window is the only writer (code).

## Proposed fix

Whether deactivating a form should also take it off the sections that
already chose it is the team's call. This fix takes the reading that it
should not: deactivation withholds the form from new choices, and a
section keeps the form it has until a manager changes it.

In `SectionForm::fetch()`, add the section's current form to the list
when it is not active, so the window shows it chosen and "Save" posts it
back. The proposal is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-save-drops-inactive-review-form/fix.diff):

```diff
         while ($reviewForm = $reviewForms->next()) {
             $reviewFormOptions[$reviewForm->getId()] = $reviewForm->getLocalizedTitle();
         }
+        // A form deactivated after the section chose it stays the section's default (deactivation
+        // only withholds it from new choices): list it too, so the window shows it and saving keeps it.
+        $currentReviewFormId = (int) $this->getData('reviewFormId');
+        if ($currentReviewFormId && !isset($reviewFormOptions[$currentReviewFormId])) {
+            $currentReviewForm = $reviewFormDao->getById($currentReviewFormId, Application::ASSOC_TYPE_JOURNAL, $journal->getId());
+            if ($currentReviewForm) {
+                $reviewFormOptions[$currentReviewFormId] = $currentReviewForm->getLocalizedTitle();
+            }
+        }
```

When the window first opens, `getData('reviewFormId')` is the
section's stored form. When it is shown again after a refused save, it
is the value just posted. The choice is kept in both cases. With a form
on the section, the list is never empty, so the field is left out only
when the section has no form and no form is active. The inactive form
is listed only for the section that holds it: other sections and
"Create Section" are not offered it. The same addition, for the
reviewer's "Edit" window in pkp-e2e#911, can land in the same change.
The kept form could also be labelled "(Inactive)" in the list, as an
inactive section is labelled elsewhere.

The fix was tried on `main`, and the walk showed the Expected: at step 7
the list held "u17h13e form A", chosen (listed after "u17h13e form B"),
"Save" kept it, and at steps 9 and 10 "Articles" and "Add Reviewer" had
it. To check it reaches no further, a fresh dataset was taken through
steps 1, 2, 3 and 6 only, so "Reviews" never had a form; then "Reviews"
and "Create Section" were opened with the fix in and out:
both times they listed only "None / Free Form Review" and "u17h13e form
B", and "Save" on "Reviews" left it with no form.

**Alternatives**:

- Keep the stored form in `execute()` when nothing is posted: it covers
  only the no-active-form case. With another form active, the window
  still posts "None" and still shows the wrong choice.
- List every form, active or not: it offers deactivated forms to
  sections that never had them, which deactivation is meant to stop.

**What goes with it**:

- Data: sections already cleared this way cannot be told apart from
  sections that never had a form, so there is no repair.
- Backport: 3.5 and 3.4 have the same lines, and the diff applies there
  as written. 3.3 (`SectionForm.inc.php`) has the same list and a save
  that turns `''` into `null`; the same lines fit, with
  `ASSOC_TYPE_JOURNAL` for the constant.
- Test: an e2e scenario in spec U17 (deactivate a section's form, save
  the section, activate the form, check the section and Add Reviewer
  still have it).

Small: nine lines added to one method, `SectionForm::fetch()` in OJS,
with no schema or API change and no data to repair, and one test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-save-drops-inactive-review-form/walk.js),
  with its helpers in `lib.js` beside it. It takes the Steps through the
  screens on PKP's default test dataset; `MODE=one` takes them without
  form B, and `MODE=nb` runs the neighbour check alone. Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/section-save-drops-inactive-review-form/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and 3.5, OJS, on PostgreSQL: the same Observed on
  both. The section's "Save" answered 200 with `reviewFormId` posted
  empty (form B active) or not posted (form A alone), and a database
  read beside the walk showed `sections.review_form_id` of "Articles"
  go from the form's ID to empty while "Reviews" kept it. No request
  failed and no script error was logged, in the walks or the fix trial.
- Tips: `main` OJS 7c6fba2064 (lib/pkp f4c2578c94); 3.5 OJS 5fc74d6213
  (lib/pkp f4f8fcdbc0); 3.4 OJS daf0ca971d (lib/pkp 55c8e406b3); 3.3 OJS
  d7d9dd14ec (lib/pkp 5e84acd11b). Datasets: pkp/datasets 384e28b
  (2026-10-12).
- Code reads: `SectionForm` and `sectionForm.tpl` on every line (3.5
  byte for byte as `main`; on 3.4 the save sits at lines 169 to 174);
  `ReviewerForm`, `reviewerFormFooter.tpl`, `ReviewFormDAO` and the
  sections API controller on `main` for the reach.
- Not driven: 3.4 and 3.3 (code, as asked); the case without form B on
  3.5 (code: the same template and save).
- MySQL not checked; nothing here depends on the database.
