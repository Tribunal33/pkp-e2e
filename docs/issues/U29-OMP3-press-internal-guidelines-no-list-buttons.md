# A press's "Internal Review Guidelines" box has no list or quote buttons, unlike the external one

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#5237` and `pkp/omp#723` for `pkp/pkp-lib#4890` · [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a) · 2019-10-31 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U29 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#omp3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press, a list or quote can be typed into "External Review
Guidelines" but not into "Internal Review Guidelines". On Settings ›
Workflow › "Review" › "Reviewer Guidance", the internal box's toolbar
offers Bold, Italic, Superscript, Subscript and Insert/edit link only,
while "External Review Guidelines" and "Competing Interests" on the same
form also offer Blockquote, Bullet list and Numbered list.

A manager cannot make a list or a quote in the internal guidelines on
screen; pasting a list from another document works round it.

## Impact

- **Lost**: nothing. Typed lines stay plain paragraphs; a pasted list is
  saved as a list, and an internal reviewer sees it as a list: the
  review's step 2 prints the saved guidelines unescaped (read in the
  code).
- **Who**: whoever writes the internal reviewers' guidelines: a Press
  Manager, or a user in a manager-level group such as the dataset's
  "Press editor", the groups that reach Settings › Workflow.
- **Way round**: paste the list from a word processor, or write the
  items as plain lines.

Low: the guidelines are saved and reach the internal reviewers with
their lists; only the box's list and quote buttons are missing. It would
be medium if a pasted list were stripped on save.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (`publicknowledge`, "Public
  Knowledge Press"), whose guidance boxes are empty.

Steps:

1. Sign in as `dbarnes` (Press editor).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/management/settings/workflow`).
3. Press the "Review" tab, then the side tab "Reviewer Guidance".
4. Read the toolbar of "Internal Review Guidelines", the first box.
5. Read the toolbars of "External Review Guidelines" and "Competing
   Interests".
6. In "External Review Guidelines", press "Bullet list" and type
   `u29w4 external one`, Enter, `u29w4 external two`.
7. In "Internal Review Guidelines", look for "Bullet list" and type
   `u29w4 internal one`, Enter, `u29w4 internal two`.
8. Copy a two-item bulleted list (`u29w4 pasted one`, `u29w4 pasted
   two`) from another document. In "Internal Review Guidelines", select
   the box's content, then paste.
9. Press "Save" and reload the page, back on "Review" › "Reviewer
   Guidance". Read both boxes, and the saved values in the database
   (`press_settings`, `setting_name` `internalReviewGuidelines` and
   `reviewGuidelines`, locale `en`).

**Expected**: the three boxes offer the same toolbar (Bold, Italic,
Superscript, Subscript, Insert/edit link, Blockquote, Bullet list,
Numbered list), and step 7 makes a list as step 6 does.

**Observed**: the toolbars read, by their buttons' names:

```
Internal Review Guidelines:  Bold, Italic, Superscript, Subscript, Insert/edit link
External Review Guidelines:  Bold, Italic, Superscript, Subscript, Insert/edit link, Blockquote, Bullet list, Numbered list
Competing Interests:         Bold, Italic, Superscript, Subscript, Insert/edit link, Blockquote, Bullet list, Numbered list
```

Step 6 makes a bulleted list. In step 7 there is no "Bullet list"
button, and the two lines stay two plain paragraphs. The pasted
list in step 8 stays a list. After "Save" and the reload both boxes
show their lists, and `press_settings` holds (line breaks removed):

```
internalReviewGuidelines: <ul><li>u29w4 pasted one</li><li>u29w4 pasted two</li></ul>
reviewGuidelines:         <ul><li>u29w4 external one</li><li>u29w4 external two</li></ul>
```

## Cause

OMP's `APP\components\forms\context\ReviewGuidanceForm::__construct()`
(`classes/components/forms/context/ReviewGuidanceForm.php`, lines
31-35) adds `internalReviewGuidelines` as a `FieldRichTextarea` with no
`toolbar` or `plugins`, so it takes the field's defaults
(`FieldRichTextarea::$toolbar = 'bold italic superscript subscript |
link'`, `$plugins = ['link']`). The parent it extends,
`PKP\components\forms\context\PKPReviewGuidanceForm`, gives its two
boxes of the same kind, `reviewGuidelines` and `competingInterests`,
`'toolbar' => 'bold italic superscript subscript | link | blockquote
bullist numlist'` and `'plugins' => ['link','lists']`. The three boxes
hold the same kind of text for reviewers, so the press's own box should
follow its siblings.

The internal box was added with the form in 2018 (`pkp/pkp-lib#3594`),
when no box set a toolbar. `pkp/pkp-lib#4890` ("Selectively expose
TinyMCE controls") then gave the shared boxes their list and quote
buttons in pkp-lib, and its OMP companion ("Add missing controls to
tinymce fields") updated OMP's own Appearance and Masthead forms but not
this one.

Reach:

- Only OMP: OJS and OPS have no internal review box; their two boxes
  come from the shared form (read in the code).
- What the internal reviewers see is unchanged: the review's step 2
  prints the saved text as it is (`PKPReviewerReviewStep2Form` reads
  `internalReviewGuidelines` for an internal review, `step2.tpl` prints
  `{$reviewerGuidelines}`), so a pasted list already reaches them as a
  list (read in the code).
- No other app subclass adds a rich-text box beside a shared sibling
  with a fuller toolbar: the other app-level `FieldRichTextarea`s are
  "Summary of Changes" in OMP's `CatalogEntryForm` and the OJS and OPS
  `IssueEntryForm`s, which use the default toolbar in all three apps
  (read in the code).

## Proposed fix

Give the internal box the toolbar and plugins its siblings use, in OMP's
form
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-internal-guidelines-no-list-buttons/fix.diff)):

```diff
             'label' => __('manager.setup.internalReviewGuidelines'),
             'value' => $context->getData('internalReviewGuidelines'),
             'isMultilingual' => true,
+            'toolbar' => 'bold italic superscript subscript | link | blockquote bullist numlist',
+            'plugins' => ['link','lists'],
         ]), [FIELD_POSITION_BEFORE, 'reviewGuidelines']);
```

This copies the two lines `PKPReviewGuidanceForm` sets on
`reviewGuidelines` and `competingInterests`, which is what
`pkp/pkp-lib#4890` set out to do for boxes whose text is instructions.

Tried on OMP `main`: the walk showed eight buttons on all three boxes,
and step 7 made a bulleted list. A check that the fix leaves the two
shared boxes and the form's order alone (plain text typed into each of
the three boxes, "Save", reload) kept the boxes' order, the two shared
boxes' eight buttons and each text in its own setting, with the fix in
and out.

