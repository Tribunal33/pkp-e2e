# "Manage Emails" lists the three ORCID emails under code names, after every other email

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OPS (code; through the ORCID Profile plugin, which only these two bundle, when it is on)
  - 3.3: none (code; the list names each email by its subject)
- **Introduced** `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · 2023-10-06 · Erik Hanson (ewhanson); the third name with `pkp/pkp-lib#10872` for `pkp/pkp-lib#10819` · [5fafc6ffbb](https://github.com/pkp/pkp-lib/commit/5fafc6ffbb5412b47dfeda38706faedb468e76ca) · 2025-01-23 · Erik Hanson (ewhanson)
- **Upstream** `pkp/pkp-lib#13207` (open PR, not yet in main), covering the English strings only
- **Tracked in** spec U56 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a journal or a press, the "Manage Emails" list ends with three rows
named "orcidCollectAuthorId", "orcidRequestAuthorAuthorization" and
"orcidRequestUpdateScope", after "Validate Email (Site)" instead of
among the other names. Each email's "Edit Template" window shows its
code in the "Name" box, so only the subject ("Submission ORCID",
"Requesting ORCID record access", "Requesting updated ORCID record
access") says which email it is.

A manager can still find, open and edit the three emails. Most other
interface languages show the codes too.

New English strings, as the open PR `pkp/pkp-lib#13207` proposes, fix
the list on every site at once. They do not fix the "Name" box on
existing sites, which stored the code names when the emails were
installed and keep them until an upgrade step rewrites them.

## Impact

- **Lost**: nothing; the three emails keep working and can be edited.
- **Who**: every manager who opens "Manage Emails" on a journal or a
  press.
- **Way round**: searching "ORCID" lists the three, and their
  descriptions tell them apart. A manager can type a plain name into an
  email's "Name" box and save it, and the box keeps it; the list still
  shows the code.

Low: a label problem, and the task gets done.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS or OMP). Nothing else.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow and press the "Emails" tab.
3. In the line "Email Templates", press "Add and edit templates". The
   page "Manage Emails" opens.
4. Read the list "Emails" to its end.
5. Type `ORCID` in "Search by name or description" and press Enter.
6. Press "Edit" on the first row. "Edit Template" opens; read "Name"
   and "Subject".
7. Close it with the back arrow, and repeat step 6 on the second and
   third rows.

**Expected:** the three ORCID emails have names in plain words, like
every other row ("Submission Acknowledgement", "Review Request"), are
listed among the other names that start with "O", and each one's "Name"
box reads its name.

**Observed:** the list (66 rows on the journal, 56 on the press) ends:

```
Validate Email (Journal Registration)
Validate Email (Site)
orcidCollectAuthorId
orcidRequestAuthorAuthorization
orcidRequestUpdateScope
```

Step 5 keeps those three rows, described "This email is sent to
collect the ORCID id's from authors.", "This email is sent to request
ORCID record access from authors." and "This email is sent to request
member API OAuth scope for ORCID.". "Edit" on each opens "Edit
Template" directly, with no window listing templates in between:

| Row | "Name" | "Subject" |
|---|---|---|
| orcidCollectAuthorId | orcidCollectAuthorId | Submission ORCID |
| orcidRequestAuthorAuthorization | orcidRequestAuthorAuthorization | Requesting ORCID record access |
| orcidRequestUpdateScope | orcidRequestUpdateScope | Requesting updated ORCID record access |

A preprint server lists no ORCID email at all, a separate fault
([U06 OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md));
its stored templates carry the same code names, so they will show once
that is fixed.

## Cause

Each name comes from a locale string, and lib/pkp's English
`locale/en/emails.po` gives the three ORCID name keys their code names:

```
#, fuzzy
msgid "orcid.orcidRequestAuthorAuthorization.name"
msgstr "orcidRequestAuthorAuthorization"

msgid "orcid.orcidRequestUpdateScope.name"
msgstr "orcidRequestUpdateScope"

#, fuzzy
msgid "orcid.orcidCollectAuthorId.name"
msgstr "orcidCollectAuthorId"
```

