# On a press, the email telling editors a review is in says the reviewer "recommends None"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; editors get the general notification email, which names no recommendation)
- **Introduced** `pkp/pkp-lib#8646` for `pkp/pkp-lib#8474` · [7d3d9039d9](https://github.com/pkp/pkp-lib/commit/7d3d9039d9ea51267f702a4a5e9b0eff4b8c97e3) · 2023-02-20 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#omp2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a reviewer submits a review on a press, the email that tells the
assigned editors has the subject "Review complete: {reviewer} recommends
None for #{id} …" and a "Recommendation: None" line in its body. A press
never asks its reviewers for a recommendation, so the editor expects an
email that only says the review is in.

The email arrives and its link opens the submission. An editor can take
"None" as the reviewer's answer until they open the review, which has no
recommendation field.

This is the default text of the email on every press. Each installed
press holds its own stored copy of it, in each of its languages, so the
fix is a new text, an upgrade migration and translations.

## Impact

- **Lost**: nothing.
- **Who**: every editor assigned to a press submission, at each review
  that comes in on either review stage, unless they turned this email
  off in their notification settings.
- **Way round**: the work needs none. A press manager can reword the
  email for their own press under Settings › Emails, where it is listed
  as "Reviewer Commented Notify Editors" with the template "Review
  Completed".

Low: the wording misleads, and the review the editor must open to decide
shows that no recommendation was asked for.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. Submission 17, "Open Development:
  Networked Innovations in International Development", is in Internal
  Review, with Julie Janssen's (`jjanssen`) review request unanswered and
  no editor assigned. The email goes to the editors assigned to the
  submission, so step 2 assigns one.
- A mail catcher that shows what the install sends. The dataset's
  `config.inc.php` sends mail by SMTP to `localhost:1025`, the port
  Mailpit and MailHog listen on.

Steps:

1. Sign in as `dbarnes`. On the dashboard open "Active submissions" and
   open submission 17.
2. Under "Participants" press "Assign". Choose "Press editor", press
   "Search", select "Daniel Barnes" and press "OK".
3. Sign out and sign in as `jjanssen`. Open the review,
   `/index.php/publicknowledge/en/reviewer/submission/17`.
4. Press "Accept Review, Continue to Step #2", then "Continue to Step #3".
   Step 3 has no "Recommendation" list.
5. Press "Submit Review", then "OK".
6. In the mail catcher, open the email to `dbarnes@mailinator.com` whose
   subject starts "Review complete:".

**Expected**: an email saying that Julie Janssen's review is in, with no
recommendation in its subject or body, since step 3 asked for none.

**Observed**: the subject and the body both name a recommendation of
"None":

```
Subject: Review complete: Julie Janssen recommends None for #17 Smith et al. — "Open Development: Networked Innovations in International Development"

Dear Daniel Barnes,
Julie Janssen completed the following review:
#17 Smith et al. — "Open Development: Networked Innovations in International Development"
Recommendation: None
Type: Anonymous Reviewer/Anonymous Author
Login to view all files and comments provided by this reviewer.
```

On a journal (the default dataset, OJS `main`, submission 12, where
`jjanssen` chooses "Accept Submission" under "Recommendation" in step 3),
the same email reads "Review complete: Julie Janssen recommends Accept
Submission for #12 Christopher — …" and "Recommendation: Accept
Submission".

## Cause

The email's default text is shared by the journal and the press, and it
is written for the journal. pkp-lib's `locale/en/emails.po` defines
`emails.reviewComplete.subject` as "Review complete: {$reviewerName}
recommends {$reviewRecommendation} for #{$submissionId} …" (line 379)
and `emails.reviewComplete.body` with the line
"`<b>Recommendation:</b> {$reviewRecommendation}`" (line 386). OMP's
`registry/emailTemplates.xml` (line 33) gives its `REVIEW_COMPLETE`
email these two texts, as OJS's does.

A press collects no recommendation. The "Recommendation" list is OJS's
`templates/reviewer/review/reviewerRecommendations.tpl`, which OJS's own
`step3.tpl` includes; OMP has neither file, so its reviewers see
pkp-lib's step 3, which has no list. On `main` OMP's
`Application::hasCustomizableReviewerRecommendation()` also returns
false, so the press has no recommendations to offer.

With nothing chosen,
`PKP\mail\variables\ReviewAssignmentEmailVariable::getRecommendation()`
finds no entry for the review's recommendation and returns
`__('common.none')`, "None". That fallback suits a body line; in the
subject's sentence it reads as the reviewer's answer.

`pkp/pkp-lib#8646` wrote the sentence, to put the recommendation where
a journal's editor sees it first (`pkp/pkp-lib#8474`). OMP's
`registry/emailTemplates.xml` already used these two keys, so the press
got the sentence with no change in OMP.

Reach:

- The press's External Review stage sends the same email with the same
  text (read in the code). The Internal Review stage is the one walked.
- The stored copy. The text is copied into `email_templates_default_data`
  when the press is installed, one row per language, and the email is
  sent from that copy. The default dataset's press holds the English row
  and the French one, "Évaluation terminée: {$reviewerName} recommande
  {$reviewRecommendation} pour …" (read in the database).
- Settings › Emails on a press shows the same subject and body as the
  default of the "Review Completed" template (code).
- The submission's email log keeps the email under that subject
  (`PKPReviewerReviewStep3Form::execute()` logs it; code).
- A journal does not show it: "Submit Review" is refused there until a
  recommendation is chosen (`APP\submission\reviewer\form\ReviewerReviewStep3Form`,
  code).
- A preprint server has no review and no `REVIEW_COMPLETE` email (code).

## Proposed fix

Give the press its own text for this email, without the recommendation,
by defining `emails.reviewComplete.subject` and `.body` in OMP's own
`locale/en/emails.po`, and reinstall the stored default on upgrade. The
diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-complete-email-recommends-none/fix.diff),
against the OMP root:

