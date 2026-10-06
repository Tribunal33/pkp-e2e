# Manage Emails: "Add Template" opens an empty window titled "Edit Template"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; its "Email Templates" list titles the window "Add Template")
- **Introduced** `pkp/pkp-lib#8407` and `pkp/ui-library#227` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) and [20c3930eda](https://github.com/pkp/ui-library/commit/20c3930eda3e6731f5c91a359d545c931dc1f451) · 2022-11-03 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U56 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Manage Emails" is the list of emails a manager reaches from Settings ›
Workflow › "Emails" › "Add and edit templates". Pressing "Edit" on an
email there opens that email's window with its templates; pressing "Add
Template" in that window opens an empty form titled "Edit Template",
the title of the form that edits an existing template. Nothing in the
form says it adds one: the only sign is that its "Name", "Subject" and
"Body" boxes are empty.

"Save" still adds the template as a new row and leaves the default
untouched. Every email whose window offers "Add Template" shows it:
the decision and reviewer emails of a journal or press (about 26 each)
and the three decision emails of a preprint server.

## Impact

- **Lost**: nothing; the template is added as intended.
- **Who**: managers adding a template to a decision or reviewer email.
  A screen reader announces the form as "Edit Template"; after that its
  user meets the same cue a sighted manager has, empty boxes, each
  marked "0/2 languages completed".
- **Way round**: none needed. A manager unsure whether "Save" would
  overwrite the default sees the new row beside it afterwards.

Low: a window title that misleads while the outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS, OMP or OPS
  (`publicknowledge`). Nothing else.

Steps:

1. Sign in as `rvaca` (the journal's, press's or preprint server's
   manager).
2. Open Settings › Workflow, press the "Emails" tab, then "Add and edit
   templates". "Manage Emails" lists the emails.
3. Type Submission Declined (Pre-Review) in the search box and press
   Enter [on a preprint server the email is named "Submission
   Declined"; type that].
4. Press "Edit" on the row named exactly "Submission Declined
   (Pre-Review)" [on a preprint server, the row named exactly
   "Submission Declined"; the search also lists "Reinstate Submission
   Declined Without Review"]. A window of that name opens with the
   email's description, a list "Templates" with an "Add Template"
   button, and one row, "Default" "Edit".
5. Press "Add Template" and read the window.
6. Type Short decline u56c in "Name", A short decline in "Subject" and
   Dear author in "Body", then press "Save".
7. Press "Edit" on the "Default" row.

**Expected** (step 5): a window titled "Add Template", the words of the
button just pressed, with empty "Name", "Subject" and "Body" boxes and
"Save".

**Observed** (step 5), on all three apps: the window is titled "Edit
Template", and that is also its name for a screen reader. Its text
reads in full:

```
Edit Template
French English
Name
Enter a brief name to help you find this template.
0/2 languages completed
Subject
0/2 languages completed
Body
Insert Content
0/2 languages completed
Save
```

After step 6, "Saved" shows, the window closes, and a row "Short
decline u56c" with "Edit" and "Remove" follows the "Default" row. Step
7 opens "Edit Template" filled with the default's name, subject and
body.

## Cause

`ManageEmailsPage.openTemplate()` (lib/ui-library
`src/components/Container/ManageEmailsPage.vue`, lines 356–370) serves
both buttons. "Add Template" calls it with `null`, a row's "Edit" with
the template. Its first line replaces `null` with an empty object
(`template = template || {}`, line 357) and stores the result in
`currentTemplate`.

The empty object is needed elsewhere. The component's `currentTemplate`
watcher (lines 97–98) passes every new value to
`setCurrentTemplateForm()`, which calls `Object.entries()` on it; with
`null` that would throw.

The title is then chosen by the truthiness of `currentTemplate` (line
362):

```js
title: this.currentTemplate
    ? t('manager.mailables.editTemplate')   // "Edit Template"
    : t('manager.emails.addEmail'),         // "Add Template"
```

An empty object is truthy in JavaScript, so the second branch never
runs and every window is titled "Edit Template". `setCurrentTemplateForm()`
tells the two cases apart with `Object.entries(newTemplate).length`,
and that is why the form posts a new template while the title says
otherwise.

When the page was built, the ternary sat in lib/pkp
`templates/management/manageEmails.tpl`, with `openTemplate()` already
in ui-library. `pkp/ui-library#366` (for `pkp/pkp-lib#9992`, 2024)
moved the windows into ui-library and kept the ternary unchanged.

Reach:

- `openTemplate()` has three callers. "Add Template" is the only one
  that passes nothing, and the only wrong title. A row's "Edit" and the
  window of an email that takes one template, which opens straight from
  the list with the fetched template, are titled "Edit Template", as
  they should be (seen on screen).
- The other add-or-edit windows in ui-library choose their title from
  what was passed, not from a defaulted object: the task template
  window tests whether a template was given, the navigation menu window
  tests the menu's `id` (read in the code).

## Proposed fix

In `openTemplate()`, decide the title by whether the template has any
properties, as `setCurrentTemplateForm()` does for the form's method
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-template-window-titled-edit-template/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Container/ManageEmailsPage.vue
+++ b/lib/ui-library/src/components/Container/ManageEmailsPage.vue
@@ -359,7 +359,7 @@
 			const {openSideModal} = useModal();
 			this.$nextTick(() =>
 				openSideModal(EditTemplateModal, {
-					title: this.currentTemplate
+					title: Object.keys(this.currentTemplate).length
 						? t('manager.mailables.editTemplate')
 						: t('manager.emails.addEmail'),
 					currentTemplateForm: this.currentTemplateForm,
```

The `|| {}` stays, since the watcher needs an object.

Tried on `main`, OJS, OMP and OPS: step 5 then showed a window titled
"Add Template", and step 6 saved the row as before. Three edit windows
were checked with and without the fix and stayed "Edit Template" each
time:

- a row's "Edit" before "Add Template" in the same email's window;
- the same row's "Edit" after it;
- the one-template "Submission Confirmation" ("Submission
  Acknowledgement (Pending Moderation)" on a preprint server).

**Alternatives**

- Take the decision before the default (`const isNew = !template;`) and
  pass it to the title. It works as well, but adds a second way of
  telling the cases apart in a component that already has one.

**What goes with it**

- Backport: the diff applies as it stands to `stable-3_5_0` (`patch`
  accepts it on the three apps). On `stable-3_4_0` the title is in
  lib/pkp `templates/management/manageEmails.tpl` (line 149,
  `:title="currentTemplate ? …"`), and the same test belongs there,
  `:title="Object.keys(currentTemplate).length ? …"`. That edit was
  not tried.
- Test: ui-library has no unit test for this page; an end-to-end check
  that "Add Template" opens a window titled "Add Template" is the guard.

Small: one line in one file, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-template-window-titled-edit-template/walk.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/add-template-window-titled-edit-template/walk.js`
  takes the Steps. With `STEPS=nb` in front it takes the first two
  edit-window checks of the Proposed fix (nothing saved), with
  `STEPS=nb1` the third. Each ran with and without the fix.
- Walked on `main` and `stable-3_5_0`, the three apps each, with the
  same result. No failed request and no script error on any walk.
- Fix applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/add-template-window-titled-edit-template/fix.diff
  ojs omp ops` (it rebuilds the JavaScript).
- Tips:
  - `main`: OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
    64d67363); OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
    lib/ui-library 280f98c5).
  - `stable-3_5_0`: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (lib/pkp cf3f984335); lib/ui-library d4e01883 on
    all three.
  - `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b;
    lib/pkp 767353f4fe, lib/ui-library ee684b34.
  - `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161;
    lib/pkp ac3fa73402, lib/ui-library 96959f9e.
- Code reads:
  - `main` and 3.5: `ManageEmailsPage.vue` (`openTemplate()`, the
    `currentTemplate` watcher, `setCurrentTemplateForm()`,
    `templateSaved()`, `closeTemplateModal()`, and the search, which
    matches any part of an email's name or description);
    `EditMailableModal.vue` ("Add Template" emits `openTemplate` with
    `null`); `EditTemplateModal.vue` (shows the title it is given). The
    file is the same on the three apps' ui-library tips.
  - Which emails offer "Add Template": the mailables whose class sets
    `$supportsTemplates = true`, against each app's
    `classes/mail/Repository.php` `map()` (with lib/pkp's for OJS and
    OMP). On `main` that gives 26 on OJS and on OMP (the editorial
    decision emails; the reviewer emails, from the request and its
    resends to the reminder, unassign and reinstate; the recommendation
    email; "Submission Saved for Later" and the other authors'
    acknowledgement) and 3 on
    OPS (accept, decline, and reinstate a declined submission).
  - 3.4: ui-library `ManageEmailsPage.vue` `openTemplate()` (the same
    `template || {}`) and lib/pkp `templates/management/manageEmails.tpl`
    (the same ternary on `currentTemplate`); lib/pkp
    `locale/en/manager.po` ("Add Template", "Edit Template").
  - 3.3: ui-library `EmailTemplatesListPanel.vue`, whose add method
    sets the window title to `addLabel`, which lib/pkp
    `PKPEmailTemplatesListPanel.inc.php` fills with
    `manager.emails.addEmail`. `pkp/pkp-lib#5716` replaced this list
    with "Manage Emails".
  - Other instances: ui-library title ternaries choosing between an
    edit and an add string (`TaskTemplateManagerFormModal.vue`,
    `NavigationMenuManagerFormModal.vue`).
- Introduced: `git blame` on line 362 gives 76ca2af23
  (`pkp/ui-library#366`, 2024-07-02), the move with the ternary
  unchanged (lib/pkp side cfb1849aa6). `git log -L` on the ternary in
  `manageEmails.tpl` stops at 1a7fbb216f, and blame on
  `template = template || {}` at ui-library 20c3930eda: PRs
  `pkp/pkp-lib#8407` and `pkp/ui-library#227`, merged 2022-11-30.
- Upstream search: pkp/pkp-lib, pkp/ojs and pkp/ui-library, issues and
  PRs, by the window's titles and by `ManageEmailsPage`, `openTemplate`
  and `manager.emails.addEmail`. The nearest, `pkp/pkp-lib#12385` and
  `pkp/pkp-lib#12032`, are about the window's fields.
- Not walked: 3.4 and 3.3 (read in the code). MySQL not checked; the
  fault is in the browser code alone.