These strings came with the ORCID emails from the ORCID Profile plugin
(its `plugins.generic.orcidProfile.*.name` keys carry the same values)
when `pkp/pkp-lib#9818` moved ORCID into pkp-lib; `pkp/pkp-lib#10872`
added the third the same way. No other mailable name in lib/pkp's or
the apps' English files is a code. The `#, fuzzy` marks came with a
translations merge (63945bbd82, 2026-09-18); the locale loader reads
fuzzy entries like any other.

The two places on screen read the name differently:

- **The list** shows each mailable's `Mailable::getName()`, which runs
  `__()` on the class's `$name` key on every request
  (`OrcidCollectAuthorId::$name = 'orcid.orcidCollectAuthorId.name'`).
  `ManagementHandler::manageEmails()` and
  `PKPMailableController::getMany()` sort it with `sortBy('name')`, a
  byte-order sort, so names starting with a lower-case letter come after
  every capitalized one. A new locale string shows here at once, on
  every site.
- **"Edit Template"** shows the default template's stored name.
  `EmailTemplate\DAO::installEmailTemplateLocaleData()` translates the
  `name` attribute of `registry/emailTemplates.xml` once, at install,
  and writes it to `email_templates_default_data.name` for each
  installed locale; `EmailTemplate\DAO::fromRow()` reads it from there,
  unless the manager saved a name of their own. On a site upgraded from
  3.4, `I9771_OrcidMigration` and `I10819_OrcidOauthScopeMail` call
  `installEmailTemplates()` with `$skipExisting`, so templates the ORCID
  Profile plugin had installed keep the plugin's code names. A new
  locale string reaches this box only on new installs.

Other languages: 17 translations copy the code names (`fr_CA` and `es`
among them), 49 have no string, so the key shows between hash signs (as
spec U56 A11 records for French), and four (`ar`, `bg`, `de`, `mk`)
have names of their own.

## Proposed fix

Give the three keys names in plain words in
`lib/pkp/locale/en/emails.po`, dropping the two `#, fuzzy` marks, and
rewrite the stored default names with an upgrade migration. The three
diffs share the pkp-lib part and differ only in their app's
`upgrade.xml`
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-emails-listed-under-code-names/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-emails-listed-under-code-names/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-emails-listed-under-code-names/fix-ops.diff)).
The wording is the team's to choose:

```diff
-#, fuzzy
 msgid "orcid.orcidRequestAuthorAuthorization.name"
-msgstr "orcidRequestAuthorAuthorization"
+msgstr "ORCID Record Access Request"

 msgid "orcid.orcidRequestUpdateScope.name"
-msgstr "orcidRequestUpdateScope"
+msgstr "ORCID Updated Record Access Request"

-#, fuzzy
 msgid "orcid.orcidCollectAuthorId.name"
-msgstr "orcidCollectAuthorId"
+msgstr "ORCID Author iD Request"
```

The migration, `PKP\migration\upgrade\v3_5_0\I13207_OrcidEmailTemplateNames`,
sets `email_templates_default_data.name` of the three keys, in each
stored locale, to that locale's string, and skips a locale without one.
It follows `I5716_EmailTemplateAssignments::addDefaultTemplateNames()`,
which named the default templates the same way in 3.4. A name a manager
saved is stored apart from the defaults and stays.

- **Number**: it carries `I13207_` because `pkp/pkp-lib#13207` is the
  only pkp number for this fault; it is renamed if the team opens an
  issue for it.
- **Where it is listed**: the class sits in `v3_5_0` so that the 3.5
  backport is the same file. On `main` each app's
  `dbscripts/xml/upgrade.xml` lists it in the block `<upgrade
  minversion="3.5.0.0" maxversion="3.5.0.99">` and again in `<upgrade
  minversion="3.3.0.0" maxversion="3.5.9.9">` after `I13128_FixEmailUrlLinks`,
  the way `I13128` is listed in both; it is safe to run twice.
- **Backport to 3.5**: the same locale change, the same class at
  `lib/pkp/classes/migration/upgrade/v3_5_0/`, and one line in each
  app's `3.5.0.0`–`3.5.0.99` block.

