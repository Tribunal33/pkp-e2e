# A series "Save" with an SVG cover chosen saves nothing, not even the other changes, and shows no message

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#426` for `pkp/pkp-lib#2513` · [64debc22ec](https://github.com/pkp/omp/commit/64debc22ecd7f07e6c25bed70348304b8122a4f4) · 2017-07-22 · Dimitris Efstathiou (defstat), which put SVG in the picker; the silent refusal dates from [ce508930ea](https://github.com/pkp/omp/commit/ce508930ea632eb329e8fd56ba7ac28eb537f422) · 2012-07-16 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager editing a series picks a cover; the file picker offers JPG,
PNG and SVG files, and an SVG uploads. "Save" then saves nothing and says
nothing: the window stays open and no message shows anywhere. Every other
change made in the same window (the title, the description) is refused
with the cover, and is lost when the manager closes the window. A cover
the series already had stays as it was.

A PNG or JPG cover saves normally, so a manager who converts the picture
gets round it, but the window never says that SVG is not accepted.

## Impact

- **Lost**: the edits made in the window with the SVG. A title changed
  in the same save was gone after "Cancel", and nothing warned of it.
  The SVG itself is refused by design; an existing cover is kept.
- **Who**: press managers editing a series under Settings › Press ›
  "Series", whenever the cover they have is an SVG (logos and drawings
  often are).
- **Way round**: save the picture as PNG or JPG, upload that and make the
  edits again.

