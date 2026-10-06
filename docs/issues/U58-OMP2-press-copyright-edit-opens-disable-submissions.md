# On a press's public "Submissions" page, "Edit" beside "Copyright Notice" opens "Disable Submissions", not "Author Guidance"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the link's "Author Guidelines" tab holds the box there)
- **Introduced** on 3.4, all apps: `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · 2022-12-14 · Alec Smecher (asmecher), which moved the box to "Author Guidance" and left the link behind;
  on `main` and 3.5, OMP: `pkp/omp#1671` for `pkp/pkp-lib#10195` · [05672bbb2e](https://github.com/pkp/omp/commit/05672bbb2e6cffcc2d5524126e623a68c843a78d) · 2024-08-12 · Kaitlin Newson (kaitlinnewson), whose copy of the shared template kept the old link after pkp-lib had fixed it
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#omp2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press's public "Submissions" page (About › Submissions) shows managers
an "Edit" link beside each section's heading. "Edit" beside "Author Guidelines" and
beside "Submission Preparation Checklist" opens Settings › Workflow ›
"Submission" › "Author Guidance", where those texts are written. So a
manager who clicks "Edit" beside "Copyright Notice" expects the same
side tab, which holds the "Copyright notice" box. Instead the
"Submission" tab opens on "Disable Submissions".

The link shows only once the press has a copyright notice, since the
"Copyright Notice" section and its "Edit" appear only then. On 3.4,
journals and preprint servers show the same.

## Impact

- **Lost**: nothing; one extra click on the right side tab.
- **Who**: users with a manager-level role on a press (Press manager,
  Press editor, Production editor) who edit the copyright notice from
  the "Submissions" page; on 3.4 also journal and preprint server
  managers.
- **Way round**: select "Author Guidance" on the page that opens.

Low: a link that lands on the wrong side tab, with the right one a click
away.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press").
- The dataset's press has no copyright notice, so step 3 saves one.

Steps:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Workflow › "Submission" › "Author Guidance".
3. In "Copyright notice" type `u58e copyright notice: authors keep the
   copyright.` and click "Save": "Saved".
4. Open "About" › "Submissions"
   (`/index.php/publicknowledge/en/about/submissions`).
5. Click "Edit" beside "Author Guidelines": Workflow Settings opens on
   "Submission" › "Author Guidance".
6. Go back to "Submissions" and click "Edit" beside "Copyright Notice".

**Expected**: as in step 5, Workflow Settings opens on "Submission" ›
"Author Guidance", the side tab that holds the "Copyright notice" box
(the link pointing to `…/management/settings/workflow#submission/instructions`).

**Observed**: the link points to
`…/management/settings/workflow#submission/authorGuidelines`. Workflow
Settings opens with "Submission" › "Disable Submissions" selected, and
the address then reads `…/management/settings/workflow#submission`. The
panel shows:

```
Disable Submissions
Prevent users from submitting new articles to the press. Submissions can be disabled for individual press series on the press series settings page.
Disable Submissions
Save
```

On a journal and a preprint server, the same steps open "Author
Guidance" at step 6.

## Cause

OMP overrides the shared "Submissions" page template with its own copy,
`templates/frontend/pages/submissions.tpl`. Line 66 gives the copyright
notice's "Edit" link the anchor `submission/authorGuidelines`:

```smarty
{include file="frontend/components/editLink.tpl" page="management" op="settings" path="workflow" anchor="submission/authorGuidelines" sectionTitleKey="about.copyrightNotice"}
```

Workflow Settings (`lib/pkp/templates/management/workflow.tpl`) has no
side tab `authorGuidelines`: the copyright notice sits in
`instructions` ("Author Guidance"), the tab the guidelines' and
checklist's links on lines 42 and 52 name. ui-library's `Page.vue`
emits `open-tab` for each part of the hash, and no side tab answers to
`authorGuidelines`, so the side tabs stay on their first,
`disableSubmissions`.

The anchor dates from 3.3, when the copyright notice sat on an "Author
Guidelines" side tab (`authorGuidelines`) and the checklist on its own
(`submissionChecklist`). `pkp/pkp-lib#8495` (e79fc21e20, for the new
submission wizard, `pkp/pkp-lib#7191`) merged both tabs into "Author
Guidance" (`instructions`) without moving the "Edit" links, and
`pkp/pkp-lib#8051` (85f17b4ac4, 2022-12-14) then moved the guidelines'
and checklist's links but not the copyright notice's. That is the 3.4
release.

pkp-lib fixed the copyright notice's link on `main` in 8859cc9589
(2024-05-14, merged through `pkp/pkp-lib#9941` on 2024-06-11). Two
months later `pkp/omp#1671` (05672bbb2e) gave OMP its own copy of the
template, so that a press with no active series still shows the
invitation to submit rather than the not-accepting-submissions message
(line 23), and the copy carries the old anchor. Besides that condition
and this anchor, the copy differs from the shared template only in its
copyright years and a doc comment.

Reach:

- The other "Edit" links on OMP's page (guidelines, checklist, privacy
  statement): correct anchors, checked on screen.
- OJS and OPS on `main` and 3.5: their templates include the shared
  one, which has `submission/instructions`; checked on screen.
- Every other `editLink.tpl` include in `lib/pkp/templates` and the
  three apps' templates (`about`, `contact`, `information`,
  `editorialHistory`, `editorialMastheadDisabled`, `announcements`):
  each anchor names a tab that exists; checked in the code on `main`.
