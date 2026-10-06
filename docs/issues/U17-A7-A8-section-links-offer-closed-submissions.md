# The "Submissions" page invites a submission to an inactive section, or while submissions are disabled

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code; "Disable Submissions" only)
- **Introduced** `pkp/pkp-lib#5966` and `pkp/ojs#2793` for `pkp/pkp-lib#5702` · [c7870a4b9e](https://github.com/pkp/pkp-lib/commit/c7870a4b9ebbca6d0b5ad0531af47585a8c3810f), [1fcb31f89f](https://github.com/pkp/ojs/commit/1fcb31f89f0dc13a1f00f500e43f4ac419212318) · 2020-05-22 and 2020-06-22, merged 2020-08-27 · Salman Murad (salmanm2003)
- **Upstream** `pkp/pkp-lib#10941` (closed; fixed on 3.3 only, by `pkp/pkp-lib#11440`), covering the inactive section's policy. The issue says 3.4 and `main` are not affected; they are, for the editorial roles its own steps sign in as, from whom the section list does not hide inactive sections.
- **Tracked in** spec U17 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a7), [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With "Disable Submissions" ticked, a signed-in Author reads "This
journal is not accepting submissions at this time." ("This server is not
accepting submissions at this time.") at the top of the "Submissions"
page, and "Make a new submission to the {section} section." under every
policy. Pressing a section's name, the link inside that sentence, opens
"Make a Submission" showing only "This journal is not accepting
submissions at this time. Visit the workflow settings to allow
submissions."

Whether or not submissions are disabled, a user signed in with an
editorial role also reads the policy of a section marked "Inactive",
with the same sentence under it. Pressing the section's name opens "Make
a Submission" without that section: the form offers only the other
sections. With one other section left, it asks for no section at all
and files the submission under that other section.

Visitors who are not signed in never see the sentence. A press's
"Submissions" page shows no section policies.

## Impact

- **Lost** With submissions disabled, the reader's time: the start form
  refuses, in words written for the journal's managers. From an inactive
  section's link, an editor's submission can land in a section they did
  not pick, with no choice shown.
- **Who** Every signed-in user of a journal or server with "Disable
  Submissions" ticked. With an inactive section that has a policy, the
  roles that may submit to every section: on a journal the Journal
  manager, Journal editor, Production editor, Section editor and Guest
  editor; on a server the Preprint Server manager and Moderator; and the
  Site administrator.
- **Way round** An author has nothing to submit to. An editor submits
  through an active section, or sets the section on the publication
  afterwards.

Low: nothing is submitted where the journal does not accept it, and the
wrong section is met only by editors who start from a section they have
closed, in a journal with one other open section, and who can change it
afterwards. What would raise it to medium: if no later step of the
wizard names the section (not checked).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS or OPS. The journal has
  "Articles", with the policy "Section default policy", and "Reviews",
  with no policy. The server has one section, "Preprints", with the
  policy "Section default policy".
- OPS: a second section, since the server never lets its last active
  section go inactive. Sign in as `rvaca`, open Settings › Server ›
  "Sections", press "Create Section", type Title "Methods u17a",
  Abbreviation "U17A" and URL path "methods-u17a", press "Save", and
  sign out.

Submissions disabled:

1. Sign in as `rvaca` (the manager). Open Settings › Workflow ›
   "Submission" › "Disable Submissions", tick "Disable Submissions" and
   press "Save". Sign out.
2. Sign in as `ccorino` (an Author) and open About › "Submissions"
   (`/index.php/publicknowledge/en/about/submissions`).
3. Under the "Articles" ("Preprints") policy, press "Articles"
   ("Preprints") in "Make a new submission to the Articles section.".
4. Sign out, sign in as `rvaca`, untick "Disable Submissions" and press
   "Save".

An inactive section:

5. Still as `rvaca`, open Settings › Journal (Server) › "Sections", tick
   "Inactive" on the "Articles" ("Preprints") row and press "OK".
6. Open About › "Submissions".
7. Under the "Articles" ("Preprints") policy, press "Articles"
   ("Preprints").

**Expected.** With submissions disabled (step 2), the notice and no
"Make a new submission to the … section." sentence. With "Articles"
inactive (step 6), no "Articles" policy, as for an author, or at least
no sentence inviting a submission to it.

**Observed.** Step 2: the notice "This journal is not accepting
submissions at this time." ("This server is not accepting submissions
at this time.") and, under the "Articles" ("Preprints") policy, "Make a
new submission to the Articles section." (`rvaca` reads the same). Step
3: "Make a Submission" showing only:

```
This journal is not accepting submissions at this time. Visit the workflow settings to allow submissions.
```

Step 6: the "Articles" ("Preprints") policy with "Make a new submission
to the Articles section." under it, below the invitation "Make a new
submission or view your pending submissions.". Step 7: "Make a
Submission" with no "Section" choice. The form holds "Reviews"
("Methods u17a"), the one section left, in a hidden `sectionId` field,
so "Begin Submission" files the submission there. Nothing on the page
shows it; the browser's developer tools show the field among the form's
inputs.

Control: `ccorino` reads no "Articles" ("Preprints") policy after step 5.

## Cause

Both ways of closing submissions came with `pkp/pkp-lib#5702`:
"Disable Submissions" for the whole journal and the "Inactive" box on a
section. That change taught the page's top notice to say so (today
`{if $sections|@count == 0 || $currentContext->getData('disableSubmissions')}`
in pkp-lib `templates/frontend/pages/submissions.tpl`). It left the
loop over the section policies alone, and the "Make a new submission to
the … section." sentence in it is still guarded by `{if
$isUserLoggedIn}` only. Today that loop is in OJS and OPS
`templates/frontend/pages/submissions.tpl`:

```smarty
{if $section->getLocalizedPolicy()}
    …
    {if $isUserLoggedIn}
        … about.onlineSubmissions.submitToSection … sectionId=$section->getId() …
