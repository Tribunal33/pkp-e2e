# A signed-in user who may not submit to a preprint server reads a raw translation key instead of the reason

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; no "Not Allowed" page)
- **Introduced** `pkp/ops#411` (opened by Alec Smecher, asmecher) for `pkp/pkp-lib#7191` · [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e) · 2022-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A signed-in user who opens "New Submission" on a preprint server and
may not submit there gets the "Not Allowed" heading with a raw locale
code where the explanation and the server's contact link should be:
"##submission.wizard.notAllowed.description##" when authors must be
registered by the staff, and
"##submission.wizard.noSectionAllowed.description##" when every section
is closed to authors. A journal and a press show the proper text, in
every language that has it.

Both cases follow a deliberate setting: by default the "Author" role
allows self-registration and every section is open. The user can find
the contact on the server's "About" page. OPS lacks the two texts the
journal and the press define.

## Impact

- **Lost.** The reason for the refusal and the link to the server's
  contact.
- **Who.** Two kinds of signed-in user trying to submit:
  - on a server whose "Author" role does not allow self-registration,
    anyone without the Manager or Author role, Moderators included;
  - on a server whose sections are all inactive or restricted to
    Managers and Moderators, any author.
- **Way round.** The user can look up the contact on the server's
  "About" page. The staff can enrol the person in the "Author" role
  (Users & Roles), or reopen a section; no screen lets them supply the
  missing text.

Low: a missing text, with a way round for the user and for the staff.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, the preprint server
  `publicknowledge`.

Authors must be registered by the staff:

1. Sign in as `dbarnes`.
2. Go to Settings › Users & Roles › "Roles". On the "Author" row, open
   its arrow, press "Edit", untick "Allow user self-registration" and
   press "OK".
3. Sign out. On the Login page press "Register", fill in the form
   (username `newauthor`, any name, email and password), tick the
   privacy consent and press "Register". "Registration complete"
   appears, signed in.
4. Open "New Submission" (`/index.php/publicknowledge/en/submission`).

Every section closed:

1. Load the dataset afresh. Sign in as `dbarnes`.
2. Go to Settings › Server › "Sections". On the "Preprints" row, open
   its arrow, press "Edit", tick "Items can only be submitted by
   Managers and Moderators." and press "Save". (The last active section
   cannot be made "Inactive".)
3. Sign out, and sign in as `ccorino`.
4. Open "New Submission" (`/index.php/publicknowledge/en/submission`).

**Expected.** The heading "Not Allowed" over an explanation worded for a
preprint server, as the journal words its own: "You are not allowed to
submit to this preprint server because authors must be registered by
the editorial staff. If you believe this is an error, please contact
Ramiro Vaca." (the name a link to the server's contact email), and in
the second case "… because submissions to all sections of this server
have been deactivated or restricted. If you believe this is an error,
please contact Ramiro Vaca."

**Observed.**

```
Home / Not Allowed
Not Allowed
##submission.wizard.notAllowed.description##
```

and in the second case:

```
Home / Not Allowed
Not Allowed
##submission.wizard.noSectionAllowed.description##
```

After step 2 of the first group, the Moderator `dbuskins`, signing in
and opening "New Submission", gets the first page too. The same steps on
the journal (with "Reviews" made inactive and "Articles" restricted)
read "You are not allowed to submit to this journal because authors must
be registered by the editorial staff. If you believe this is an error,
please contact Ramiro Vaca." and "… because submissions to all sections
of this journal have been deactivated or restricted. …".

## Cause

