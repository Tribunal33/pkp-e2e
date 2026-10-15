# The "Preprint URL" in a preprint's first-post email sends its authors to the editorial dashboard, not the preprint

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OPS (latent)
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#387` for `pkp/pkp-lib#5716` · [864f177d21](https://github.com/pkp/ops/commit/864f177d21a50c87ee6888365ba82cf4e07508aa) · 2022-11-07 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U49 [OPS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ops6)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a preprint is posted for the first time, each contributor receives
"Preprint Posted Acknowledgement": "Your preprint, "{title}" has been
posted online on {server}." Its "Preprint URL" does not lead to the
preprint. It leads to the preprint's workflow on the editorial
dashboard, so a contributor who follows it lands on the login page, and
an author who signs in there is told "The current role does not have
access to this operation."

The preprint itself is online, and the author can reach it through the
server's "Archives" or its search; only the email's one link is wrong.

On `main` "Preprint Posted Acknowledgement" is not sent at all, a fault
reported apart (pkp-e2e#551): every first post sends "New Version Posted
Acknowledgement", which links the public page. Once pkp-e2e#551 is
fixed, this wrong link reaches authors on `main` too.

## Impact

- **Lost**: a working link to the posted preprint in the email that
  announces it. No data or work is lost.
- **Who**: every contributor with an email address, on every preprint's
  first post, wherever Settings › Workflow › Emails › "Preprint Posted"
  is "Send an email to all authors." (the default).
- **Way round**: a manager can correct the template, listed as "Posted
  Acknowledgement" under Manage Emails, by replacing `{$submissionUrl}`
  with `{$submissionPublishedUrl}`: one edit in each language's text of
  the template (English alone on the default dataset, whose French text
  is empty).

Low: the preprint is public and the author loses only a working link.
It would be medium if the link were the only way an author learned where
their preprint lives.

## Steps to reproduce

The steps are taken on 3.5, where the email is sent. On `main` they
reach this email only once
[pkp-e2e#551](https://github.com/jardakotesovec/pkp-e2e/issues/551) is
fixed.

Preconditions: PKP's default test dataset, OPS `stable-3_5_0`. Nothing
is created beforehand.

- Preprint 1, "The influence of lactation on the quantity and quality of
  cashmere production", is in Production and has never been posted; its
  one contributor is Carlo Corino (`ccorino`, `ccorino@mailinator.com`),
  who has an Author account.
- Settings › Workflow › Emails › "Preprint Posted" has "Send an email to
  all authors." selected.

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open preprint 1
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. In the "Preprint" menu open "Title & Abstract" and press "Post".
4. In the "Post the preprint" window press "Post".
5. Read the email that arrives at `ccorino@mailinator.com`.
6. Sign out, and open the email's "Preprint URL" link.
7. On the page it opens, sign in as `ccorino`.

**Expected**: "Preprint URL" is the preprint's public page,
`/index.php/publicknowledge/en/preprint/view/1`, which opens "The
influence of lactation on the quantity and quality of cashmere
production" for anyone, signed in or not.

**Observed**: step 5 delivers "Preprint Posted Acknowledgement":

```
Carlo Corino: Your preprint, "The influence of lactation on the quantity and
quality of cashmere production" has been posted online on Public Knowledge
Preprint Server. Preprint URL:
http://<host>/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1
If you have any questions, please contact me. {$signature}
```

Step 6 opens "Login | Public Knowledge Preprint Server"
(`…/login?source=…dashboard%2Feditorial%3FworkflowSubmissionId%3D1`).
Step 7 lands on `…/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
which reads "The current role does not have access to this operation."
(The raw "{$signature}" is a fault of its own, reported apart in
[pkp-e2e#552](https://github.com/jardakotesovec/pkp-e2e/issues/552).)

## Cause

The template links the wrong variable. `emails.postedAck.body` in OPS's
[locale/en/emails.po](https://github.com/pkp/ops/blob/main/locale/en/emails.po)
(line 102) reads:

```
"Preprint URL: <a href=\"{$submissionUrl}\">{$submissionUrl}</a><br />\n"
```

`{$submissionUrl}` is `PKP\mail\variables\SubmissionEmailVariable::SUBMISSION_URL`,
filled by `getSubmissionUrl()`
([lib/pkp classes/mail/variables/SubmissionEmailVariable.php](https://github.com/pkp/pkp-lib/blob/main/classes/mail/variables/SubmissionEmailVariable.php),
line 122) with `dashboard/editorial?workflowSubmissionId=<id>`, and the
template editor describes it as "The URL to the submission in the
editorial backend". The variable for the public page is
`{$submissionPublishedUrl}` ("The URL to the published submission in its
latest form"), which OPS's `APP\mail\variables\SubmissionEmailVariable::getSubmissionPublishedUrl()`
fills with `preprint/view/<id>`. The sibling template "New Version
Posted Acknowledgement" (`emails.postedNewVersionAck.body`) uses it.

Up to 3.3 the address was right because the code that sent the email
set it itself. On 3.3 the template read `{$publicationUrl}`, which
`APP\Services\PublicationService::publishPublication()` set to
`preprint/view/<id>`. bddc79eec5 (`pkp/ops#210`, `pkp/pkp-lib#7264`,
the variable renames) renamed it `{$submissionUrl}` and still assigned
the preprint page under that name in `APP\publication\Repository::publish()`.
aa83cedd09 (`pkp/pkp-lib#7287`, 2022-09-22) changed that assignment to
the server's home page, a state no release carried. 864f177d21
(`pkp/ops#387`, for `pkp/pkp-lib#5716`, the Manage Emails rework) moved
the sending into `APP\observers\listeners\SendPostedAcknowledgement`
as the mailable `PostedAcknowledgement`, which assigns no address, so
`{$submissionUrl}` took the value `SubmissionEmailVariable` gives every
email: the editorial workflow. Introduced names 864f177d21 because its
state is the one 3.4 shipped.

`pkp/pkp-lib#13128` (2026, in 3.5.0-6 and `main`) later turned this
plain-text address into a link
(`APP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks`) but kept
`{$submissionUrl}`, while the same change corrected `SUBMISSION_ACK`,
which had the same mistake, to `{$authorSubmissionUrl}`.

The reach, read in the code unless marked otherwise:

- Stored templates: `email_templates_default_data` holds the text as
  installed, and a manager's customized copy in `email_templates_settings`
  keeps `{$submissionUrl}` too. An install upgraded from 3.3 got it from
  `PKP\migration\upgrade\v3_4_0\I7264_UpdateEmailTemplates`, which maps
  `POSTED_ACK`'s `publicationUrl` to `submissionUrl`, customized copies
  included.
- Every language that translates the template: `bg`, `cs`, `de`, `en`,
  `es`, `mk`, `pt_BR`, `uk`.
- No other OPS template sent to authors links `{$submissionUrl}`: the
  two other OPS templates that do ("Editor Assign", "Revised Version
  Notify") go to moderators, for whom the workflow is the right page.
- One pkp-lib text does: the footer of discussion emails
  (`emails.footer.unsubscribe.discussion`, "Reply to this comment at …"),
  added by `PKP\mail\traits\Discussion` for every participant, authors
  included. It is left out of this fix: it is pkp-lib's, shared by the
  three apps, and an author's address there is a question of its own
  (not walked).

## Proposed fix

Link `{$submissionPublishedUrl}` in the template, and correct the stored
texts in the migration that already rewrites this line
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posted-ack-preprint-url-workflow/fix.diff)):

