# The "Add" and "Edit" windows for a task or discussion show "Open for What? Open to What? Beyond Content" under the title

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; 3.5 has the older discussion window, without this line)
  - 3.4: none (code; 3.4 has the older discussion window, without this line)
  - 3.3: none (code; 3.3 has the older discussion window, without this line)
- **Introduced** text added by PR `pkp/ui-library#652` for issue `pkp/pkp-lib#11291` · [ae2da88eee](https://github.com/pkp/ui-library/commit/ae2da88eee3f56ee4087b23451e5d550aefec41b) · 2025-06-26 · Blesilda Ramirez (blesildaramirez); on screen since PR `pkp/ui-library#699` for issue `pkp/pkp-lib#11291` · [c3bd2bc256](https://github.com/pkp/ui-library/commit/c3bd2bc2561fdc7b9a1e9b9a55d356243a54fd48) · 2025-09-15 and PR `pkp/pkp-lib#11804` for issue `pkp/pkp-lib#11825` · [2ceea5cd28](https://github.com/pkp/pkp-lib/commit/2ceea5cd28a613f168e80b3fdfb76537ccafc915) · 2025-09-16 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Whoever adds a task or discussion on a submission, or edits one, sees
"Open for What? Open to What? Beyond Content" under the window's title.
The sentence is placeholder text and says nothing about the window, its
fields or the submission; the window should show a line that describes
it, or nothing. An interface in another language shows the raw key
"##discussion.form.description##" there instead.

Nothing is lost and no way round is needed: the window saves as it
should.

## Impact

- **Lost**: nothing; the window reads as unfinished.
- **Who**: everyone who adds or edits a task or discussion, on every
  stage, every time the window opens.
- **Way round**: none needed.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 5, "Genetic transformation of forest trees", in Production.
  [Press: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture". Preprint server: submission 1, "The influence of
  lactation on the quantity and quality of cashmere production".]

Adding:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   5 at its "Production" stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`)
   [press: submission 4, `…?workflowSubmissionId=4&workflowMenuKey=workflow_5`;
   preprint server: submission 1, `…?workflowSubmissionId=1&workflowMenuKey=workflow_5`].
2. Under "Production Tasks & Discussions" press "Add".
3. Read the window's header.

Editing:

4. Type `u37r9 discussion` in "Name", tick "David Buskins (dbuskins)" under
   "Participants" [press: "Graham Cox (gcox)"; preprint server: "David
   Buskins (dbuskins)" too], since a discussion needs
   two participants, type `u37r9 message` in the message box
   and press "Save".
5. On the new row "u37r9 discussion" press "More Actions", then "Edit".
6. Read the window's header.

**Expected:** under the title "Production Tasks & Discussions", a line
that describes the window, or no line, then the badge ("New" when
adding, "In progress" when editing).

**Observed:** both windows read:

```
Production Tasks & Discussions
Open for What? Open to What? Beyond Content
New
```

with "In progress" in place of "New" in the "Edit" window.

The same "Add" window opened in French
(`/index.php/publicknowledge/fr_CA/dashboard/editorial?…`) reads
"##discussion.form.description##" under its title.

## Cause

The window is ui-library's `DiscussionManagerFormModal.vue`. Its header
fills the side window's `#description` slot with
`t('discussion.form.description')`, and pkp-lib's
`locale/en/submission.po` gives that key the text "Open for What? Open
to What? Beyond Content". No other language has the key, so any other
interface language gets the missing-key form `##discussion.form.description##`
(`Locale::translate()` has no English fallback).

The sentence came in as mock data. ui-library's first Tasks and
Discussions commit, ae2da88eee (`pkp/ui-library#652`), put it in the
window, then named `DiscussionManagerForm.vue` (renamed to
`DiscussionManagerFormModal.vue` in 111b9aa781, `pkp/ui-library#703`),
and in Storybook's `public/globals.js` under
`tasks.discussions.form.description`, beside a mock title "Desk Review
Discussions and Tasks". bc9a03b9fc (`pkp/ui-library#655`) renamed the
key.

Two changes then put the line on the screens together. c3bd2bc256
(`pkp/ui-library#699`) placed the window on the workflow page (the
`<template #description>` line blames to it), and 2ceea5cd28
(`pkp/pkp-lib#11804`) gave the key the same English text in pkp-lib.
The window's title has since become the stage's name ("Production Tasks
& Discussions", `getDiscussionTitleByStage()`), while the line under it
stayed.

`SideModalBody` renders the slot inside reka-ui's `DialogDescription`,
so the sentence is also the dialog's accessible description, which a
screen reader reads out when the window opens (read in the code, not
heard with a screen reader).

Reach:

- The "Add" window and the "Edit" window (the same component), on every
  stage, for every role that may open them: the slot has no condition.
- The discussion's own window (`DiscussionManagerFormDisplayModal.vue`)
  and the task template window in Settings › Workflow › "Tasks and
  Discussions" (`TaskTemplateManagerFormModal.vue`) have no description
  line, checked in the code; the template window was walked and reads
  "Add Task and Discussion Template in Production Stage" alone.
- No other ui-library component and no pkp-lib template uses the key.

## Proposed fix

Drop the description from the window
([fix-a2.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/fix-a2.diff)),
so that it reads like the discussion's own window and the template
window: the title, then the badge. This also removes the raw key from
every other language.

```diff
--- a/lib/ui-library/src/managers/DiscussionManager/DiscussionManagerFormModal.vue
+++ b/lib/ui-library/src/managers/DiscussionManager/DiscussionManagerFormModal.vue
@@ -3,11 +3,6 @@
 		<template #title>
 			{{ discussionTitleByStage }}
 		</template>
-		<template #description>
-			<span class="text-lg-medium">
-				{{ t('discussion.form.description') }}
-			</span>
-		</template>
 		<template #post-description>
 			<Badge v-bind="badgeProps" class="mt-1">
 				{{ badgeProps.slot }}
```

Tried on OJS, OMP and OPS `main` with the Steps: both windows read
"Production Tasks & Discussions" and then the badge, and the panel's own
description above them was unchanged.

**Alternatives**

- Give the key a real sentence in pkp-lib's `submission.po`: the
  window's sections ("Details", "Task Information", "Discussion") each
  carry their own explanation already, and the wording would have to be
  decided and translated first.
- Show the submission's title there, as `ReviewDetailsEditModal.vue`
  does: useful context, but the discussion's own window and the template
  window do not show it either.

**What goes with it**

- Remove the then unused `discussion.form.description` from pkp-lib's
  `locale/en/submission.po` and from ui-library's `public/globals.js`.
- Guard: an e2e check that the "Add" window's header holds the title
  and the badge only.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on each app and records
  each window's header lines; it also walks the error list of the same
  windows (`U37-A21-error-list-calls-message-box-undefined.md`).
  [french.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/french.js)
  opens the "Add" window at the `fr_CA` address. On an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/walk.js`.
- Dataset: pkp/datasets c657990 (2026-10-01).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library 64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5); `stable-3_5_0` OJS c346ee00a5, OMP c7b45f88e, OPS 8eaf899468 (lib/ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (pkp-lib 32b0f4b4af, ui-library ee684b34); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib f6ab331645, ui-library 96959f9e).
- Code reads of the older versions: on `stable-3_5_0`, ui-library's
  `DiscussionManager.vue` is the only file of its folder and wraps the
  older discussions grid, whose window
  (`templates/controllers/grid/queries/form/queryForm.tpl`) has no such
  line, and the key is not in pkp-lib's `submission.po`. On
  `stable-3_4_0` and `stable-3_3_0`: no `DiscussionManager` in
  ui-library and no such key in pkp-lib.
- The trace: `git blame` on the slot gives c3bd2bc256 (the
  `<template #description>` line), bc9a03b9fc (the key's rename) and
  ae2da88eee (the text), the older two in `DiscussionManagerForm.vue`;
  `git log -S` on the key in pkp-lib's `locale/en/submission.po` gives
  2ceea5cd28.
