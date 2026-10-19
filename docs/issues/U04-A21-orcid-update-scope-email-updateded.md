# The "Requesting updated ORCID record access" email asks contributors for "updateded permissions"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (the template only: a press never sends it), OPS
  - 3.5: OJS, OMP (the template only), OPS
  - 3.4: none (code; no re-authorization email)
  - 3.3: none (code; no re-authorization email)
- **Introduced** `pkp/pkp-lib#10872` for `pkp/pkp-lib#10819` · [5fafc6ffbb](https://github.com/pkp/pkp-lib/commit/5fafc6ffbb5412b47dfeda38706faedb468e76ca) · 2025-01-23 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U04 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a21)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a journal or preprint server needs a wider ORCID permission from
a contributor, it emails them "Requesting updated ORCID record access".
The email reads "You have previously authorized {journal name} to list
your ORCID id on the site, and we require updateded permissions to add
your contribution to your ORCID profile."

A corrected text in a new release reaches new installs only: each
journal already running keeps its stored copy of the email until its
manager corrects the word in the template under Settings › Workflow ›
Emails. A preprint server does not list the email there, so it cannot.

The email is sent to contributors who verified their iD while the
journal or server used ORCID's public API, once the journal or server
has switched to the member API and one of their works is published.

## Impact

- **Lost:** nothing. The contributor reads a careless sentence in an
  email that asks them for a permission.
- **Who:** each such contributor, every time one of their works is
  published; on OJS also reviewers (read in the code). Only the English
  text has the typo, and the Marathi one, which holds the English
  sentence untranslated. How many journals switch from the public to
  the member API is not known.
- **Way round:** on a journal, the manager opens the email's template,
  types "updated" over the word and saves; the stored copy then holds
  the corrected text, which the email uses. The template offers no reset of its own, and
  "Reset All" on the same page resets every template of the journal and
  brings the typo back. A preprint server has no way round on screen.

Low: a wording error; the permission request itself works.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS for both groups below, OMP
  for "Reading the template", OPS for "Receiving the email".
- The dataset's `config.inc.php` sends mail by SMTP to `localhost:1025`
  (`[email] smtp_server`, `smtp_port`): a mail catcher such as Mailpit
  listening there shows the delivered email. Its `[general] sandbox =
  Off` must stay so: with `sandbox = On` the deposit job fails at once
  and no email is sent.
- For "Receiving the email" only: the contributor verified their ORCID
  iD while the journal used the public API. On OJS that is Diaga Diouf,
  contributor of submission 5 "Genetic transformation of forest trees"
  (in Production; author account `ddiouf`); on OPS, Carlo Corino,
  contributor of submission 1 "The influence of lactation on the
  quantity and quality of cashmere production" (`ccorino`). Only ORCID's
  own sign-in creates that state, so it is written with this SQL, as the
  app stores it after a public-API sign-in (PostgreSQL, MySQL and
  MariaDB):

  ```sql
  INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
  SELECT a.author_id, '', v.setting_name, v.setting_value
  FROM authors a
  JOIN submissions s ON s.current_publication_id = a.publication_id
  CROSS JOIN (
    SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
    UNION ALL SELECT 'orcidIsVerified', '1'
    UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
    UNION ALL SELECT 'orcidAccessScope', '/authenticate'
    UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
    UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
  ) v
  WHERE s.submission_id = 5
    AND a.email = 'ddiouf@mailinator.com';
  -- OPS: s.submission_id = 1 AND a.email = 'ccorino@mailinator.com'
  ```

Reading the template (OJS, OMP):

1. Sign in as `rvaca`.
2. Open Settings › Workflow, tab "Emails", and press "Add and edit
   templates".
3. Type `ORCID` in the search box. Press "Edit" on the row
   "orcidRequestUpdateScope" (the list shows the email under that code
   name, a separate issue).
4. Read the "Body" of the "Edit Template" window.

Receiving the email (OJS, OPS):

5. Sign in as `rvaca`. Open Settings › Users & Roles, tab "ORCID". Tick
   "Enable ORCID functionality", set "ORCID API" to "Member Sandbox",
   "Client ID" to `APP-0000000000000000` and "Client Secret" to
   `00000000-0000-0000-0000-000000000000`, and press "Save".
6. Run the SQL above.
7. Sign out and sign in as `dbarnes`.
   - OJS: open submission 5, Publication › "Title & Abstract", and press
     "Schedule For Publication". In "Review Publishing Details" set the
     version to "Version of Record", choose "Assign To Current/Back
     Issue" and "Vol. 1 No. 2 (2014)", press "Confirm", then "Publish".
     [3.5: "Schedule For Publication" opens "Select an issue to schedule
     for publication"; pick "Vol. 1 No. 2 (2014)", "Save", then
     "Publish".]
   - OPS: open submission 1, press "Post the preprint", then "Post", and
     "Post" in the window that opens.
8. Load any page of the journal or server once or twice: the job runner
   sends the email "Requesting updated ORCID record access", from Ramiro
   Vaca, to `ddiouf@mailinator.com` (OJS) or `ccorino@mailinator.com`
   (OPS).
9. In the mail catcher, read the email's paragraph that begins "You have
   previously authorized".

**Expected:** "You have previously authorized Journal of Public
Knowledge to list your ORCID id on the site, and we require updated
permissions to add your contribution to your ORCID profile."

**Observed:** the template's Body (step 4) reads:

```
You have previously authorized {$contextName} to list your ORCID id on the site, and we require updateded permissions to add your contribution to your ORCID profile.
```

The delivered email (step 9) reads, on OJS:

```
You have previously authorized Journal of Public Knowledge to list your ORCID id on the site, and we require updateded permissions to add your contribution to your ORCID profile.
```

On OPS it reads the same with "Public Knowledge Preprint Server". The
French template on the same installs has no such error.

## Cause

The English text of the email, `emails.orcidRequestUpdateScope.body` in
`lib/pkp/locale/en/emails.po`, has the typo. It came with the email
itself, when `pkp/pkp-lib#10872` added the re-authorization flow. The
Marathi file, `lib/pkp/locale/mr/emails.po`, carries the same English
sentence.

The email is not built from the locale file. When the template is
installed (`PKP\emailTemplate\DAO::installEmailTemplateLocaleData()`, at
install time, or on an upgrade to 3.5 by the step
`I10819_OrcidOauthScopeMail`), the text of each installed language is
copied into `email_templates_default_data`. The "Edit Template" window,
and the job that sends the email (`SendUpdateScopeMail::handle()`,
through `Repo::emailTemplate()->getByKey()`), read it from there, or
from the journal's own edited copy in `email_templates_settings` when
there is one (`DAO::fromRow()`). So every install holds its own stored
copy of the typo.

Reach:

- The three apps share the text through lib/pkp. Journals and preprint
  servers send the email when a deposit finds a contributor's token
  without the member scope: `DepositOrcidSubmission::handle()`
  (lib/pkp) dispatches `SendUpdateScopeMail`. OJS also sends it to
  reviewers from `DepositOrcidReview` (`jobs/orcid/DepositOrcidReview.php`
  in OJS; read in the code only).
- A press never sends the email (it makes no deposits) but lists the
  template.
- A preprint server sends it but does not list it: OPS's
  `APP\mail\Repository::map()` (`classes/mail/Repository.php`) replaces
  the shared list of emails and leaves out the three ORCID emails.

## Proposed fix

Correct the word in the two locale files of pkp-lib
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-update-scope-email-updateded/fix.diff)):