- `locale/en/emails.po` and `locale/fr_CA/emails.po`: the two texts. The
  subject reads "Review complete: {$reviewerName} reviewed
  #{$submissionId} {$authorsShort} — "{$submissionTitle}"", and the body
  is pkp-lib's without the "Recommendation:" line.
- `classes/migration/upgrade/v3_6_0/ReviewCompleteEmailNoRecommendation.php`,
  named in `dbscripts/xml/upgrade.xml`: reinstalls the default text of
  `REVIEW_COMPLETE` on a press already installed, as
  `PKP\migration\upgrade\v3_6_0\I12903_ReviewerUnassignEmailTemplate`
  does for two other emails. The class name is a placeholder; the team
  gives it its issue number.

```diff
--- a/locale/en/emails.po
+++ b/locale/en/emails.po
+msgid "emails.reviewComplete.subject"
+msgstr "Review complete: {$reviewerName} reviewed #{$submissionId} {$authorsShort} — \"{$submissionTitle}\""
```

OMP's definition wins over pkp-lib's because of the load order, which is
fixed in code: `PKPApplication` registers pkp-lib's locale folder first
and OMP's `Application` its own after it, both with priority 0;
`LocaleBundle` sorts by priority with `asort()`, which keeps that order,
and merges the files one after another, a later definition replacing an
earlier one. OMP and pkp-lib already share 34 keys this way, and for
`manager.setup.copyrightNotice`, whose two texts differ, a press shows
OMP's (checked on the install).

No language is left worse off. A language without the OMP text keeps
pkp-lib's translation, on a new install and after the migration, so its
editors read what they read today until a translator adds the OMP text.

The fix was tried on OMP `main`, with the migration run on the loaded
dataset. The Steps then showed the Expected: the subject "Review
complete: Julie Janssen reviewed #17 Smith et al. — "Open Development:
…"" and a body with no "Recommendation" line. Two checks that the fix
reaches no further: the "Review accepted: Paul Hudson accepted review
assignment for #17 …" email to the same editor read the same with and
without the fix, and the stored default texts of every other email (110
rows) were unchanged. The German text still resolved to pkp-lib's.

**Alternatives**

- New keys of OMP's own (`emails.reviewCompleteNoRecommendation.*`)
  named in OMP's registry, the way `emails.reviewRequest.*` and
  `emails.reviewRemind.*` are each app's own. It does not rest on the
  load order, and it was tried and works in English and French. It makes
  20 languages worse until they are translated: the install and the
  migration store an empty text for a language without the new key
  (`installEmailTemplateLocaleData()`), and the email then goes out in
  the first language that has one, English
  (`LocalizedData::getBestLocalizedData()`), where a translated email
  came before. A migration limited to the translated languages would
  spare installed presses, not new ones.
- Reword pkp-lib's shared text so that it names no recommendation: one
  change for both apps, but it takes the recommendation out of the
  journal's subject, which is what `pkp/pkp-lib#8474` asked for.
- Have `getRecommendation()` return an empty text when the app collects
  no recommendation: the subject would read "recommends  for #17".

**What goes with it**

- Translations. Of OMP's 34 languages, 22 have a text for this email in
  pkp-lib, 11 have an empty one and `mn` has no pkp-lib `emails.po`. The
  diff covers English and French (Canada), which leaves 20 to translate.
- A press that saved its own wording of the template under Settings ›
  Emails keeps it: the migration replaces the default text only.
- Left out, the same assumption in three other texts:
  - the email's description on that page,
    `mailable.reviewCompleteNotifyEditors.description` in pkp-lib's
    `manager.po`: "This email is automatically sent to assigned editors
    when reviewer makes review recommendation";
  - the variables offered for this email on a press, which still name
    `{$reviewRecommendation}`
    (`ReviewAssignmentEmailVariable::descriptions()`);
  - OMP's `emails.reviewResponseOverdueAuto.body`, which asks the
    reviewer "to record your review and recommendation" (code, not
    walked).
- Backport: the locale change applies as written to 3.5 and 3.4; the
  migration would sit in that version's folder.