- `locale/{bg,cs,de,en,es,mk,pt_BR,uk}/emails.po`: in
  `emails.postedAck.body`, `{$submissionUrl}` becomes
  `{$submissionPublishedUrl}` (both the `href` and the shown address).
- `APP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks::up()`, after the
  line that links the address:

  ```diff
           $this->replace('POSTED_ACK', '{$submissionUrl}', '<a href="{$submissionUrl}">{$submissionUrl}</a>', 'href="{$submissionUrl}"');
  +        // The authors are sent the preprint's public page, not its editorial workflow
  +        $this->replace('POSTED_ACK', '{$submissionUrl}', '{$submissionPublishedUrl}');
  ```

  This is the pattern `pkp/pkp-lib#13128` used for `SUBMISSION_ACK`
  ("The URL must be the author's one. Fix it, then link it."): the
  helper `replace()` rewrites the default bodies of every locale and
  every customized copy. `down()` does not turn the address back, with a
  comment saying why: it cannot tell the migration's change from a
  manager's own edit of the same line (pkp-lib's `down()` likewise
  leaves its repaired anchors in place).
- Who it reaches: on `main`, `dbscripts/xml/upgrade.xml` runs the class
  for every install from 3.3.0 to 3.5.x that upgrades to 3.6, noted there
  as "Already executed with 3.5.0-6 but idempotent"; a second run finds
  nothing left to replace, so the amendment needs no new upgrade step.
  On `stable-3_5_0` it runs only for installs already on 3.5.0 (the
  `3.5.0.0`–`3.5.0.99` block); see Backport for 3.4 installs.

