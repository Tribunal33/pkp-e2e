# On a press, a review form refused for an unanswered required question shows the reviewer a raw text code

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code; no box there, the top-right notice shows it)
  - 3.3: OMP (code; no box there, the top-right notice shows it)
- **Introduced** the press has lacked this text since 2013 ([95936e46d0](https://github.com/pkp/pkp-lib/commit/95936e46d0c531777ae760a7b5e998e3eb35dfee));
  the box that shows it on 3.5 and `main` came with `pkp/pkp-lib#12515` for `pkp/pkp-lib#11760` · [21941ebcc2](https://github.com/pkp/pkp-lib/commit/21941ebcc204f470d6bff39c7d1e0aa6ed8a40cc) · 2026-04-02 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02). `pkp/pkp-lib#12534` (open; PR
  `pkp/pkp-lib#12561`, not yet in main) rebuilds the step in Vue on
  `main`: the box and its line go, so on `main` the fault as walked
  ends when it lands, while the server's check still names the
  undefined text; whether the rebuilt screen can reach that check
  could not be told from the PR. 3.5 keeps the box
- **Tracked in** spec U28 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#omp3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a press, a reviewer whose review uses a review form presses "Submit
Review" and "OK" with a required question unanswered. The review is
rightly refused, but the box under the buttons opens with
"##reviewer.submission.reviewFormResponse.form.responseRequired##"
where a journal reads "Please fill in required fields.".

The box's second sentence, "Some required fields are not filled in.
Please complete them before submitting your review.", is the same on a
press and a journal, and "This field is required." marks the unanswered
question, so the reviewer can still tell what to do.

It shows on every press review form with a required question, in every
interface language. On `main` and 3.5 the same box, with the code, also
appears at the first answer typed, before any button is pressed
(a fault of its own, reported separately).

## Impact

- **Lost**: nothing. The review stays open, and it is submitted once
  the question is answered.
- **Who**: a press's reviewer on a review form with a required
  question, each time the box shows.
- **Way round**: none is needed.

Low: nothing is lost and the review gets submitted. The effort is
medium because the recommended fix moves the text from OJS to pkp-lib
with OJS's translations, so two repositories; adding the text to
pkp-lib alone is the small variant.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, or the one for
  `stable-3_5_0` on a 3.5 install (the press `publicknowledge`).
- The dataset has no review form, so steps 1 to 4 make one and give it
  to a reviewer.
- Submission 17, "Open Development: Networked Innovations in
  International Development", on which `jjanssen` has an unanswered
  review request.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open Settings ›
   Workflow › "Review" › "Review Forms", press "Create Review Form",
   type the Title "u28l review form" and press "Save".
2. On the form's row press "Edit", open the "Form Items" tab and press
   "Create New Item": Item "u28l verdict", tick "Reviewers required to
   complete item", Item type "Single line text box", "Save". Close the
   window.
3. Tick the row's "Active" box and press "OK".
4. Open the submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
   On Julie Janssen's row choose "Edit", choose "u28l review form"
   under "Review Form" and press "OK".
5. Sign in as `jjanssen` (password `jjanssenjjanssen`) and open the
   review (`/index.php/publicknowledge/en/reviewer/submission/17`).
   Press "Accept Review, Continue to Step #2" (tick the privacy box
   when it shows), then "Continue to Step #3".
6. Leave "u28l verdict" empty. Press "Submit Review", then "OK".

**Expected**: the step stays, nothing is submitted, and the box under
the buttons reads:

```
Please fill in required fields.
Some required fields are not filled in. Please complete them before submitting your review.
```

**Observed**: the step stays, nothing is submitted, "This field is
required." shows under "u28l verdict", and the box under the buttons
reads:

```
##reviewer.submission.reviewFormResponse.form.responseRequired##
Some required fields are not filled in. Please complete them before submitting your review.
```

Control: the same steps on OJS (submission 12, "Sodium butyrate
improves growth performance of weaned piglets during the first period
after weaning") show the box as Expected.

## Cause

pkp-lib names a message that only OJS defines.
`lib/pkp/templates/reviewer/review/step3.tpl` line 81 (line 78 on 3.5),
shared by OJS and OMP, gives the box its first line:

```smarty
notificationTitle={"reviewer.submission.reviewFormResponse.form.responseRequired"|translate}
```

The key is in OJS's own `locale/en/locale.po` ("Please fill in required
fields.") and in no locale file of pkp-lib or OMP, so on a press the
translation comes back as `##key##`. The box's second line,
`reviewer.submission.reviewFormResponse.form.notFilledIn`, was added by
the same change to pkp-lib's `locale/en/reviewer.po`, which is why it
reads the same on both.

The same key is the message of the server's own check,
`PKPReviewerReviewStep3Form::__construct()` line 60
(`FormValidatorCustom(…, 'reviewFormResponses', 'required',
'reviewer.submission.reviewFormResponse.form.responseRequired', …)`),
and has been since the reviewer's forms moved into pkp-lib in 2013
while the message stayed in OJS.

Reach:

- `main` and 3.5, the box: on every press review form with a required
  question, after a refused "Submit Review" (walked), and wherever else
  the box shows (at the first answer typed, walked for U28 A14).
- `main` and 3.5, the server's check: no screen reaches it, because the
  browser now stops an unanswered required question of every item type
  before the form is sent (code).
- 3.4 and 3.3: there is no box and the browser does not check the
  review form's questions, so an unanswered required question reaches
  the server's check. `Form::validate()` hands its message to the
  form-error notice at the top right, which on a press is the same raw
  code (code, not walked).
- Every language: no OMP or pkp-lib locale file has the key. OJS has it
  in 65 of its 78 locales.
- No other key is missing: every other locale key that `step3.tpl`,
  `reviewFormResponse.tpl` and `PKPReviewerReviewStep3Form` refer to
  has an OMP or pkp-lib definition (code).

## Proposed fix

Move the message from OJS's `locale.po` to pkp-lib's `reviewer.po`,
where the box's second line already is, so that pkp-lib defines the
text its own template and form class refer to.

[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-form-refusal-raw-key/fix-omp.diff)
(the pkp-lib hunk) and
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-form-refusal-raw-key/fix-ojs.diff)
(the same hunk, and the entry taken out of OJS):

```diff
--- a/lib/pkp/locale/en/reviewer.po
+++ b/lib/pkp/locale/en/reviewer.po
 msgid "openReview.hideResponse"
 msgstr "Hide Response"
 
+msgid "reviewer.submission.reviewFormResponse.form.responseRequired"
+msgstr "Please fill in required fields."
+
 msgid "reviewer.submission.reviewFormResponse.form.notFilledIn"
--- a/locale/en/locale.po   (OJS)
+++ b/locale/en/locale.po
-msgid "reviewer.submission.reviewFormResponse.form.responseRequired"
-msgstr "Please fill in required fields."
-
```

Tried on `main`, OMP and OJS: with the fix, step 6 on the press shows
"Please fill in required fields." over the second sentence, and the
journal's box reads the same as before. With the fix and without, a
reviewer who answers the question submits the review on both.

This is a proposal; the team decides.

**Alternatives**

- Add the message to pkp-lib and leave OJS's copy: one repository and
  three lines, and it closes the fault, but the key is then defined
  twice and OJS's translations stay out of the press's reach.
- Add the message to OMP's `locale.po`: it mends the press, but leaves
  a pkp-lib template and class depending on each app to define their
  message.

**What goes with it**

- Translations: the diffs are English-only. As tried, `fix-ojs.diff`
  leaves the key in OJS's other 64 locale files, so it is not the whole
  PR. The move for every locale is pkp-lib's own tool, run from the OJS
  root (not run here):
  `php lib/pkp/tools/moveLocaleKeysToLib.php reviewer.submission.reviewFormResponse.form.responseRequired locale.po reviewer.po`.
  The whole key must be given: the tool compares the full `msgid` line,
  whatever its usage text says about partial matches. It appends the
  entry at the end of each `reviewer.po`, so its English result differs
  from the diff in placement only; the tool's output is the proposed
  change.
- Branches: 3.5 needs the fix in any case and the diffs apply there as
  written (not tried there). On `main` the box stays until
  `pkp/pkp-lib#12561` is merged, and the server's check keeps the key
  after it, so the move goes to both. On 3.4 the same move mends the
  notice; on 3.3 the English locale is `en_US`.
- No stored data, API or plugin hook is involved.
- Guard: an e2e scenario in pkp-e2e that reads the box's first line on
  a press after a refused "Submit Review".

Medium: two repositories.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-form-refusal-raw-key/walk.js),
  with the helpers of the U28 A14 walk
  ([lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-save-for-later-required-fields/lib.js)).
  It takes the Steps on OMP, and on OJS as the control, on an install
  loaded from the default dataset (pkp/datasets e8dafbc, 2026-10-02;
  PostgreSQL), and records the box's two lines, the marks and whether
  the review was submitted:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js omp,ojs shared/playwright/checks/issues/press-review-form-refusal-raw-key/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5).
  `MODE=nb` in front runs only the good path, the check that the fix
  breaks nothing: Paul Hudson (`phudson`), given the same form, answers
  "u28l verdict" (on OJS also chooses "Accept Submission"), presses
  "Submit Review" and "OK", and the review is submitted.