- 3.4: 8859cc9589 never reached pkp-lib's `stable-3_4_0`, so the shared
  template there still has `submission/authorGuidelines` on a
  Workflow page with `instructions` and no `authorGuidelines`; OJS and
  OPS include it and OMP's 3.4 copy (6f53512e6) has the same line.
  Checked in the code.

## Proposed fix

Point OMP's link at the side tab that holds the box, as the shared
template and the two links above it do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-copyright-edit-opens-disable-submissions/fix.diff)):

```diff
--- a/templates/frontend/pages/submissions.tpl
+++ b/templates/frontend/pages/submissions.tpl
@@ -63,7 +63,7 @@
 		<div class="copyright_notice">
 			<h2>
 				{translate key="about.copyrightNotice"}
-				{include file="frontend/components/editLink.tpl" page="management" op="settings" path="workflow" anchor="submission/authorGuidelines" sectionTitleKey="about.copyrightNotice"}
+				{include file="frontend/components/editLink.tpl" page="management" op="settings" path="workflow" anchor="submission/instructions" sectionTitleKey="about.copyrightNotice"}
 			</h2>
 			{$currentContext->getLocalizedData('copyrightNotice')}
 		</div>
```

Tried on OMP `main`: the steps then open "Author Guidance" with the
"Copyright notice" box at step 6. The page's other three "Edit" links
landed on the same tabs with the fix in and out.

This keeps what `pkp/omp#1671` was for: the override's condition for
the not-accepting-submissions message is untouched.

**Alternatives**:

- Drop OMP's override and let the shared template's condition for the
  not-accepting-submissions message serve a press (for example a flag the handler assigns, in place of
  `$sections|@count == 0`), so the copy cannot drift again: the better
  end state, but a change in pkp-lib and OMP and a behavior change to
  check on all three apps; worth it only if the team wants the override
  gone for other reasons.

**What goes with it**:

- No stored data to repair; no API or plugin hook touched.
- 3.5: the same one line applies as written to `stable-3_5_0`.
- 3.4 (beyond the 3.5 LTS): it would also need 8859cc9589 in pkp-lib's
  `stable-3_4_0` for OJS and OPS.
- Guard: an e2e check that "Edit" beside each section of the "Submissions"
  page opens the side tab holding that section's box, on the three apps (a
  **Planned** item in spec U58).

Small: one anchor in one OMP template, and the e2e check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-copyright-edit-opens-disable-submissions/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-copyright-edit-opens-disable-submissions/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/press-copyright-edit-opens-disable-submissions/walk.js`;
  `WALK_MODE=nb` runs the neighbour check (as `rvaca`, "Edit" beside
  "Author Guidelines", "Submission Preparation Checklist" and "Privacy
  Statement", with no copyright notice saved). The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, the walk and the
  neighbour check run, then reverted and the neighbour check run again.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). 3.5 showed the
  same at step 6 (OMP "Disable Submissions"; OJS and OPS "Author
  Guidance"). No request failed and no page script failed on either
  line.
- Tips: OMP `main` 3b0ecf794 (`lib/pkp` 3dc90c81a6), `stable-3_5_0`
  9c5e24246 (`lib/pkp` cf3f984335), `stable-3_4_0` 0aec65441,
  `stable-3_3_0` 8e72fc883; OJS `main` ff004d0973 (`lib/pkp`
  987776cd04), `stable-3_5_0` c1cee76b95 (`lib/pkp` 771474347e),
  `stable-3_4_0` d68934d0d1, `stable-3_3_0` ac77c9fb35; OPS `main`
  c8af945bb7, `stable-3_5_0` 38b61882d3, `stable-3_4_0` acd8ae704b,
  `stable-3_3_0` c5532e2161; pkp-lib `stable-3_4_0` 767353f4fe,
  `stable-3_3_0` ac3fa73402.
- Code reads: OMP `templates/frontend/pages/submissions.tpl` against
  `lib/pkp/templates/frontend/pages/submissions.tpl` on `main` and 3.5
  (diff: copyright years, a doc comment, the not-accepting condition, the
  anchor); `lib/pkp/templates/management/workflow.tpl` side tab ids on
  all four lines (3.3: `authorGuidelines` holds `FORM_AUTHOR_GUIDELINES`,
  whose `PKPAuthorGuidelinesForm` has the `copyrightNotice` field);
  OJS's and OPS's `submissions.tpl` (include the shared one on `main`,
  3.5 and 3.4); `lib/ui-library` `Container/Page.vue` and
  `Tabs/Tabs.vue` (hash to `open-tab`, first tab by default; the same on
  3.4). 3.4 and 3.3 read with `git show upstream/stable-3_x_0:…` in the
  app checkouts and `git show origin/stable-3_x_0:…` in `lib/pkp` and
  `lib/ui-library`.
- The trace: `git blame` on OMP line 66 gives 05672bbb2e, which created
  the file (`commits/<sha>/pulls`: `pkp/omp#1671`, merged 2024-08-12);
  in `lib/pkp`, `git log -S'tab id="instructions"'` and
  `-S'tab id="authorGuidelines"'` on `workflow.tpl` give e79fc21e20
  (commit by Nate Wright, 2022-10-18; `pkp/pkp-lib#8495`, merged
  2022-12-14, on `stable-3_4_0`), and `git log -S'submission/authorGuidelines'` on the shared
  template gives 85f17b4ac4 (moved the other two links) and 8859cc9589
  (fixed this one; `pkp/pkp-lib#9941`, merged 2024-06-11, on `main` and
  `stable-3_5_0`, not on `stable-3_4_0`). OMP's 3.4 and 3.3 copies come
  from the same issue's backports (6f53512e6, 10878cc4d).
- Not driven: 3.4 and 3.3 (code only).