**Alternatives**

- Read the toolbar from the parent's `reviewGuidelines` field
  (`$this->getField('reviewGuidelines')->toolbar`): keeps the three in
  step if the shared toolbar changes, but no other form does this, and
  it ties the press's box to a field it only sits beside.

**What goes with it**

- No data repair: stored guidelines are unchanged.
- No API or hook change: the context API stores the setting as before.
- Backport: only 3.5 takes `fix.diff` as it is. On 3.4 the diff does
  not apply (`helpTopic` and `helpSection` sit between `label` and
  `value`), and 3.4's ui-library declares `FieldRichTextarea`'s
  `plugins` prop a required String, so an array would draw a Vue
  warning and drop `paste`. 3.4 adds these two lines after
  `'isMultilingual' => true,` in `ReviewGuidanceForm.php`, as its
  siblings there have them:

  ```php
              'toolbar' => 'bold italic superscript subscript | link | blockquote bullist numlist',
              'plugins' => 'paste,link,lists',
  ```

  3.3 adds the same two lines, tab-indented, in
  `ReviewGuidanceForm.inc.php`:

  ```php
  				'toolbar' => 'bold italic superscript subscript | link | blockquote bullist numlist',
  				'plugins' => 'paste,link,lists',
  ```
- A guard: spec U29's Fields "Reviewer Guidance" in the e2e campaign
  (the three toolbars alike), or a PHPUnit check that the three fields'
  `toolbar` configs match.

Small: two lines in one OMP class, following the shared form's own
lines.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-internal-guidelines-no-list-buttons/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/press-internal-guidelines-no-list-buttons/walk.js`
  (`MODE=nb` in front runs the neighbour check alone). It reads the
  toolbars by the buttons' `aria-label`s, and the boxes' content from
  the editors and from `press_settings`. Step 8's paste is a browser
  paste event carrying the list as `text/html`, as a copy from a word
  processor does.
- The fix, tried 2026-10-04 on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-internal-guidelines-no-list-buttons/fix.diff omp`.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [1a5552c](https://github.com/pkp/datasets/commit/1a5552c0b15562474f3ac499495e63031a4c09fb)
  (2026-10-04); no server error, script error or browser dialog was
  recorded:
  - main: OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c570).
  - stable-3_5_0: OMP 9c5e24246c (lib/pkp cf3f984335, lib/ui-library
    d4e0188353). The same steps and the same result; the same
    `ReviewGuidanceForm` and `PKPReviewGuidanceForm` lines.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441f, pkp-lib at
  767353f4fe, ui-library at ee684b341b. `ReviewGuidanceForm.php` adds
  `internalReviewGuidelines` with no `toolbar`, so it takes
  `FieldRichTextarea::$toolbar` `'bold italic superscript subscript |
  link'`; `PKPReviewGuidanceForm.php` gives its two boxes the list and
  quote toolbar with `'plugins' => 'paste,link,lists'`, a string, which
  is what the backport must copy: ui-library's `FieldRichTextarea.vue`
  declares `plugins` as `{type: String, required: true}`.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc8836 and pkp-lib at
  ac3fa73402: the same three facts in the `.inc.php` files.
- Introduced: `git blame` on OMP's lines 31-35 stops at the PSR-12
  reformat (01088072a8); `git log -S internalReviewGuidelines` finds the
  field's addition in
  [88d8a48125](https://github.com/pkp/omp/commit/88d8a481256c2b8904647bba4694ad665614f087)
  (2018-12-21, `pkp/pkp-lib#3594`). `git log -S 'blockquote bullist
  numlist'` on `PKPReviewGuidanceForm` finds the siblings' toolbar in
  a09aa46d19 (`pkp/pkp-lib#5237`); its OMP companion
  [134ba833c8](https://github.com/pkp/omp/commit/134ba833c87133a32fb47db5d105825e52a6d75e)
  (`pkp/omp#723`) does not touch `ReviewGuidanceForm`.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched for
  "internal review guidelines", `internalReviewGuidelines`, "review
  guidelines bullet list" and `ReviewGuidanceForm`. `pkp/pkp-lib#4890`
  is the closed issue that brought the siblings' toolbar;
  `pkp/pkp-lib#13297` (an API endpoint for the guidelines) is about
  another thing.
- Read in the code, not driven: what an internal reviewer sees.
  `PKPReviewerReviewStep2Form::fetch()` reads `internalReviewGuidelines`
  for an internal review and `lib/pkp/templates/reviewer/review/step2.tpl`
  prints `<p>{$reviewerGuidelines}</p>` without an escape modifier (OMP
  overrides only `step1.tpl`), so a saved list reaches the reviewer as a
  list (main and 3.5).
- MySQL not checked (the fault is in the
  form's configuration, not the database).