Medium: the whole save fails on one narrow input, silently, and the
edits made with it are lost once the window is closed; there is a way
round, and the window staying open shows that something went wrong, so
the edits are not lost behind a save that looks done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (`publicknowledge`, "Public
  Knowledge Press"). Its series "Library & Information Studies" has no
  cover.
- Two small pictures on the computer: `cover.svg`, any SVG drawing
  (`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#36c"/></svg>`),
  and `cover.png`, any PNG, for the control.

Steps:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Press › "Series".
3. On the row "Library & Information Studies", open the row's arrow and
   press "Edit".
4. Under "Cover Image", press "Upload File". The file dialog's filter
   offers the image files ".jpg, .jpeg, .png, .svg" (the file input's
   `accept` attribute in the browser's developer tools). Choose
   `cover.svg`. The box shows the file name and "Change File".
5. Press "Save".
6. Press "Cancel", then "Edit" on "Library & Information Studies" again.

**Expected**: either the picker does not offer SVG, or "Save" refuses the
file with the message the app already has for a refused image, "An
invalid image was uploaded. Accepted formats are .png, .gif, or .jpg."

**Observed**: after "Save" the window stays open. No message shows in the
window or at the top of the page, and nothing is logged on the server.
The save's answer is:

```
POST …/$$$call$$$/grid/settings/series/series-grid/update-series?seriesId=1  200
{"status":false,"content":"","elementId":"0","events":[]}
```

Reopened, the series has no "Current Image".

Other changes in the same save:

1. Give "Education" a cover: "Edit", "Upload File", `cover.png`, "Save".
2. "Edit" on "Education" again. Change "Title" to "Education u17f",
   then "Upload File" and choose `cover.svg`.
3. Press "Save", then "Cancel", then "Edit" on "Education" again.

**Observed**: the same open window and no message on "Save". The list
and the reopened window still read "Education", and the PNG cover is
still under "Current Image".

The same steps with `cover.png` close the window on "Save", and the
reopened series shows the picture under "Current Image".

## Cause

OMP `SeriesForm::validate()`
(`controllers/grid/settings/series/form/SeriesForm.php`, lines 127–145)
checks an uploaded cover before anything else. When the file is not an
image the press can use, it records `form.invalidImage` on
`temporaryFileId` and returns `false` at once (line 141). That skips
`parent::validate()`, and the parent is where a refused legacy form tells
the user: `PKP\form\Form::validate()` (lib/pkp
`classes/form/Form.php`, lines 316–329) turns the form's errors into a
`NOTIFICATION_TYPE_FORM_ERROR` notice. `SeriesGridHandler::updateSeries()`
answers every refusal with `new JSONMessage(false)` and no redrawn form,
so the notice is the only place a message could appear, and none is
made. Since `validate()` fails, `execute()` never runs: nothing in the
form is stored, the old cover included.

An SVG reaches that branch because the window offers it.
`seriesForm.tpl` line 25 sets the uploader's filter to
`"jpg,jpeg,png,svg"`. `pkp/pkp-lib#2513` added `svg` there in 2017
([64debc22ec](https://github.com/pkp/omp/commit/64debc22ecd7f07e6c25bed70348304b8122a4f4)),
but the series form could never keep one: `getimagesize()` returns
`false` for an SVG, and the cover's small copy is made with GD, which
reads no SVG. Since `pkp/pkp-lib#9315` ("Disallow SVGs", 2023),
`FileManager::getImageExtension()` no longer maps `image/svg+xml` at all.
That change took `svg` out of pkp-lib's own pickers (`categoryForm.tpl`,
`publicProfileForm.tpl`) but not out of OMP's series window.

Reach:

- Any cover the check refuses is dropped the same silent way, not only an
  SVG: a text file named `.png` gave the same open window and no message
  (tried in the browser).
- OJS's issue form offers the same `"jpg,jpeg,png,svg"` filter
  (`templates/controllers/grid/issues/form/issueForm.tpl` line 25). Its
  `IssueForm::validate()` records `editor.issues.invalidCoverImageFormat`
  ("Invalid cover page format. Accepted formats are .gif, .jpg, or
  .png.") and goes on to `parent::validate()`, and
  `IssueGridHandler::updateIssue()` redraws the form, so an SVG there is
  refused with a message (code).
- On 3.5, 3.4 and 3.3 pkp-lib's older `CategoryForm::validate()` has the
  same early `return false` after `form.invalidImage`. Its picker offers
  only JPG, JPEG and PNG, so only a damaged or mislabelled file reaches
  it (code). On `main` that form is gone; categories use a Vue form.
- No other form in pkp-lib or the three apps' `classes`, `controllers`
  and `plugins` returns `false` straight after an `addError()` in front
  of `parent::validate()` (searched). OJS's `InstitutionalSubscriptionForm`
  adds its error after the parent ran, but its handler redraws the form,
  so the message shows there.

## Proposed fix

Let `SeriesForm::validate()` record the error and fall through to
`parent::validate()`, and stop offering SVG in the series window. This
is a proposal; the team decides. The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-svg-cover-dropped-silently/fix.diff).

```diff
--- a/controllers/grid/settings/series/form/SeriesForm.php
+++ b/controllers/grid/settings/series/form/SeriesForm.php
                 $this->addError('temporaryFileId', __('form.invalidImage'));
-                return false;
             }
--- a/templates/controllers/grid/settings/series/form/seriesForm.tpl
+++ b/templates/controllers/grid/settings/series/form/seriesForm.tpl
-							{ldelim} title : "Image files", extensions : "jpg,jpeg,png,svg" {rdelim}
+							{ldelim} title : "Image files", extensions : "jpg,jpeg,png" {rdelim}
```

Recording the error and then returning `parent::validate()` is how OJS's
`IssueForm::validate()` refuses a bad cover, and how
`NavigationMenuForm` and `AddLanguageForm` refuse. The parent then
raises the form-error notice, as for any other refused series field. The
form's `seriesform::validate` hook now also runs on this branch, which
it skipped before. The picker list goes back to what it was before
`pkp/pkp-lib#2513`, in line with `pkp/pkp-lib#9315`, which disallowed
SVG and cleaned pkp-lib's own pickers the same way. Each half covers a
case the other does not: the picker stops the SVG before it uploads,
and the `validate()` change explains any other file the server refuses.

Tried on OMP `main`: the picker offered ".jpg,.jpeg,.png" and refused
the SVG in the upload box with "File extension error.". A text file
named `.png` was refused on "Save" with lib/pkp's shared
`form.invalidImage`, "An invalid image was uploaded. Accepted formats
are .png, .gif, or .jpg.", shown as the page's notice at the top right
while the window stayed open; the window itself showed no message. With
the fix in and out, a PNG on another series saved and reopened as its
"Current Image".

**Alternatives**:

- Accept SVG as a series cover: against `pkp/pkp-lib#9315`, and the
  series' small copy needs GD.
- Have `updateSeries()` redraw the form with the error inside it: the
  rest of this handler and its siblings answer a refusal with
  `JSONMessage(false)` and the notice, and a redraw would empty the
  uploader.

**What goes with it**:

- The message names GIF, which the server accepts but the picker does not
  offer. Adding `gif` to the filter would make the two agree. That is a
  product choice, so it is left out of the diff.
- OJS's issue form: dropping `svg` from `issueForm.tpl` line 25 is the
  same `pkp/pkp-lib#9315` cleanup, a one-word change. It is left out of
  this diff because OJS already refuses an SVG issue cover with a
  message, so nothing is lost there; the team may want it in the same
  round.
- No stored data to repair: nothing was ever saved.
- Backport: the same two changes. 3.5 and 3.4 take the diff with line
  offsets (the template line is 24 on 3.4). On 3.3 it has to be redone:
  the form is `controllers/grid/settings/series/form/SeriesForm.inc.php`,
  tab-indented, with the `return false;` at line 111, and the template
  line is 24. The older pkp-lib `CategoryForm` on those three lines would
  take the same one-line `validate()` change.
- Test: the e2e scenario in spec U17 (a **Planned** item): an SVG is not
  offered, and a file the server refuses gives the message.

Small: one line in each of two files in OMP, following a pattern the
code already uses, and an e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-svg-cover-dropped-silently/walk.js),
  on an install loaded from PKP's default test dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/series-svg-cover-dropped-silently/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` for 3.5; `WALK=neighbour` for the
  neighbour check; `WALK=edits` for the title and existing-cover case). The script records what the picker accepts (its
  `accept` attribute), each save's answer, whether the window stays open,
  the messages in it and at the top of the page, and the server log
  lines written during the save. It writes its own test files; the SVG
  is the one in the Steps, and the PNG a 2×3 red picture.
- Walked on OMP `main` and `stable-3_5_0`: the same result on both (the
  picker ".jpg,.jpeg,.png,.svg", the save answered
  `{"status":false,"content":""}`, no notice, no cover after reopening;
  the PNG control saved). OJS and OPS have no series cover.
- Fix tried on OMP `main` with `node bin/try-fix.js apply|revert
  shared/playwright/checks/issues/series-svg-cover-dropped-silently/fix.diff omp`:
  the walk, and the neighbour check (`WALK=neighbour`: PNG on
  "Psychology", the text file named `.png` on "History") with the fix in
  and out. Without the fix the text file was refused with no message,
  like the SVG.
- Code reads: `SeriesForm::validate()`, `SeriesGridHandler::updateSeries()`,
  `seriesForm.tpl` and lib/pkp `Form::validate()` and
  `FileManager::getImageExtension()` on each line: main and 3.5 in the
  checkouts, 3.4 and 3.3 with `git show upstream/stable-3_4_0:…` and
  `…stable-3_3_0:…` (app) and `origin/…` (lib/pkp). 3.4 and 3.3 carry `pkp/pkp-lib#9315` (lib/pkp
  `8ee75fefab`, its backport `44d8bde60e` on 3.3), and `getimagesize()`
  refuses SVG on every line regardless.
- Introduced: `git blame` on `seriesForm.tpl` line 25 gives 64debc22ec
  (`pkp/omp#426`, merged 2017-07-24, with pkp-lib 22b3e2cf2d, which added
  `image/svg+xml` to `getImageExtension()` and `svg` to two pkp-lib
  pickers). Blame on `SeriesForm.php` line 141 stops at the PSR-12
  reformat 01088072a8 (2021); `git log -S"form.invalidImage"` gives
  ce508930ea (2012, Bugzilla 7618, no PR), the form's first image check,
  which already returned early. Kind is defect: no version
  ever kept an SVG series cover.
- Upstream search (2026-10-02): pkp/pkp-lib and pkp/omp, issues and PRs,
  by "series cover svg", "series cover image save", "series image not
  saved", "svg cover image upload", and by `SeriesForm`, `invalidImage`.
  Read and not this fault: `pkp/pkp-lib#7400` (the catalog entry's
  cover with WebP or SVG, a server error, closed with a fix),
  `pkp/pkp-lib#9315` (disallowing SVG), `pkp/pkp-lib#8035` (SeriesForm
  init hooks).
- Branch tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6); OMP
  `stable-3_5_0` 9c5e24246c (lib/pkp cf3f984335); `stable-3_4_0`
  0aec65441f (lib/pkp 32b0f4b4af); `stable-3_3_0` 8e72fc8836 (lib/pkp
  f6ab331645).
- The title and existing-cover case was walked on `main` only; 3.5 runs
  the same `validate()` and `execute()` (code).
- Not driven: OJS's issue cover (code, above). MySQL not checked;
  nothing here depends on the database.
