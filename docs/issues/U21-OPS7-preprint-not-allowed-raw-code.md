# A user turned away from a preprint server's "Make a Submission" sees a raw code instead of the reason

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; no "Not Allowed" page)
- **Introduced** `pkp/ops#411` for `pkp/pkp-lib#7191` · [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e) · 2022-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A signed-in user whom a preprint server does not let submit gets the
"Not Allowed" page. In place of the explanation it shows the raw code
"##submission.wizard.notAllowed.description##" or
"##submission.wizard.noSectionAllowed.description##", so they are not
told why they were refused or whom to contact. A journal and a press
show the proper sentence, with a link to the contact.

No submission or data is lost, and the refusal itself is right; only the
explanation and the contact's link are missing. The user can still find
the contact under About › "Contact".

## Impact

- **Lost.** The reason for the refusal, and the contact's name and email
  link that the sentence carries.
- **Who.** Two kinds of user, on a preprint server set up to turn them
  away:
  - An account with no role that may submit (Reader only, for example),
    on a server where the manager has unticked "Allow user
    self-registration" on the Author role. Anyone who registers after
    that holds only Reader.
  - An author, on a server whose sections are all deactivated or
    restricted to managers and moderators.

  Both need a manager to change a default, so few servers show the
  page. Where it shows, it shows the code in whatever language the
  user reads the site in.
- **Way round.** The server's contact page (About › "Contact" in the
  default menu) gives the same name and email. Nothing on the refusal
  page points there.

Low: a raw translation key in place of an explanation.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`: "Public Knowledge Preprint
  Server" (`publicknowledge`), with one section, "Preprints". The
  journal of OJS `main` is the control.

Every section closed to authors:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Settings › Server › "Sections"; on "Preprints", open the row's
   actions › "Edit".
3. Tick "Items can only be submitted by Managers and Moderators." ›
   "Save". (A server always keeps one active section, so restricting it
   is the way to close it.)
4. Sign out; sign in as `ccorino` (an author).
5. Open "New Submission" (`/index.php/publicknowledge/submission`).

Self-registration off:

6. Sign in as `dbarnes`; Settings › Users & Roles › "Roles"; on
   "Author", open the row's actions › "Edit".
7. Untick "Allow user self-registration" › "OK".
8. Sign out. "Register": given name "u21w41", family name "Visitor",
   affiliation "u21w41", a country, email "u21w41@mailinator.com",
   username "u21w41", password "u21w41u21w41" twice, tick the privacy
   consent › "Register". The new account is signed in.
9. Open `/index.php/publicknowledge/submission`.

**Expected.** Step 5: "Not Allowed", then "You are not allowed to submit
to this server because submissions to all sections of this server have
been deactivated or restricted. If you believe this is an error, please
contact Ramiro Vaca." Step 9: "Not Allowed", then "You are not allowed
to submit to this server because authors must be registered by the
editorial staff. If you believe this is an error, please contact Ramiro
Vaca." In both, "Ramiro Vaca" links to `mailto:rvaca@mailinator.com`.

**Observed.** Step 5:

```
Not Allowed
##submission.wizard.noSectionAllowed.description##
```

Step 9:

```
Not Allowed
##submission.wizard.notAllowed.description##
```

The French (Canada) page of step 5
(`/index.php/publicknowledge/fr_CA/submission`) shows the same code
under "Non autorisé".

Control: the same steps on the OJS journal (step 3 on both "Articles"
and "Reviews") read "You are not allowed to submit to this journal
because submissions to all sections of this journal have been
deactivated or restricted. If you believe this is an error, please
contact Ramiro Vaca." and "…because authors must be registered by the
editorial staff…".

## Cause

OPS's start screen,
[`SubmissionHandler::start()` lines 52–73](https://github.com/pkp/ops/blob/c8af945bb7/pages/submission/SubmissionHandler.php#L52-L73),
passes `__('submission.wizard.notAllowed.description', …)` and
`__('submission.wizard.noSectionAllowed.description', …)` to
`showErrorPage()`. Neither key has a text in any of OPS's locale files,
nor in pkp-lib's, which holds only the heading,
`submission.wizard.notAllowed` ("Not Allowed"). `Locale::translate()`
falls back to no other language, so it returns the key between hash
signs
([`Locale.php` line 525](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/i18n/Locale.php#L525)).

The handler is OJS's own, copied when the new submission wizard came in
(8fd2c6d834 in OPS, 6358d611e3 in OJS, both for `pkp/pkp-lib#7191`).
OJS's commit added both texts to OJS's `locale/en/submission.po` with
journal wording, and OMP's added the one its handler uses with press
wording; OPS's commit added the calls without the texts. Translators
work from each app's English file, so no OPS language has them either:
OJS has both in English and 45 other languages, OPS in none.

Reach:

- Both refusals of the start screen, in every language (checked on
  screen in English and, for step 5, French (Canada); the others in the
  code).
- OJS and OMP are not affected (checked on screen, main and 3.5).
- Other texts OPS's own code asks for that have no English entry in OPS
  or pkp-lib, found by the same search and not covered by this fix (code
  only, not driven): `submission.sectionNotFound` (pkp-lib's submission
  validation; OJS and OMP define it),
  `user.authorization.serverDoesNotPublish`,
  `editor.submissions.galleyLabelRequired`,
  `manager.setup.form.section.nameRequired` and
  `notification.type.formatNeedsApprovedSubmission` (OMP defines it).

## Proposed fix