Tried on OPS `main` with the first-post fault fixed alongside (so that
the email is sent), and the migration run on the loaded dataset: the
first post of preprint 1 delivered "Preprint Posted Acknowledgement"
with "Preprint URL" `…/index.php/publicknowledge/en/preprint/view/1`,
which opened the preprint signed out. A minor version of preprint 2
posted afterwards delivered "New Version Posted Acknowledgement" with
"available" linking `…/preprint/view/2`, as it does without the fix.

**Alternatives**

- Set `submissionUrl` to the public page in the listener
  (`addData()`), as the code before 864f177d21 did. The template would keep a
  variable whose meaning differs from what the template editor tells a
  manager, and every other email's `{$submissionUrl}` would still mean
  the workflow.
- `{$authorSubmissionUrl}`, the author's own view of the submission. It
  works for a contributor with an account, but not for one without, and
  the email announces that the preprint is online, so the public page is
  the one to give.
- A new migration class instead of the amendment. It would work as well;
  it needs its own entries in both upgrade blocks, for no gain.

**What goes with it**

- The raw "{$signature}" report
  ([pkp-e2e#552](https://github.com/jardakotesovec/pkp-e2e/issues/552))
  proposes a migration over this template too; the team may land it with
  this one and pkp-e2e#551.
- Backport: the diff applies as written to `stable-3_5_0`, where the
  email is sent today. There a 3.4 install upgrading to 3.5.0-x never runs
  `I13128_FixEmailUrlLinks`: the class sits only in the
  `3.5.0.0`–`3.5.0.99` block, and `PKP\migration\upgrade\v3_5_0\InstallEmailTemplates`
  adds only missing templates. The backport should also list the class in
  the `3.1.0.0`–`3.4.9.9` block, after `InstallEmailTemplates`; otherwise
  those installs keep the wrong address until their next 3.5.0-x or 3.6
  upgrade. The same entry would also bring them `pkp/pkp-lib#13128`'s own
  link repairs, which they skip today (read in the code). 3.4 has the
  plain-text address (`Preprint URL: {$submissionUrl}`) and no `I13128`
  migration, so a backport there needs its own replacement.
- Scheduled posts: when a post only schedules the preprint, the email
  goes out at once (spec U49
  [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ops2)).
  With the fix it links `preprint/view/<id>` before that page is public:
  until the posting date it answers with a not-found page to anyone signed out
  (so to a contributor without an account), and shows a preview to a
  signed-in author assigned to the submission
  (`APP\pages\preprint\PreprintHandler::initialize()` and
  `PKP\submission\Repository::canPreview()`; read in the code on `main`
  and 3.5, not walked). That is still a better link than the workflow,
  and when the email is sent is spec U49 OPS2's question.
- The guard: a check in the locale tooling, or a unit test, that no
  template of a mailable sent to authors links `{$submissionUrl}`.

Medium: the code is small (one line in each of eight languages and one
in an existing migration), but the effort scale counts a repair of
stored and customized templates as medium, and the 3.5 backport also
registers the migration for 3.4 upgrades.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posted-ack-preprint-url-workflow/walk.js)
  (helpers in its own `lib.js`) takes steps 1–7; its `nb` mode, the
  control for the fix, posts a minor version of preprint 2 and reads the
  email to `ckwantes@mailinator.com`. On an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/posted-ack-preprint-url-workflow/walk.js [nb]`.
- Walked on OPS `stable-3_5_0` (steps 1–7, as Observed) and `main`
  (steps 1–5: "New Version Posted Acknowledgement" and "Publication
  Published" arrived, both linking `…/preprint/view/1`; no "Preprint
  Posted Acknowledgement"), on PostgreSQL; the fault does not depend on
  the database. Dataset: pkp/datasets 7912e09 (2026-10-14). No server
  error and no script error on either walk.
- Tips: `main` OPS 2ece50497f (lib/pkp b17fadae59); `stable-3_5_0` OPS
  44aec6e131 (lib/pkp 4045d9241e); `stable-3_4_0` OPS acd8ae704b
  (lib/pkp 55c8e406b3); `stable-3_3_0` OPS c5532e2161 (lib/pkp
  5e84acd11b).
- Introduced: `git blame` on line 102 gives abf519999a
  (`pkp/pkp-lib#13128`, the link); `git log -S` takes the variable to
  bddc79eec5, whose `Repository.inc.php` hunk still assigns
  `submissionUrl` the `preprint/view` address. aa83cedd09
  (`pkp/pkp-lib#7287`, 2022-09-22) changed that assignment to the
  server's home page, and 864f177d21 removed it with the move to the
  listener, which assigns none (`pkp/ops#387`, merged 2022-11-30).
- Code read on 3.5 (the walked tip): the same template, listener and
  variables; the listener's `version == 1` test works there, so the
  email is sent. On 3.4 (`upstream/stable-3_4_0`, lib/pkp
  `origin/stable-3_4_0`): the same listener and mailable, the template
  `Preprint URL: {$submissionUrl}<br />` in plain text, and
  `getSubmissionUrl()` giving `workflow/access/<id>`. On 3.3
  (`upstream/stable-3_3_0`): `PublicationService::publishPublication()`
  assigns `publicationUrl` as `preprint/view/<id>`, which the template
  links.
- The fix trial, on OPS `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/posted-ack-preprint-url-workflow/trial-main.diff ops`
  (`fix.diff` together with the first-post fix
  `preprint-posted-acknowledgement/fix-first-post.diff`, since on `main`
  the email is otherwise not sent), then the amended migration's `up()`
  run on the loaded dataset by
  [run-migration.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posted-ack-preprint-url-workflow/run-migration.php)
  (the dataset is already at the current version, so
  `tools/upgrade.php` would not run it), steps 1–6, and on a freshly
  loaded install the `nb` mode. The `nb` mode was also walked without
  the fix. The `down()` comment was added after the trial; `up()` is as
  tried. `fix.diff` applies without offset to `stable-3_5_0` (dry run;
  not walked there).
- Searched: pkp/pkp-lib, pkp/ops and pkp/ui-library for "Preprint URL",
  "posted acknowledgement", `POSTED_ACK`, `PostedAcknowledgement`,
  `SendPostedAcknowledgement`, `submissionPublishedUrl` (2026-10-15).
  `pkp/pkp-lib#13128` and `pkp/pkp-lib#8427` (`{$authorPrimary}` in the
  same template) touch the template but not the address.
- Not driven: a customized copy of the template (the dataset holds
  none); an upgrade from 3.3 or 3.4; the other seven languages; a
  contributor without an account (the walk's signed-out step stands for
  one); a scheduled post with the fix; the manager's template edit.
