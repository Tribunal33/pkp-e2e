# A section's "Make a new submission to the … section." link opens "Make a Submission" with no section chosen

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#3638` and `pkp/ops#411` (with `pkp/pkp-lib#8495`) for `pkp/pkp-lib#7191` · [6358d611e3](https://github.com/pkp/ojs/commit/6358d611e3463893222bc2d2bd06179879477963), [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e) · 2022-10-18 and 2022-10-19, merged 2022-12-14 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A signed-in author reads "Make a new submission to the Articles
section." under the "Articles" policy on the "Submissions" page and
presses "Articles", the link inside that sentence, expecting "Make a
Submission" with "Articles" chosen. The start form opens with no section
chosen, exactly as from "Make a new submission" at the top of the page,
and the author has to pick "Articles" again.

The sentence shows only to signed-in users. The fault needs two or more
sections open to the author; with one, the form asks for no section. A
press's "Submissions" page has no such sentence.

## Impact

- **Lost** Nothing: only the choice the link promises, which the
  author makes again in the form.
- **Who** A signed-in author who starts a submission from a section's
  link on About › "Submissions", on a journal or server with two or more
  sections open to them.
- **Way round** Pick the section under "Section" in the form.

Low: the link misleads and costs one extra click.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS or OPS.
- OJS: nothing more. The journal has "Articles", with the policy "Section
  default policy", and "Reviews", with no policy; both are open to
  authors.
- OPS: the server has one section, "Preprints", so a second one is made
  first (step 0), since a form with one section shows no "Section"
  choice.

0. OPS only: sign in as `rvaca`, open Settings › Server › "Sections",
   press "Create Section", type Title "Methods u17a", Abbreviation
   "U17A" and URL path "methods-u17a", press "Save", and sign out.
1. Sign in as `ccorino` (an Author).
2. Open About › "Submissions"
   (`/index.php/publicknowledge/en/about/submissions`).
3. Under the "Articles" ("Preprints") policy, read "Make a new
   submission to the Articles section." and press "Articles"
   ("Preprints"). The address is
   `/index.php/publicknowledge/en/submission?sectionId=1`.

**Expected.** "Make a Submission" opens with "Articles" ("Preprints")
chosen under "Section", and that section's policy shown under the
choice.

**Observed.** "Make a Submission" opens with "Section" ("Submissions must
be made to one of the journal's sections."; on OPS "Preprints must be
submitted to one of the server's sections.") listing "Articles" and
"Reviews" ("Preprints" and "Methods u17a"), none chosen, and no policy
shown.

## Cause

The section's link in "Make a new submission to the … section." carries the section: OJS and OPS
`templates/frontend/pages/submissions.tpl` print `{url page="submission"
sectionId=$section->getId()}`. Nothing on the start page reads that
parameter. `SubmissionHandler::start()` (OJS and OPS
`pages/submission/SubmissionHandler.php`) builds the form from the
sections the user may submit to alone:
`new StartSubmission($apiUrl, $context, $userGroups, $sections)`. The
apps' `StartSubmission` (`classes/components/forms/submission/StartSubmission.php`)
then gives the "Section" radio field `'value' => ''`, so no section is
ever chosen.

The old wizard honoured it: on 3.3,
`SubmissionSubmitStep1Form::display()` assigned
`$request->getUserVar('sectionId')` and the section list preselected it.
The submission wizard rewrite for `pkp/pkp-lib#7191` replaced that
form with `StartSubmission`. The same rewrite updated the link's address
(from `op="wizard"` to `page="submission"`, keeping `sectionId`) in
pkp-lib's template, where the link lived until `pkp/pkp-lib#8786` moved
it into the OJS and OPS templates in 2023. The new form never read it.

Reach:

- That link on About › "Submissions" is the only screen that sends
  `sectionId` to the start page (searched in the three apps' templates
  and code; seen on screen on OJS and OPS).
- The deprecated `PKPSubmissionHandler::wizard()`, which redirects 3.3's
  `submission/wizard` addresses, drops `sectionId` too, so a 3.3-era link
  to a section's submission (in a journal's own pages) lands the same way
  (code).
- OMP: a press's "Submissions" page shows no section policies, so there
  is no such link (seen on screen).

## Proposed fix

Read the parameter where the form is built and preselect it when it is
one of the sections offered. In OJS and OPS
([fix-a1-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/fix-a1-ojs.diff),
[fix-a1-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/fix-a1-ops.diff);
the two differ only in context lines):