OPS's `SubmissionHandler::start()`
([`pages/submission/SubmissionHandler.php` lines 49–74](https://github.com/pkp/ops/blob/c8af945bb7/pages/submission/SubmissionHandler.php#L49-L74))
shows the error page with `__('submission.wizard.notAllowed.description')`
when `getSubmitUserGroups()` returns no group, and with
`__('submission.wizard.noSectionAllowed.description')` when
`getSubmitSections()` returns no section. On `main` and 3.5 the first is
OPS's own `getSubmitUserGroups()`
([lines 306–334](https://github.com/pkp/ops/blob/c8af945bb7/pages/submission/SubmissionHandler.php#L306-L334),
216ba1f646, `pkp/pkp-lib#10929`): it accepts the user's Manager,
Administrator or Author groups, and otherwise the server's Author role
when that role allows self-registration. A Moderator holds none of
these, so is refused once self-registration is off.

Neither key is defined anywhere OPS loads its texts: not in OPS's
`locale/*/submission.po`, not in pkp-lib's. OJS defines both in its own
`locale/en/submission.po`, worded for a journal; OMP defines the one its
handler uses (a press checks only user groups), worded for a press.
`Locale::translate()` returns `##key##` for a missing key, and the error
page prints it.

The two calls came to OPS with the new submission wizard (8fd2c6d834,
`pkp/pkp-lib#7191`), a copy of OJS's `start()`. OJS's texts were added in
its own repository the day before (6358d611e3), and never to OPS's.

Reach:

- Both refusals of the "Make a Submission" page, in every language.
  Walked: English on `main` and 3.5; other languages by code, since no
  OPS locale file has either key.
- pkp-lib's `PKPSubmissionController`
  ([line 695](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/api/v1/submissions/PKPSubmissionController.php#L695))
  also translates `submission.wizard.notAllowed.description`, as the
  submission API's error when a context has no Author role at all, with
  no `email` or `name`. With the default roles no screen reaches it. The
  fix gives it the OPS text too, its `{$email}` and `{$name}` left
  unfilled, as on OJS today (code).
- A check of every literal key OPS's own classes, pages and templates
  translate, against OPS's and pkp-lib's English texts, finds three more
  missing keys on other screens, left out of this report:
  `archive.noSubmissions` (`templates/frontend/pages/preprints.tpl`),
  `notification.type.formatNeedsApprovedSubmission`
  (`ApproveSubmissionNotificationManager`) and
  `plugins.importexport.common.error.unknownServer`
  (`PubObjectsExportPlugin`, command line). None was driven.

## Proposed fix

Add the two texts to OPS's `locale/en/submission.po`, beside
`submission.wizard.sectionClosed.message`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-not-allowed-page-raw-key/fix.diff),
OPS only):

```diff
+msgid "submission.wizard.notAllowed.description"
+msgstr "You are not allowed to submit to this preprint server because authors must be registered by the editorial staff. If you believe this is an error, please contact <a href=\"mailto:{$email}\">{$name}</a>."
+
+msgid "submission.wizard.noSectionAllowed.description"
+msgstr "You are not allowed to submit to this preprint server because submissions to all sections of this server have been deactivated or restricted. If you believe this is an error, please contact <a href=\"mailto:{$email}\">{$name}</a>."
```

How this was settled:

- **How the code base does it.** OJS's two entries, with the first
  "journal" replaced by "preprint server" and the second by "server",
  and the link's `href` in escaped double quotes, as OPS's neighbouring
  `sectionClosed.message` writes it.
- **Every instance.** The two keys are the only missing ones among the
  `submission.wizard.*` keys OPS and pkp-lib translate.
- **What it touches.** The error page's text and the API error above.
  No code or stored data. It applies as written to 3.5 and 3.4, whose
  handler calls the same two keys and whose locale files lack them.

Tried on `main`. With the diff applied, the two refusals read the
Expected sentences on the preprint server, and `ccorino` opening "New
Submission" before any change got the "Make a Submission" form with the
fix in and out.

**Alternatives**

- Move both texts to pkp-lib with a neutral wording ("this
  {$contextName}"): would change the journal's and the press's wording
  for one app's omission.

**What goes with it**

- The other languages through Weblate. Until a language has the texts it
  shows the raw key, as it does today, since PKP does not fall back to
  English.

Small: two entries in one locale file, tried.

## Evidence

- Kept scripts:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-not-allowed-page-raw-key/walk.js)
  takes both groups of Steps on the preprint server and, as the control,
  on the journal; its first read is `ccorino` opening "New Submission"
  before any change.
  [`moderator.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-not-allowed-page-raw-key/moderator.js)
  turns off self-registration on "Author" and reads the Moderator's page,
  after a Manager's control read. Each runs with
  `node bin/probe.js all shared/playwright/checks/issues/preprint-not-allowed-page-raw-key/<script>`
  on an install freshly loaded from the default dataset.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  27f1204 (2026-10-01). No request failed and no script error showed.
- Differences from the Steps: `walk.js` takes both groups in one run
  without reloading the dataset between them; the user-group refusal is
  read before any section is closed. It registers `u21ir34visitorops`,
  and on the journal makes "Reviews" inactive and restricts "Articles"
  ("Items can only be submitted by Editors and Section Editors.").
- Branch heads walked or read: `main` OJS 4408b94def (`lib/pkp`
  f5bd392a69), OPS c8af945bb7 (`lib/pkp` 3dc90c81a6). `stable-3_5_0` OJS
  18d097d94e, OPS 3f0919468c (`lib/pkp` 1fb843f491). OPS `stable-3_4_0`
  acd8ae704b, `stable-3_3_0` c5532e2161.
- Code reads beyond the Cause: pkp-lib's `getSubmitSections()`, OPS's
  `SectionGridHandler::deactivateSection()` (it refuses the last active
  section), every OPS and pkp-lib `locale/*/*.po` for both keys (none).
  On `stable-3_4_0` the same two calls and no locale file with either
  key; the user-group gate there is pkp-lib's `getSubmitUserGroups()`,
  so who is refused differs. On `stable-3_3_0` the old
  `SubmissionHandler.inc.php` has no such page.
- Introduced: `git blame` on the two calls gives 8fd2c6d834, committed by
  Nate Wright and merged in PR `pkp/ops#411`, which asmecher opened
  (merged 2022-12-14). OJS's texts came with 6358d611e3 in pkp/ojs.
- Not driven: OMP (code only: it defines the one key it calls).
