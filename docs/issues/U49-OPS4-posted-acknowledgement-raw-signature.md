# Authors' "preprint posted" emails end with a raw "{$signature}" instead of the server's signature

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#210` for `pkp/pkp-lib#7264` · [bddc79eec5](https://github.com/pkp/ops/commit/bddc79eec58ae4f1f295e9e1cf771adba023e142) · 2021-12-16 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#8348` (closed with a fix), the same fault in other automatic emails, not these two
- **Tracked in** spec U49 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ops4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Both emails a preprint server sends contributors when a preprint is
posted, "Preprint Posted Acknowledgement" and "New Version Posted
Acknowledgement", end with the text "{$signature}" where the server's
signature should be. By default that signature reads "This is an
automated message from <server name>", linked to the server.

A manager can correct the two templates in Manage Emails (Settings ›
Workflow › Emails › "Add and edit templates"), once per language. The
fix in the software has to repair stored and customized templates too,
on servers upgraded from 3.3 as well as new ones, in several languages.

## Impact

- **Lost**: the server's sign-off, whatever the manager put in Settings
  › Workflow › Emails › "Signature" (by default the line above, with a
  link to the server). Authors see a code fragment in its place.
- **Who**: every contributor with an email address, on every post,
  wherever "Preprint Posted" (Settings › Workflow › Emails) is "Send an
  email to all authors." (the default). It affects new servers and
  servers upgraded from 3.3, whose working template the 3.4 upgrade
  rewrote into the broken form, customized copies included. All eight
  languages that translate the templates carry it, English included.
- **Way round**: in Manage Emails, where the two are listed as "Posted
  Acknowledgement" and "New Version Posted", replace "{$signature}" with
  "{$contextSignature}" or remove it, in each language. Nobody is told
  they need to.

Low: the sign-off is missing and a placeholder shows. A server whose
signature is the only place its contact address appears would lose
that, which would raise it.

## Steps to reproduce

Preconditions: PKP's default test dataset, OPS `main` (or
`stable-3_5_0`). Nothing is created beforehand.

- Preprint 1, "The influence of lactation on the quantity and quality of
  cashmere production", is in Production and has never been posted; its
  one contributor is Carlo Corino (`ccorino@mailinator.com`).
- Preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative
  Study Of Construct Equivalence", is posted; its contributors are
  Catherine Kwantes (`ckwantes@mailinator.com`) and Urho Kekkonen.
- Settings › Workflow › Emails: "Preprint Posted" has "Send an email to
  all authors." selected, and "Signature" ("Emails sent automatically on
  behalf of the preprint server will have the following signature
  added.") holds "This is an automated message from Public Knowledge
  Preprint Server".

First post:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open preprint 1 from "Active submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. In the "Preprint" menu open "Title & Abstract", press "Post", and in
   the "Post the preprint" window press "Post".
4. Read the email that arrives at `ccorino@mailinator.com`.

A later version:

5. Still as `dbarnes`, open preprint 2
   (`…/dashboard/editorial?workflowSubmissionId=2`).
6. In the "Preprint" menu press "Create New Version", choose "Minor
   Revision" under "Revision Significance" and press "Confirm". [3.5:
   "Create New Version" is a button above the preprint's "Title &
   Abstract" page, answered "Yes".]
7. Open the new version's "Title & Abstract", press "Post", and "Post"
   again in the window.
8. Read the email that arrives at `ckwantes@mailinator.com`.

**Expected**: whichever acknowledgement arrives (on `main` step 4
delivers the wrong one, reported apart), it ends "If you have any
questions, please contact me." followed by the server's signature, "—
This is an automated message from Public Knowledge Preprint Server.".

**Observed**: both emails end with the placeholder. Step 4 on `main`:

```
Subject: New Version Posted Acknowledgement

Dear Carlo Corino, Thank you for posting a new version of your preprint to
Public Knowledge Preprint Server. The new version is now available. If you
have any questions, please contact me. {$signature}
```

Step 4 on 3.5:

```
Subject: Preprint Posted Acknowledgement

Carlo Corino: Your preprint, "The influence of lactation on the quantity
and quality of cashmere production" has been posted online on Public
Knowledge Preprint Server. Preprint URL: … If you have any questions,
please contact me. {$signature}
```

Step 8 on `main` delivers "New Version Posted Acknowledgement" to Catherine
Kwantes and Urho Kekkonen, ending "…please contact me. {$signature}".
The "Publication Published" email each post also sends to the author's
account is complete.

## Cause

`{$signature}` is the signature of the user who sends an email. Only a
mailable with the `Sender` trait has it: `sender($user)` adds a
`SenderEmailVariable`, which fills `signature` from that user. The
posted acknowledgements are sent by no user. `APP\observers\listeners\SendPostedAcknowledgement::handle()` sends
them from the server's contact (`from(contactEmail, contactName)`), and
`PostedAcknowledgement` and `PostedNewVersionAcknowledgement` have no
`Sender` trait, so nothing fills the variable and it is sent as it
stands.

Yet both templates end with it, in `locale/en/emails.po`
(`emails.postedAck.body`, `emails.postedNewVersionAck.body`) and in
every other locale that translates them. bddc79eec5 (for
`pkp/pkp-lib#7264`, the email variable renames) changed the posted
acknowledgement's `{$editorialContactSignature}` to `{$signature}`,
while the code that sent it at the time,
`APP\publication\Repository::publish()`, still assigned
`editorialContactSignature`. 864f177d21 (`pkp/ops#387`) moved the
sending into the listener without any signature, and the new-version
template came with `{$signature}` already in it (8fd2c6d834,
`pkp/ops#411`).

The 3.4 upgrade carried the fault into installs that worked on 3.3:
`PKP\migration\upgrade\v3_4_0\I7264_UpdateEmailTemplates` maps
`POSTED_ACK`'s `editorialContactSignature` to `signature` in the stored
templates, the customized ones included (OPS's subclass renames only
the `context…` variables).