- Walked on `main` and on `stable-3_5_0`, OMP and OJS, 2026-10-02; 3.5
  showed the same as `main` on both.
- Fix trial on `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-review-form-refusal-raw-key/fix-omp.diff omp`
  and `… fix-ojs.diff ojs`, the walk, the neighbour, `revert`, the
  neighbour again.
- Branch tips. `main`: OMP 3b0ecf794c (lib/pkp 3dc90c81a6), OJS
  b84f8e2e44 (lib/pkp ddd8ab243a). `stable-3_5_0`: OMP 9c5e24246c, OJS
  091fb65453 (lib/pkp cf3f984335). `stable-3_4_0`: OMP 0aec65441f, OJS
  75cc2d488b, lib/pkp 6f96165c90. `stable-3_3_0`: OMP 8e72fc8836, OJS
  ac77c9fb35, lib/pkp 4156e50233.
- Code read on `main` and 3.5: `step3.tpl`, `reviewFormResponse.tpl`,
  `inPlaceNotificationContent.tpl`, `PKPReviewerReviewStep3Form`,
  `PKPReviewerHandler::saveStep()`, `reviewStep3Required.js`, and the
  English locale files of OJS, OMP and pkp-lib for the key (OJS's
  `locale/en/locale.po` only) and for every other key those templates
  and the class name.
