# A press's "Author Guidance" settings label the copyright box "Copyright notice", not "Copyright Notice"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; the box sits on the "Author Guidelines" side tab there)
- **Introduced** not traced; present since at least [16111b123a](https://github.com/pkp/omp/commit/16111b123a86d44e1f4faf120c4ca3c85ff1f0fd) (2008-10-20)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#omp1)
- **Checked** 2026-10-04, each branch's latest commit (OMP's in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's Settings › Workflow › "Submission" › "Author Guidance", the
copyright box is labelled "Copyright notice". A journal and a preprint
server label the same box "Copyright Notice". The press's public About ›
"Submissions" page heads the notice "Copyright Notice" too.

Every press manager who opens "Author Guidance" with the interface in
English sees it. Other languages show OMP's own translation of the
label, which this does not touch; the fix is to the English text.

## Impact

- **Lost**: nothing; the box saves and the notice shows where it
  should.
- **Who**: users with a manager-level role on a press (Press manager,
  Press editor) on Settings › Workflow › "Author Guidance".
- **Way round**: none needed.

Low: a label's letter case only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press").
- The dataset's press has no copyright notice. Step 4 saves one,
  because the public About › "Submissions" page shows its "Copyright
  Notice" part only while a notice is set.

Steps:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`).
3. Press the side tab "Author Guidance" and read the box labels.
4. In the copyright box type `u58f copyright notice: authors keep the
   copyright.` and press "Save": "Saved".
5. Open "About" › "Submissions"
   (`/index.php/publicknowledge/en/about/submissions`) and read the
   heading over that text.

**Expected**: at step 3 the box is labelled "Copyright Notice", like the
heading at step 5.

**Observed**: the labels at step 3 read, in order:

```
Author Guidelines · Before you begin · Submission Checklist · Upload Files · Contributors · Details · For the Editors · Review and Submit · Copyright notice · For Reviewer Suggestion
```

At step 5 the headings read "Author Guidelines", "Submission Preparation
Checklist", "Copyright Notice" and "Privacy Statement".

## Cause

The label is the locale key `manager.setup.copyrightNotice`, which
pkp-lib's `SubmissionGuidanceSettings` form reads
(`classes/components/forms/submission/SubmissionGuidanceSettings.php`,
line 110). pkp-lib's `locale/en/manager.po` words it "Copyright Notice".
OMP's own `locale/en/manager.po` defines the same key again (the
`msgid` on line 323), and the app's string wins over pkp-lib's:

```po
msgid "manager.setup.copyrightNotice"
msgstr "Copyright notice"
```

The key was OMP's own when the string was written. pkp-lib took the key
over, worded "Copyright Notice", when `pkp/pkp-lib#3594` (5f3be929e6,
2018-10-23) moved the context settings forms into pkp-lib. OMP's entry
was left in place, and it still overrides pkp-lib's. The About ›
"Submissions" page heading uses another key, `about.copyrightNotice`,
which OMP words "Copyright Notice".

Reach:

- The sample copyright page (`information/sampleCopyrightWording`,
  linked from no screen) takes its title from the same key: "Copyright
  notice | Public Knowledge Press" on a press. Checked on screen.
- No other string in OMP's English locale files redefines a pkp-lib
  key with only a change of letter case (every key compared). Checked in
  the code.
- Other languages: OMP's 28 translations of the key are their own
  entries, which the English fix leaves alone; in French (Canada) the
  box reads "Avis de droit d'auteur", with the fix in and out. Checked
  on screen (French) and in OMP's `locale/*/manager.po`.

## Proposed fix

Word OMP's string as pkp-lib does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-copyright-notice-label-lowercase/fix.diff)):

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -321,7 +321,7 @@
 msgstr "The Copyedit Instructions will be made available to Copyeditors, Authors, and Section Editors in the Submission Editing stage. Below is a default set of instructions in HTML, which can be modified or replaced by the Press Manager at any point (in HTML or plain text)."
 
 msgid "manager.setup.copyrightNotice"
-msgstr "Copyright notice"
+msgstr "Copyright Notice"
 
 msgid "manager.setup.coverage"
 msgstr "Coverage"
```

Tried on OMP `main`: step 3 then shows "Copyright Notice", and the
sample copyright page's title became "Copyright Notice | Public
Knowledge Press".

**Alternatives**:

- Remove OMP's English entry so pkp-lib's applies: no duplicate is left
  to drift. A consistent clean-up would remove OMP's 28 translations of
  the key too, so that each language takes pkp-lib's; that is a wider
  change than this label needs.

**What goes with it**:

- Backport: the diff applies as written to `stable-3_5_0` (the `msgid`
  on line 323 there too). On `stable-3_4_0` the string sits at lines
  314–315 and the diff applies with an offset; on `stable-3_3_0` it sits
  at 316–317 of `locale/en_US/manager.po`, so the path changes as well.
- Guard: an e2e check of the "Author Guidance" box labels on the three
  apps (a **Planned** item in spec U58).

Small: one string in one OMP locale file.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-copyright-notice-label-lowercase/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-copyright-notice-label-lowercase/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/press-copyright-notice-label-lowercase/walk.js`.
  With `WALK_MODE=nb` it reads, instead of the steps and saving nothing,
  the box's label in French (Canada) and the sample copyright page's
  title, which were compared with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). No request
  failed and no page script failed.
- OMP's latest commits: `main` 3b0ecf794c, `stable-3_5_0` 9c5e24246c,
  `stable-3_4_0` 0aec65441f, `stable-3_3_0` 8e72fc8836.
- Code reads: OMP's and pkp-lib's English `manager.po` on the four
  branches (OMP "Copyright notice", pkp-lib "Copyright Notice" on each);
  the form that reads the key, pkp-lib's `SubmissionGuidanceSettings` on
  `main`, 3.5 and 3.4 and `PKPAuthorGuidelinesForm` on 3.3; OMP's
  `pages/information/InformationHandler.php` (the sample page's title);
  OMP's `locale/*/manager.po` for the translations; `git log -S` on
  OMP's string (back to its first revision) and on pkp-lib's use of the
  key (5f3be929e6).
