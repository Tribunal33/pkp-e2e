# Submission wizard: "Edit" on the Review step's License, Relation status and Chapters panels does nothing

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; no Review step)
- **Introduced** `pkp/pkp-lib#12153` for `pkp/pkp-lib#12088` · [f9b442c7cf](https://github.com/pkp/pkp-lib/commit/f9b442c7cf6bcfa8ab39c637cd706aff31f90336) · 2026-01-21 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** U75 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a11), U72 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the submission wizard's Review step, pressing "Edit" on the
"License" or "Relation status" panel of a preprint server, or on the
"Chapters" panel of a press, does nothing: the wizard stays on "Review"
and shows no message. The other panels' "Edit" open their step.

Nothing is lost. On a preprint server the "For Readers" step holds the
license and the relation status; on a press the "Details" step holds
the chapters. The author reaches them through the wizard's list of
steps at the top, or through the "Edit" of the "For Readers" or
"Details" panel.

## Impact

- **Lost**: nothing; the press on "Edit" goes unanswered without a message.
- **Who**: every author or editor submitting on a preprint server, or on a press (the "Chapters" panel shows for monographs and edited volumes alike), who wants to correct one of these fields from the Review step.
- **Way round**: on screen, as the Summary says.

Low: nothing is lost and the submission gets done. It would be medium
if "Edit" sent the author to the wrong step or the way round were not
on screen.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, OPS and OMP;
nothing else.

Preprint server (OPS):

1. Sign in as `ccorino`.
2. "Make a Submission" (`/index.php/publicknowledge/en/submission`):
   type a title, choose English, tick the requirements and
   data-collection boxes, press "Begin Submission".
3. On "Upload Files", "Add File" with the label "PDF", upload any PDF
   as "Preprint Text", then "Continue". [3.5: the wizard opens on
   "Details", then "Upload Files"; take them in the order of the list
   of steps.]
4. On "Details", type an abstract, then "Continue".
5. On "Contributors", "Continue".
6. On "For Readers", choose "This preprint has not been published
   elsewhere." under "Relation status", then "Continue".
7. On "Review", press "Edit" on the "Relation status" panel.
8. Back on "Review" ("5 Review" in the list of steps if the wizard
   left it), press "Edit" on the "License" panel.
9. Back on "Review", press "Edit" on the "For Readers (English)"
   panel.

Press (OMP):

1. Sign in as `aclark`.
2. "Make a Submission": type a title, choose English, tick the boxes,
   press "Begin Submission".
3. On "Upload Files", upload any file as "Book Manuscript", then
   "Continue". [3.5: "Details" comes first, as on OPS.]
4. On "Details", type an abstract, then "Continue".
5. On "Contributors", "Continue".
6. On "For the Editors", choose the series "Library & Information
   Studies", then "Continue".
7. On "Review", press "Edit" on the "Chapters" panel.
8. Back on "Review" ("5 Review" in the list of steps if the wizard
   left it), press "Edit" on the "Details (English)" panel.

**Expected**: OPS steps 7 and 8 open "4 For Readers", as step 9 does.
OMP step 7 opens "2 Details", as step 8 does.

**Observed**: OPS steps 7 and 8 and OMP step 7 leave the wizard on "5
Review" (address `#review`), with no message and no script error. The
page as served binds the three buttons to an empty step:

```html
<pkp-button aria-describedby="review-relation" class="submissionWizard__reviewPanel__edit" @click="openStep('')">
```

OPS step 9 opens "4 For Readers" (`#editors`) and OMP step 8 "2
Details" (`#details`), as does every other panel's "Edit". On 3.5 the
same steps open "4 For Readers" and "1 Details", and the served buttons
read `openStep('editors')` and `openStep('details')`.

## Cause

The three panels are not part of pkp-lib's Review step. Each app adds
them from a closure registered on the template hook
`Template::SubmissionWizard::Section::Review`: OPS in
`SubmissionHandler::getEditorsStep()` (`pages/submission/SubmissionHandler.php:250`),
OMP in `SubmissionHandler::getDetailsStep()` (`:131`).
`lib/pkp/templates/submission/wizard.tpl` calls the hook once per step
inside `{foreach from=$reviewSteps item=$step}`, passing
`step=$step.id`. Each closure reads that id
(`$step = $params[0]['step']`) and, only for `'editors'` (OPS) or
`'details'` (OMP), renders `submission/review-license.tpl` and
`submission/review-relation.tpl` or `submission/review-chapters.tpl`
with `$templateMgr->fetch()`. Those templates bind their "Edit" to
`openStep('{$step.id}')`: not the hook's parameter, but the loop
variable of the calling template.

Up to 3.5 that worked: `PKPTemplateManager::smartyCallHook()` handed the
callbacks the Smarty template being rendered (`$smarty`), and a fetch
from it inherits its variables, `$step` included. Commit
[f9b442c7cf](https://github.com/pkp/pkp-lib/commit/f9b442c7cf6bcfa8ab39c637cd706aff31f90336)
(`pkp/pkp-lib#12153`, unified Smarty and Blade view resolution so that
plugins can override any template with Blade) changed
`smartyCallHook()` to pass `$this`, the TemplateManager, so that a
callback's `fetch()` goes through the TemplateManager:

```php
// lib/pkp/classes/template/PKPTemplateManager.php, smartyCallHook()
Hook::call($params['name'], [&$params, $this, &$output]);
```

`PKPTemplateManager::fetch()` now renders through
`SmartyTemplatingEngine::get()`, which gives the new template the
TemplateManager's assigned and shared variables only. A variable local
to the calling template (a `{foreach}` item, an `{assign}`) no longer
reaches it, so `{$step.id}` renders empty and the button calls
`openStep('')`, which opens nothing. The follow-up
[48deb1edf2](https://github.com/pkp/pkp-lib/commit/48deb1edf2b251b2c8e7f78d182d09010758110e)
(`pkp/pkp-lib#12389`) copies a callback's `assign()`s back into the
calling template after the hook; nothing carries the calling template's
own variables to the callback.

Reach:

- Shipped code: in the three apps, their `lib/pkp` and the bundled
  plugins, only these three templates read a calling template's local
  variable from a `{call_hook}` callback (checked in the code). The
  other callbacks read only what the page's handler or the plugin
  assigns, or what the hook passes: the sidebar blocks
  (`Templates::Common::Sidebar`), citation formats, Crossref (Crossmark,
  cited-by, references), the Publication Facts Label,
  recommendByAuthor and recommendBySimilarity, staticPages
  (`Template::Settings::website`), OJS's `Template::Settings::distribution`
  and OPS's `Template::Settings::workflow::submission` tabs, and OPS's
  and OMP's `Template::SubmissionWizard::Section` panels.
- Third-party plugins: a callback that renders a template reading the
  caller's local variables, or reads one itself through
  `$params[1]->getTemplateVars(...)`, now gets nothing. The prime case
  is OJS's `Templates::Issue::Issue::Article`, called in
  `article_summary.tpl` inside `issue_toc.tpl`'s
  `{foreach from=$section.articles item=article}`: a callback reading
  `article` there gets null and one calling a method on it throws (not
  driven; no bundled callback does this).
- OJS shows no fault in shipped code: it adds no panel to the Review
  step (checked in the code).

## Proposed fix

Write the step in the three templates. Each closure already knows it
(`$step === 'editors'` / `'details'`) and fetches the template for that
step only, so the literal is always right
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-panel-edit-stays-on-review/fix-ops.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-panel-edit-stays-on-review/fix-omp.diff)):

```diff
--- a/templates/submission/review-license.tpl      (OPS; review-relation.tpl the same)
-            @click="openStep('{$step.id}')"
+            @click="openStep('editors')"
--- a/templates/submission/review-chapters.tpl     (OMP)
-            @click="openStep('{$step.id}')"
+            @click="openStep('details')"
```

Tried on OPS and OMP `main`: with the fix in, the three buttons are
served as `openStep('editors')` and `openStep('details')` and open "4
For Readers" and "2 Details"; every other Review panel's "Edit" opens
the same step as without the fix.

It fixes the shipped symptom with no change to pkp-lib's template
scope, which the second alternative leaves to the owner of
`pkp/pkp-lib#12088`. A proposal; the team decides.

**Alternatives**:

- Pass `$smarty` to the callbacks again, as before f9b442c7cf. Since
  that commit a Smarty template is a `PKP\core\blade\SmartyTemplate`,
  whose `fetch()` resolves Blade overrides through `View::resolveName`
  and keeps the caller's scope, so the overrides would still work; the
  callbacks would lose the `TemplateManager::fetch` hook, the
  `View::share` of the TemplateManager's variables, and the
  TemplateManager-only methods (`setState()`, `addJavaScript()`).
- Restore the caller's scope in pkp-lib, for the owner of
  `pkp/pkp-lib#12088` to weigh: give the callback's render the calling
  template as its Smarty parent, for instance a stack pushed and popped
  in `smartyCallHook()` and read in `SmartyTemplatingEngine::get()`.
  This also covers third-party callbacks (Reach). Not tried. Copying
  the caller's variables into the TemplateManager for the hook's length
  does not work: `fetch()` `View::share()`s them, nothing unshares
  them, and a lent `step` stays visible to every later template of the
  request.

**What goes with it**:

- No data repair and no backport: 3.5 and 3.4 do not have the change.
- The guard: a Review-step check that each panel's "Edit" opens its
  step, in each app's wizard tests.

Small: one line in each of three templates in two app repos, and the
check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-panel-edit-stays-on-review/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-panel-edit-stays-on-review/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets `e8dafbc`, 2026-10-02, PostgreSQL):
  `node bin/probe.js ops|omp shared/playwright/checks/issues/review-panel-edit-stays-on-review/walk.js`.
  It reads the served HTML for the `openStep(...)` bindings. With
  `PROBE_MODE=neighbour` it presses the "Edit" of every Review panel
  instead, which recorded OPS step 9 (the panel is headed "For Readers
  (English)" on the two-language dataset).
- The fix was checked with that script: the steps and the every-panel
  pass on OPS and OMP `main` with the fix applied.
- Tips: main OPS `c8af945bb7`, OMP `3b0ecf794c`, their `lib/pkp`
  `3dc90c81a6`, `lib/ui-library` `280f98c570`; 3.5 OPS `38b61882d3`,
  OMP `9c5e24246c`, `lib/pkp` `cf3f984335`; 3.4 OPS `acd8ae704b`, OMP
  `0aec65441`, `lib/pkp` `767353f4fe`; 3.3 OPS `c5532e2161`, OMP
  `8e72fc883`, `lib/pkp` `ac3fa73402`.
- 3.5 and 3.4: the same templates and closures, and `smartyCallHook()`
  passing `$smarty` (3.5 walked and working). 3.3: no `review-*.tpl`
  and no Review step in `lib/pkp/templates/submission/`.
- Introduced: the three `openStep('{$step.id}')` lines and the closures
  date from the new wizard (`pkp/ops` 8fd2c6d834, `pkp/omp` a46e881a3a,
  2022-10-19, `pkp/pkp-lib#7191`) and worked until the
  `smartyCallHook()` change; blame on that line gives f9b442c7cf,
  merged in `pkp/pkp-lib#12153` on 2026-01-21.
- Upstream: pkp/pkp-lib, pkp/ops, pkp/omp and pkp/ui-library searched
  for the symptom (review step edit, relation, license, chapters) and
  for `openStep`, `smartyCallHook`, `SubmissionWizard::Section::Review`;
  `pkp/pkp-lib#13098` (credit roles hidden beside the Publication Facts
  Label, on 3.5) only shares a stack trace through `smartyCallHook()`.