The rule the templates break is the one `pkp/pkp-lib#8348` settled for
3.4: an email the system sends on its own signs with
`{$contextSignature}` (the server's "Signature"), as OPS's
`SUBMISSION_ACK` and `SUBMISSION_ACK_NOT_USER` do. That fix changed
several templates but not these two.

The reach, read in the code unless marked otherwise:

- The stored templates: `email_templates_default_data` holds the text as
  installed, and a customized copy in `email_templates_settings` keeps
  "{$signature}" unless the manager removed it, whether it was edited on
  3.4 or later or rewritten by the 3.4 upgrade.
- No other OPS template the system sends on its own ends with
  `{$signature}`: the others that carry it (`USER_REGISTER`, the
  decision emails) are sent by a user. The `ISSUE_PUBLISH_NOTIFY` text
  in OPS's locale files is never installed on a preprint server.

## Proposed fix

Sign both templates with `{$contextSignature}` in OPS's locale files, and
repair the stored texts with an upgrade migration
([fix-signature.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/fix-signature.diff)):

- `locale/{bg,cs,de,en,es,mk,pt_BR,uk}/emails.po`: `{$signature}` becomes
  `{$contextSignature}` in `emails.postedAck.body` and
  `emails.postedNewVersionAck.body` (15 strings; the other locales leave
  them untranslated).
- A migration, `APP\migration\upgrade\v3_5_0\I00000_PostedAckContextSignature`
  (to be named after the pkp issue). Per key (`POSTED_ACK`,
  `POSTED_NEW_VERSION_ACK`) it replaces `{$signature}` by
  `{$contextSignature}` in the default bodies
  (`email_templates_default_data`) and in the customized copies. Those
  are found through `email_templates`, by `email_key`, since
  `email_templates_settings` holds only the `email_id`. This is the
  pattern of OPS's own `APP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks`,
  whose per-key `replace()` already rewrites `POSTED_ACK`; two
  `replace()` calls in a migration built on it would do the same.
- Registered in `dbscripts/xml/upgrade.xml` in the block that upgrades
  3.3 to 3.5 installs to 3.6 (`minversion="3.3.0.0"
  maxversion="3.5.9.9"`), after `I13128_FixEmailUrlLinks`, so it runs
  after the 3.4 step that produced the broken text. It only touches
  bodies that still hold `{$signature}`, so it is safe to run twice, as
  it will on an install that gets it in a 3.5.0-x upgrade (the
  `maxversion="3.5.0.99"` block) and again on the way to 3.6.

Tried on OPS `main`, with the migration run on the loaded default
dataset: the stored `en` bodies of both templates then end with
`{$contextSignature}`, and the acknowledgement of preprint 1's first
post ended "If you have any questions, please contact me. — This is an
automated message from Public Knowledge Preprint Server.". A later
version of preprint 2 got the same signed ending, and the "Publication
Published" email both posts send was the same with the fix as without
it.

**Alternatives**

- Fill `signature` in the listener (`addData(['signature' => …])`). It
  turns the symptom off, but the templates would keep a variable the
  template editor does not list for them
  (`Mailable::getDataDescriptions()` offers `{$signature}` only for
  mailables with `Sender`), and they would sign differently from every
  other email the server sends on its own.
- Send the acknowledgement as the user who posted. Authors would get the
  moderator's personal signature under an email that comes from the
  server's contact address.

**What goes with it**

- Backport: the same locale lines and migration apply to
  `stable-3_5_0`, the migration in that line's 3.5.0-x block. 3.4 has
  the same text and would need the same change.
- The guard: a unit test, or a check in the locale tooling, that a
  mailable without the `Sender` trait has no `{$signature}` in its
  template; it would also have caught the templates `pkp/pkp-lib#8348`
  fixed.

Medium: besides the text in eight languages, an upgrade migration must
repair stored and customized templates.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/lib.js))
  takes steps 1–4 and reads the mailbox, keeping only messages that link
  to the install walked; its `nb` mode takes steps 5–8. On an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-posted-acknowledgement/walk.js [nb]`.
- Walked on OPS `main` (steps 1–8) and `stable-3_5_0` (steps 1–4), on
  PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets e8dafbc (2026-10-02).
- Tips: `main` OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OPS
  38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OPS acd8ae704b (lib/pkp
  32b0f4b4af); `stable-3_3_0` OPS c5532e2161 (lib/pkp f6ab331645).
- Introduced: `git blame` on the `"{$signature}"` line of
  `emails.postedAck.body` gives bddc79eec5 (through the 2023 move from
  `locale/en_US`); its `Repository.inc.php` hunk keeps
  `editorialContactSignature`. 864f177d21 is `pkp/ops#387` (Nate Wright,
  NateWr).
- Code read on 3.4 (`upstream/stable-3_4_0`, lib/pkp
  `origin/stable-3_4_0`): the same listener, the same two mailables
  without `Sender`, and both `en` bodies ending `{$signature}`. On 3.3
  (`upstream/stable-3_3_0`): `APP\Services\PublicationService::publishPublication()`
  sends `POSTED_ACK` with `editorialContactSignature` assigned, and the
  template ends `{$editorialContactSignature}`. The 3.4 rewrite of
  stored templates: `I7264_UpdateEmailTemplates::oldNewVariablesMap()`,
  key `POSTED_ACK`, in lib/pkp `main` (the same map runs on every
  upgrade from 3.3).
- `pkp/pkp-lib#8348` (closed 2023, before 3.4 shipped, so with no
  migration) fixed `SUBMISSION_ACK`, `USER_VALIDATE_CONTEXT` and others.
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-posted-acknowledgement/fix-signature.diff ops`,
  the migration's `up()` run by
  [run-migration.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/run-migration.php)
  (the dataset is already at the current version, so
  `tools/upgrade.php` would not run it), steps 1–4, and the same on a
  freshly loaded install for steps 5–8; then
  `node bin/try-fix.js revert … ops`.
- Not driven: a customized copy of the templates (the migration's update
  of customized copies ran, but the default dataset holds none); an
  upgrade from 3.3; the other seven languages; steps 5–8 on 3.5.
  Unverified: how a language without its own translation of the two
  templates is sent.