- Code read on 3.4 and 3.3: `step3.tpl` has no
  `#reviewStep3MessageBox`; `reviewFormResponse.tpl` marks the
  question's section as required but gives no answer control a
  `required` attribute; `PKPReviewerReviewStep3Form` names the key in
  its check; `PKPReviewerHandler::saveStep()` calls `validate()`, and
  `Form::validate()` sends the errors as a form-error notification;
  OJS's English `locale.po` defines the key (`locale/en_US/` on 3.3),
  and OMP's and pkp-lib's locale files do not.
- The trace: `git log -S` on the key. In pkp-lib's `step3.tpl` it
  arrives with `pkp/pkp-lib#12515` (forward-ported to `main` as
  [93f6c0bf44](https://github.com/pkp/pkp-lib/commit/93f6c0bf44259c5d59554e294336b8c5596cd347)), which also
  added `…form.notFilledIn` to pkp-lib's `reviewer.po`. In the form
  class it arrives with 95936e46d0 ("*8212* Reviewer interface to
  shared lib", Alec Smecher, 2013-05-17), from pkp's old bug tracker,
  so no PR is named.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/omp, pkp/ojs and
  pkp/ui-library, issues and PRs, for `responseRequired`, "Please fill
  in required fields", `"##reviewer.submission"`,
  `reviewStep3MessageBox`, review form required fields, and missing
  locale key reviewer; and the comments of `pkp/pkp-lib#11760`. Nothing
  names the key or the press's box.
- The rebuild, read in the diffs of `pkp/pkp-lib#12561` (head
  1ce11c675a, last updated 2026-07-29) and `pkp/ui-library#873`:
  `step3.tpl` loses the form and the box; the Vue form marks required
  questions itself and posts to the same `saveStep`;
  `PKPReviewerReviewStep3Form` keeps the check with this key, and no
  locale file in the PR defines it.
- Not driven: the fix on 3.5; 3.4 and 3.3; another interface language;
  OPS (no review); MySQL not checked (the fault does not depend on the
  database).
- Unverified: what the rebuilt step of `pkp/pkp-lib#12561` shows on a
  press when the server refuses.