```diff
--- a/pages/submission/SubmissionHandler.php
+++ b/pages/submission/SubmissionHandler.php
-        $form = new StartSubmission($apiUrl, $context, $userGroups, $sections);
+        $form = new StartSubmission($apiUrl, $context, $userGroups, $sections, (int) $request->getUserVar('sectionId'));
--- a/classes/components/forms/submission/StartSubmission.php
+++ b/classes/components/forms/submission/StartSubmission.php
-    public function __construct(string $action, Context $context, Enumerable $userGroups, array $sections)
+    public function __construct(string $action, Context $context, Enumerable $userGroups, array $sections, ?int $sectionId = null)
 ...
-                'value' => '',
+                'value' => collect($sections)->contains(fn (Section $section) => (int) $section->getId() === $sectionId) ? $sectionId : '',
```

The preselection belongs to the app's start page: `SubmissionHandler::start()`
already decides which sections the user may choose, and `StartSubmission`
owns the "Section" field, which pkp-lib's base form does not have. This
is what 3.3 did, and it keeps the rewrite's intent: the link was kept,
only its reading was lost. A section the user may not submit to
(inactive, or restricted to editors) is not in `$sections`, so asking for
it chooses nothing, as today. Nothing else calls the apps'
`StartSubmission` (OMP has its own class, with no sections). The diff
applies as written to 3.5, whose files are the same; on 3.4
`StartSubmission.php` is the same and `SubmissionHandler.php` differs
elsewhere, so the hunk applies with an offset.

Tried on `main`, OJS and OPS: the link then opened "Make a Submission"
with "Articles" ("Preprints") chosen and its policy ("Section default
policy") shown below. Two neighbouring cases read the same with the fix
and without it: "Make a new submission" at the top of the page opened the
form with no section chosen, and the link under an inactive section's
policy (shown to the editorial roles, a separate report) opened it on the
one other section, not on the inactive one.

**Alternatives**

- Drop `sectionId` from the link: the sentence stops promising a
  choice, but the author still picks the section by hand.
- Read the address in ui-library's start page: the server already builds
  the form's values, so it would split one decision across two layers.

**What goes with it**

- Optionally, 3.3-era `submission/wizard?sectionId=…` links could
  preselect too: `PKPSubmissionHandler::wizard()` would pass `sectionId`
  on, which `Repo::submission()->getUrlSubmissionWizard()` cannot take
  today (a new parameter there, or the address built in `wizard()`). That
  is a pkp-lib change, a third repository the effort below does not
  count.
- A test: an e2e scenario in U17 (the section link opens the form with
  the section chosen) or a unit test on `StartSubmission`'s field value.

This is a proposal; the team decides.

Medium: the same few lines, in two files, must go into two app
repositories, OJS and OPS; in one repository it would be small.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/lib.js),
  takes these steps on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-link-chooses-no-section/walk.js`
  (the full run goes on to the steps of the A7/A8 report; `… walk.js a1`
  takes these steps alone, `… walk.js nb-a1` the two neighbouring cases
  of the Proposed fix).
- The fix was tried with `node bin/try-fix.js apply …/fix-a1-<app>.diff
  <app>` on OJS and OPS, then `walk.js a1` and `walk.js nb-a1`, then
  reverted, and `walk.js nb-a1` again without it.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets c657990
  (2026-10-01).
- Tips:

  | Line | OJS | OPS |
  |---|---|---|
  | `main` | b84f8e2e44 (lib/pkp ddd8ab243a) | c8af945bb7 (lib/pkp 3dc90c81a6) |
  | `stable-3_5_0` | 091fb65453 (lib/pkp cf3f984335) | 38b61882d3 (lib/pkp cf3f984335) |
  | `stable-3_4_0` | 75cc2d488b (lib/pkp 32b0f4b4af) | acd8ae704b (lib/pkp 32b0f4b4af) |
  | `stable-3_3_0` | ac77c9fb35 (lib/pkp f6ab331645) | c5532e2161 (lib/pkp f6ab331645) |
- Code reads: on every version, the section link in `submissions.tpl` and
  how the start page builds its form. `main`, 3.5 and 3.4:
  `SubmissionHandler::start()` and `StartSubmission` in OJS and OPS,
  the same code on all three (`'value' => ''`). 3.3: OJS and OPS
  `SubmissionSubmitStep1Form::display()` assigns
  `$request->getUserVar('sectionId')`, and OJS `submission/form/section.tpl`
  renders the list with `selected=$sectionId`.
- Trace: `git blame` on `StartSubmission.php`'s `'value' => ''` gives
  ojs 6358d611e3 and ops 8fd2c6d834 (Nate Wright, "`pkp/pkp-lib#7191`
  Implement new submission wizard"), merged as `pkp/ojs#3638` and
  `pkp/ops#411` with `pkp/pkp-lib#8495` (e79fc21e20, which rewrote the
  link's address). Nate Wright authored the commits; asmecher opened
  the three PRs, merged on 2022-12-14.
- Tracker search (2026-10-02): pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library, by symptom and by `StartSubmission sectionId`. Nothing
  about this link.
- Unverified: MySQL not walked; the `wizard()` redirect was read in the
  code, not driven.