```diff
--- a/lib/pkp/locale/en/emails.po
+++ b/lib/pkp/locale/en/emails.po
@@ -554,7 +554,7 @@
 "<br>\n"
 "<br>\n"
 "You have previously authorized {$contextName} to list your ORCID id on the site, "
-"and we require updateded permissions to add your contribution to your ORCID profile.<br>\n"
+"and we require updated permissions to add your contribution to your ORCID profile.<br>\n"
 "Visit the link to the official ORCID website, login with your profile and "
 "authorize the access by following the instructions.<br>\n"
 "<br>\n"
--- a/lib/pkp/locale/mr/emails.po
+++ b/lib/pkp/locale/mr/emails.po
@@ -566,7 +566,7 @@
 "<br>\n"
 "<br>\n"
 "You have previously authorized {$contextName} to list your ORCID id on the "
-"site, and we require updateded permissions to add your contribution to your "
+"site, and we require updated permissions to add your contribution to your "
 "ORCID profile.<br>\n"
 "Visit the link to the official ORCID website, login with your profile and "
 "authorize the access by following the instructions.<br>\n"
```

The Marathi file is kept by PKP's Weblate (its header names the
project's Weblate), but a fix to an ORCID email's text has been made in
the repository across the locale files before:
`pkp/pkp-lib#13155` changed these emails' bodies in 39 of them, `mr`
included
([8a722c63f3](https://github.com/pkp/pkp-lib/commit/8a722c63f3b81d33ed5916271b57586d1ad93fdc)).
So the `mr` line belongs in the same patch; left to Weblate, it would
wait for a Marathi translator.

Tried on `main` on the three apps, with the template installed again on
an install loaded from the dataset: the template (OJS, OMP) and the
delivered email (OJS, OPS) read "we require updated permissions", and no
other stored template changed.

**Alternatives:**

- Fix `en` only: Marathi keeps the typo until someone translates the
  sentence.

**What goes with it:**

- Stored text. Optionally, one line in
  `I13283_RestoreDegradedOrcidFunctionality::updateEmails()`
  (lib/pkp `classes/migration/upgrade/v3_5_0/`) reinstalls this template
  on upgrade, as the method already does for `ORCID_COLLECT_AUTHOR_ID`:
  `Repo::emailTemplate()->dao->installEmailTemplates(Repo::emailTemplate()->dao->getMainEmailTemplatesFilename(), [], 'ORCID_REQUEST_UPDATE_SCOPE');`.
  It rewrites the stored default of each installed language and leaves
  a journal's edited copy alone. No registration is needed: each app's
  `dbscripts/xml/upgrade.xml` (OJS, OMP and OPS, on `main` and on
  `stable-3_5_0`) already runs the step in two blocks, `3.1.0.0`–`3.4.9.9`
  and `3.5.0.0`–`3.5.0.99`, so it reaches upgrades from 3.4 and from any
  3.5.0.x. Not tried. Whether a typo is worth rewriting stored text is
  the team's call; with it the change is medium.
- Backport: `fix.diff` applies as it stands to `stable-3_5_0`.

Small: one word in two locale files, no code.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-update-scope-email-updateded/walk.js)
  with [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-update-scope-email-updateded/lib.js)
  beside it:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-update-scope-email-updateded/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `STEPS=wayround`
  takes the way round in Impact on OJS: the word typed over, "Save", the
  stored copy and the reopened template read, then "Reset All".
  `STEPS=nb` hashes every stored default template, for the fix trial.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/orcid-update-scope-email-updateded/fix.diff ojs omp ops`;
  on each app a freshly loaded dataset with the template installed again
  (`PKP_CONFIG_FILE=<config> php lib/pkp/tools/installEmailTemplate.php ORCID_REQUEST_UPDATE_SCOPE en,fr_CA`),
  then the Steps; the hashes of all stored default templates (134 on
  OJS, 112 on OMP, 54 on OPS) taken the same way with the fix in and
  out differ only in this template's `en` body. `fix.diff` paths start at
  the app root; in a pkp-lib clone apply it with `-p3`.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default datasets of pkp/datasets eaf024c5 (2026-10-18), each walk on a
  freshly loaded dataset; the way round on OJS `main` only. MySQL not
  checked; nothing in the fault depends on the database.
- Tips:
  - main: OJS 6b4323ced7, OMP 5777025be, OPS f048e747b4 (lib/pkp 042726ebf6 in all three)
  - 3.5: OJS 007c2cd0d6, OMP 2d575f250, OPS e737a9e465 (lib/pkp 092ec34b0f)
  - 3.4: lib/pkp a71d6bd2ca; ORCID Profile plugin 894c2593e0 (OJS)
  - 3.3: lib/pkp 5e84acd11b; ORCID Profile plugin 41864d3770 (OJS)
- Code reads: on `main` and 3.5 only `locale/en/emails.po` and
  `locale/mr/emails.po` of lib/pkp hold "updateded", the same in the
  three apps; no other code or locale file of the apps does. On 3.4 and
  3.3 neither lib/pkp nor the ORCID Profile plugin has the
  re-authorization email or the word. `git blame` on the line names
  5fafc6ffbb on `main` and 3.5.
- The SQL copies what `VerifyIdentityWithOrcid::setIdentityData()` and
  `saveIdentityData()` write after a public-API sign-in.
- Unverified: the reviewer's copy of the email (OJS); the email sent
  after a manager's edit, which uses the edited copy by the code
  (`DAO::fromRow()`), not by a walk; the optional upgrade step.
- Upstream search (2026-10-19): pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ops by "updateded", "require updated permissions", "updated ORCID
  record access" and `ORCID_REQUEST_UPDATE_SCOPE`; nothing matched. The
  open `pkp/pkp-lib#13207` edits the same English file for the ORCID
  emails' names, not this sentence.