```

Disabled submissions: nothing in the loop reads `disableSubmissions`,
while the start page (`templates/submission/start.tpl`) shows only
`manager.setup.disableSubmissions.notAccepting` when it is set.

Inactive sections: `AboutContextHandler::submissions()` lists the
sections with `excludeEditorOnly(!$canSubmitAll)`. `Collector` drops
restricted and inactive sections only when that flag is set, so for the
editorial roles (`$canSubmitAll`) inactive sections reach the template,
which prints their policy and the sentence. The start form takes its sections
from `PKPSubmissionHandler::getSubmitSections()`, which calls
`excludeInactive()` for everyone. The start form also ignores which
section a link asks for, active or not; that is a separate report,
[U17 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-A1-section-link-chooses-no-section.md). On 3.3 the template filtered inactive
sections out (`pkp/pkp-lib#10941`); that check was never carried to the
apps' templates on 3.4 and `main`, where the collector hides inactive
sections from authors but not from the editorial roles.

Reach:

- OJS and OPS each carry an identical copy of the loop (both seen on
  screen). OMP's page has none.
- A section restricted to editors: the editorial roles may submit to
  it, so its sentence is right for them (seen on screen).
- A theme that overrides `submissions.tpl` and copies the loop carries
  the same fault (not checked).

## Proposed fix

In OJS and OPS `templates/frontend/pages/submissions.tpl`
([fix-a7a8-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/fix-a7a8-ojs.diff),
[fix-a7a8-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/fix-a7a8-ops.diff)):

```diff
-        {if $section->getLocalizedPolicy()}
+        {if !$section->getIsInactive() && $section->getLocalizedPolicy()}
             <div class="section_policy">
                 <h2>{$section->getLocalizedTitle()|escape}</h2>
                 {$section->getLocalizedPolicy()}
-                {if $isUserLoggedIn}
+                {if $isUserLoggedIn && !$currentContext->getData('disableSubmissions')}
```

The first changed line is the 3.3 fix of `pkp/pkp-lib#10941`, which decided that
an inactive section's policy does not belong on the page; the second
asks the same question the top notice and the start page already ask.
Both sit in the loop that prints the sentence, which the two apps own since
`pkp/pkp-lib#8786` moved it out of pkp-lib. The policies themselves stay
on the page while submissions are disabled: only the invitation goes.
The [A1 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-A1-section-link-chooses-no-section.md)'s fix preselects a section only when it is one the
start form offers, so with both fixes in, no link preselects an inactive
section.

Tried on `main`, OJS and OPS. With submissions disabled, the author and
the manager read the notice and the "Articles" ("Preprints") policy with
no sentence under it. With "Articles" ("Preprints") inactive, the
manager's page showed no "Articles" ("Preprints") policy. Two
neighbouring cases read the same with the fix and without it. With
submissions open, the author and the manager kept the sentence. With the
section restricted to editors instead of inactive, the manager kept its
policy and sentence, whose link opened the form offering it, and the
author saw neither.