Tried on `main`, on the 3.5 default dataset upgraded to 3.6.0.0 (the
upgrade log shows the migration in both blocks): the journal's and the
press's lists show "ORCID Author iD Request", "ORCID Record Access
Request" and "ORCID Updated Record Access Request" after "Notify
Reviewers of Decision", and each "Name" box reads the same. Compared
with the same upgrade without the fix, on OJS, OMP and OPS, only those
three English names changed; the other rows, their order, and every
stored subject and body stayed the same. On a `main` dataset with the
fix applied but no upgrade run, the list changed and the "Name" boxes
kept the code names.

On the journal the three new names come before "Open Access Notify":
the byte-order sort compares "R" with "p" and puts the capital first.

**Alternatives:**

- Merging `pkp/pkp-lib#13207` alone: the list is right on every site,
  but existing sites keep the code names in the "Name" box.
- Sorting the list case-insensitively alone: puts the codes in place,
  but they stay codes. It is a sound companion change in both
  `sortBy('name')` callers, so that "ORCID …" sorts after "Open Access
  Notify"; it is left out of this fix and its effort.
- Renaming the keys to the `mailable.*.name` pattern of the other
  emails: every translation would lose its string, for no gain on
  screen.

**What goes with it:**

- Translators replace the code names in the other languages; the
  migration stores whatever each language holds when it runs.
- 3.4: no change to the ORCID Profile plugin is asked for. A 3.4 site
  that upgrades carries the plugin's code names over, and this
  migration rewrites them.

Medium: a locale change and a migration in pkp-lib, a line in each
app's `upgrade.xml`, and a repair of names stored on every existing
site.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-emails-listed-under-code-names/walk.js)
  takes the Steps; `STEPS=nb` runs the neighbour check (the whole list,
  every stored default template's name, subject and body hash, and
  "Edit" on the first ORCID row), and `STEPS=wayround` types a name into
  the first ORCID email's "Name" box and saves it. On an install freshly
  loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/orcid-emails-listed-under-code-names/walk.js`
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL,
  the default datasets from pkp/datasets 566bb1f (2026-10-03). On 3.5
  the lists hold 67 and 57 rows and end the same way. The way round was
  walked on OJS and OMP `main`: after "Save" the "Name" box reopens with
  the typed name, which is stored for the context, and the list row
  keeps the code.
- The fix was tried with the three diffs on `main`, on the
  `stable-3_5_0` dataset (3.5.0.5) upgraded by `tools/upgrade.php`; the
  neighbour check ran on that upgrade with and without the fix. The
  upgrade from a 3.4 site with the ORCID Profile plugin was not run;
  that path is read in the code (`I9771_OrcidMigration`,
  `installEmailTemplates()` with `$skipExisting`).
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04), OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c,
  OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1,
  OMP 0aec65441f, OPS acd8ae704b (lib/pkp 767353f4fe); `stable-3_3_0`
  OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp ac3fa73402,
  ui-library 96959f9ed4).
- Code reads beyond the Cause:
  - The language counts are from every `locale/*/emails.po` in lib/pkp
    on `main`, for `orcid.orcidCollectAuthorId.name`.
  - 3.4: lib/pkp's `locale/en/emails.po` has no ORCID string. OJS and
    OPS bundle the ORCID Profile plugin as a submodule; OMP does not.
    The plugin's `stable-3_4_0` `locale/en/emails.po` gives
    `plugins.generic.orcidProfile.orcidCollectAuthorId.name` and
    `…orcidRequestAuthorAuthorization.name` the same code names, its
    `OrcidCollectAuthorId` mailable uses that key, and the plugin adds
    both mailables to the list through the `Mailer::Mailables` hook,
    which `Mail\Repository::getMany()` calls. Not walked; whether the
    hook runs on that page with the plugin on is unverified.
  - 3.3: ui-library's `EmailTemplatesListItem.vue` titles each email
    with its subject; the plugin's templates have no name.
- Upstream: the names were first suggested in a comment on
  `pkp/pkp-lib#13050` (closed for another fault), where the maintainer
  asked for a separate PR, which became `pkp/pkp-lib#13207`. Searched
  2026-10-04 in pkp/pkp-lib, pkp/ojs, pkp/ui-library and
  pkp/orcidProfile.