A proposal; the team decides. Add the two texts to OPS's English locale, with the server wording OPS
uses elsewhere ("The server has been notified…"), next to the other
start-screen text, `submission.wizard.sectionClosed.message`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-not-allowed-raw-code/fix.diff)):

```diff
--- a/locale/en/submission.po
+++ b/locale/en/submission.po
@@ -237,6 +237,18 @@
 
 msgid "submission.wizard.sectionClosed.message"
 msgstr "{$contextName} is not accepting submissions to the {$section} section. If you need help recovering your submission, please contact <a href=\"mailto:{$email}\">{$name}</a>."
+
+msgid "submission.wizard.notAllowed.description"
+msgstr ""
+"You are not allowed to submit to this server because authors must be "
+"registered by the editorial staff. If you believe this is an error, please "
+"contact <a href='mailto:{$email}'>{$name}</a>."
+
+msgid "submission.wizard.noSectionAllowed.description"
+msgstr ""
+"You are not allowed to submit to this server because submissions to all "
+"sections of this server have been deactivated or restricted. If you believe "
+"this is an error, please contact <a href='mailto:{$email}'>{$name}</a>."
 
 msgid "submission.forTheEditors"
 msgstr "For Readers"
```

This follows how OJS and OMP hold the same texts: in the app's own
locale, in the app's own words. The other languages then reach
translators on Weblate as new strings; until a language has them, it
keeps showing the code (as French (Canada) did with the fix in).

Tried on `main`: with the fix, steps 5 and 9 showed the Expected
sentences with the "Ramiro Vaca" mail link, and an author still got the
"Make a Submission" form while the section was open.

**Alternatives:**

- One pkp-lib text for all three apps, naming the context by its name
  (as `submission.wizard.sectionClosed.message` does with
  `{$contextName}`): tidier, but drops OJS's 45 translations and OMP's
  until they are redone.
- Seed OPS's other languages by copying OJS's translations with
  "journal" replaced: quicker for readers, but word swaps break grammar
  in many languages; that is translators' work.

**What goes with it:**

- No stored data: the text is translated each time the page is shown.
- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0` (`git apply --check`, `patch --dry-run`).
- Test: an e2e check that the refused start screen on OPS shows no
  `##…##` key, which spec U21 Rule 3 covers.

Small: two entries in one locale file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-not-allowed-raw-code/walk.js)
  takes the Steps on OPS and OJS (OMP: the self-registration path only,
  unticking "Author", "Chapter Author" and "Volume editor", the three
  author roles the press dataset lets users register for; a press has no
  sections), first opening the start screen as the author while
  everything is open (the neighbour check), and records each page's
  heading, message, mail link and every `##…##` key:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-not-allowed-raw-code/walk.js`,
  on an install reset to the default dataset; on 3.5 with
  `PKP_E2E_LINE=stable-3_5_0` in front. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-not-allowed-raw-code/fix.diff ops`
  around the same walk on OPS, then reverted.
- Tips: OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7)
  (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)),
  OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73)
  (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc)),
  OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794c);
  `stable-3_5_0`: OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd),
  OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48),
  OMP [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00), pkp-lib
  [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62). The 3.5
  walk showed the same codes on OPS and the sentences on OJS and OMP.
  PostgreSQL; the fault does not depend on the database.
- Contact page: the default dataset's primary menu holds About ›
  "Contact" (`NMI_TYPE_CONTACT`), and pkp-lib's
  `templates/frontend/pages/contact.tpl` shows the contact's name and
  email; read in the code and the database, not driven.
- Code reads: every `.po` under OPS's `locale/` and pkp-lib's `locale/`
  on `main` and `stable-3_5_0` for the two keys (none), OJS's and OMP's
  for comparison. 3.4 (OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d)):
  `SubmissionHandler::start()` lines 52 and 64 call both keys, and no
  English file of OPS or pkp-lib defines them. 3.3 (OPS
  [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161), pkp-lib
  [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)): the
  older wizard has no "Not Allowed" page and neither key appears.
- Other instances: every `__('…')` and `{translate key="…"}` key in OPS's
  `pages`, `classes`, `controllers`, `templates` and `api` and in
  pkp-lib's submission pages and classes, compared with the English
  entries of OPS and pkp-lib; the five keys under Reach were found, most
  other hits being plugin or class names.
- Introduced: `git blame` on lines 56 and 68 and `git log -S` for both
  keys in OPS (8fd2c6d834 is the only commit that touches them); the
  GitHub API lists `pkp/ops#411` ("pkp/pkp-lib#7191 Rewrite submission
  wizard", opened by Alec Smecher (asmecher), merged 2022-12-14) for it.
  OJS's twin commit is
  [6358d611e3](https://github.com/pkp/ojs/commit/6358d611e3).
- Upstream search (2026-10-01; pkp/pkp-lib, pkp/ops, pkp/ui-library,
  issues and PRs): `notAllowed.description`, `noSectionAllowed`, "not
  allowed to submit", "authors must be registered", "Not Allowed" OPS
  submission locale, OPS missing locale keys. Nothing on these texts;
  `pkp/pkp-lib#8765` ("[OPS] Missing localization keys", closed) and
  `pkp/pkp-lib#7996` fixed other keys missing on OPS.
- French (Canada): the step 5 page was walked in French on 3.5 and on
  `main` with the fix in (which adds English only); on `main` without the
  fix it was not walked, the locale files being the same.
- Not driven: 3.4 and 3.3 (code); languages other than English and
  French (Canada) (code); the step 9 page in French (Canada); the five
  other keys under Reach (code).