- Guard: a test that a press's review-complete email has no
  "recommends" in its subject and no "Recommendation" line, beside the
  journal's, which names the reviewer's choice.

Medium: two texts in one app, with an upgrade migration for the presses
already installed and 20 translations.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-complete-email-recommends-none/walk.js)
  with its helpers in `lib.js` beside it. It takes the Steps on the press
  and the control on the journal:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/press-review-complete-email-recommends-none/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5; `MODE=nb`
  for the two reach checks, on the press alone).
- Walked on 2026-10-02 on PostgreSQL, on installs freshly loaded from
  the default dataset (pkp/datasets e8dafbc, 2026-10-02):
  - `main`: OMP 3b0ecf794c (lib/pkp 3dc90c81a6), OJS b84f8e2e44 (lib/pkp
    ddd8ab243a).
  - `stable-3_5_0`: OMP 9c5e24246c, OJS 091fb65453 (lib/pkp cf3f984335).
    The press's email read the same as on `main`, the journal's
    "recommends Accept Submission".
- The fix trial: `node bin/try-fix.js apply …/fix.diff omp`, then, on the
  loaded dataset,
  `cd <omp root> && PKP_CONFIG_FILE=<config> php …/press-review-complete-email-recommends-none/run-migration.php`
  ([run-migration.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-complete-email-recommends-none/run-migration.php)
  runs the diff's migration as the upgrade would), then the script in
  both modes. The script reads the stored texts from
  `email_templates_default_data`. Which text a key resolves to was read
  with `__('<key>', [], '<locale>')` in a script run on the install, in
  `en`, `fr_CA` and `de`. The new-keys alternative was tried the same
  way before the recommended one.
- Code reads:
  - `main`: lib/pkp `locale/en/emails.po` and `manager.po`,
    `ReviewAssignmentEmailVariable`, `ReviewCompleteNotifyEditors`,
    `PKPReviewerReviewStep3Form::execute()`,
    `reviewer\recommendation\Repository::getRecommendationOptions()`,
    `emailTemplate\DAO::installEmailTemplates()` and
    `installEmailTemplateLocaleData()`, `i18n\Locale::getBundle()`,
    `i18n\translation\LocaleBundle`, the gettext
    `Translator::addTranslations()`; OMP's and OJS's
    `registry/emailTemplates.xml`, `classes/core/Application.php`,
    `templates/reviewer/review/` and `locale/en/emails.po`; OPS's
    registry.
  - The translation count: pkp-lib's `locale/<language>/emails.po` for
    each folder of OMP's `locale/`, by the msgstr of
    `emails.reviewComplete.subject`. Empty in `ca`, `ckb`, `el`, `fa`,
    `gd`, `gl`, `hu`, `it`, `pl`, `ro`, `sv`.
  - 3.5 (`checkouts` of `stable-3_5_0`): the same text and registry
    line. Step 3 has no recommendation field on a press and saves
    `(int) null`, 0, as the review's recommendation; 0 is not a key of
    `ReviewAssignment::getReviewerRecommendationOptions()`, so
    `getRecommendation()` returns "None".
  - 3.4 (pkp-lib `stable-3_4_0` 6f96165c90, OMP 0aec65441): the
    introducing commit is on the branch; the text, the registry line, the
    `(int)` and the fallback are as on 3.5, and OMP has no step 3
    template of its own.
  - 3.3 (pkp-lib `stable-3_3_0` 4156e50233, OMP 8e72fc883): OMP's
    registry has no `REVIEW_COMPLETE`; `PKPReviewerReviewStep3Form`
    creates the notification "A reviewer has commented on "{$title}"."
    and nothing else.
- Introduced: `git log -S'recommends {$reviewRecommendation}'` on
  pkp-lib's `locale/en/emails.po` names 7d3d9039d9, whose pull request is
  `pkp/pkp-lib#8646`. The email itself came with `pkp/pkp-lib#7874`
  (6ce041ca01, 2022-11-07), which replaced the general notification
  email; OMP's registry took it in c18c43263.
- Upstream search (pkp/pkp-lib, pkp/omp; issues and pull requests, open
  and closed): "recommends None", "Recommendation: None",
  `reviewRecommendation`, `REVIEW_COMPLETE`, `ReviewCompleteNotifyEditors`.
  `pkp/pkp-lib#11895` (closed, fixed on 3.5) is another fault: a
  journal's email saying "Choose One" for a recommendation the reviewer
  did choose.
- Not driven: the press's External Review stage; a French-reading
  editor's email; Settings › Emails on a press (its names are the
  English locale's `mailable.reviewCompleteNotifyEditors.name` and
  `mailable.reviewComplete.name`); the submission's email log; an
  upgrade from 3.5 with the migration in `upgrade.xml`; 3.4 and 3.3
  (code only). MySQL not checked; the fault does not depend on the
  database.
- The fix's French text was written from pkp-lib's `fr_CA` one with the
  recommendation taken out, and was not reviewed by a French speaker.