**Alternatives**

- `->excludeInactive()` in `AboutContextHandler::submissions()`
  (pkp-lib): covers every theme at once, but adds a third repository,
  and the "Disable Submissions" half still needs the templates.
- Keep an inactive section's policy for the editorial roles and drop
  only its sentence: the policy stays readable to editors, against what
  `pkp/pkp-lib#10941` settled for 3.3.
- Hide every policy while submissions are disabled: the policies still
  inform readers; only the invitation is wrong.

**What goes with it**

- Backport: 3.5 and 3.4 have the same templates, so the diff applies as
  written. 3.3 needs only the second change, in pkp-lib's
  `templates/frontend/pages/submissions.tpl`.
- A test: an e2e scenario that reads the page with "Disable
  Submissions" ticked and with an inactive section.

This is a proposal; the team decides.

Medium: two conditions in one template, but in two app repositories,
OJS and OPS; in one repository it would be small.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-link-chooses-no-section/lib.js),
  takes these steps on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-link-chooses-no-section/walk.js`
  (the full run takes the [A1 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-A1-section-link-chooses-no-section.md)'s steps first; `… walk.js
  a8,a7` takes these steps alone; `… walk.js nb-a8,nb-a7` the two
  neighbouring cases of the Proposed fix: the page with submissions open
  as `ccorino` and `rvaca`, then "Articles" ("Preprints") restricted to
  editors instead of inactive (the section window's `editorRestricted`
  box on OJS, `editorRestriction` on OPS), read as `rvaca`, its link
  pressed, and read as `ccorino`). The hidden `sectionId` of step 7 was
  read from the page's form inputs by the script, not on screen; that
  "Begin Submission" posts it is read in the code (`StartSubmission`
  adds the one offered section as a hidden field), not walked.
- The fix was tried with `node bin/try-fix.js apply …/fix-a7a8-<app>.diff
  <app>` on OJS and OPS, then `walk.js a8,a7` and `walk.js nb-a8,nb-a7`,
  then reverted, and `walk.js nb-a8,nb-a7` again without it.
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
- Code reads: on every version, the policy loop of `submissions.tpl`,
  the notice above it and `AboutContextHandler::submissions()`. `main`, 3.5
  and 3.4: the loop in the OJS and OPS templates, the same on the three
  (`{if $section->getLocalizedPolicy()}`, `{if $isUserLoggedIn}`);
  `Collector::excludeEditorOnly()` (inactive dropped only with the
  flag); `getSubmitSections()` (`excludeInactive()`); `start.tpl`. 3.3:
  the loop in pkp-lib's template, with `!$section->getIsInactive()` since
  ed82b4e38e (`pkp/pkp-lib#10941`) and the sentence still on
  `{if $isUserLoggedIn}`; the 3.3 wizard (`submission/form/index.tpl`)
  shows the same not-accepting message when submissions are disabled.
- Trace: `git blame` on the sentence's `{if $isUserLoggedIn}` gives
  b8f5b7c0d5 (OJS) and 05d04b8384 (OPS), the move out of pkp-lib for
  `pkp/pkp-lib#8786` (2023); before it, pkp-lib 10d7a9c84b (the same
  move) and ca76d99f2f (`pkp/pkp-lib#2638`, 2018), which added the
  sentence when a section could not be closed. `git log -S` on the
  notice's check: pkp-lib c7870a4b9e (2020-05-22, "Add archiving
  sections and disabling submissions feature") added it, as
  `!$submissionsEnabled`; 2d37200d5f only changed its message key, and
  e38f4aaf4c and 601e61a102 renamed it to `disableSubmissions`; the
  combined condition of today is 23a4051c4f (`pkp/pkp-lib#6668`, 2021).
  The `is_inactive` column came in ojs 1fcb31f89f (2020-06-22, "#5702
  Add disabling submissions and deactivating sections feature"). All are
  Salman Murad's commits for `pkp/pkp-lib#5702`, merged with
  `pkp/pkp-lib#5966` and `pkp/ojs#2793` on 2020-08-27; none touched the
  sentence.
- Tracker search (2026-10-02) of pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library, by symptom and by `submitToSection` and
  `AboutContextHandler`: only `pkp/pkp-lib#10941`, nothing on the
  disabled-submissions half.
- Unverified: whether the wizard's later steps name the section the
  hidden field carried in step 7 (not walked; with one section offered,
  `SubmissionHandler::getSubmittingTo()` names no section). MySQL not
  walked.
