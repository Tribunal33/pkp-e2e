# "Invite to a role" shows English slips: "Enter at least one details", "take a additional roles", "Are you sure want to cancel"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Invite to a role")
  - 3.3: none (code; no "Invite to a role")
- **Introduced** `pkp/pkp-lib#10558` for `pkp/pkp-lib#9658` · [e8bdca4673](https://github.com/pkp/pkp-lib/commit/e8bdca46737fb77d39a7a041cec5f7526dd07835) · 2024-10-24 · Ipula Indeewara (ipula); the applications' copy of the search step's text came with `pkp/ojs#4497`, `pkp/omp#1748` and `pkp/ops#802` for `pkp/pkp-lib#10575` · [e25e32dc65](https://github.com/pkp/ojs/commit/e25e32dc6519f4be0b8e816b52edf77d54ebf5b0) · 2024-10-31 · Dulip Withanage (withanage), Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who invites someone to a role from Settings › Users & Roles
reads broken English on the wizard's pages. The search page says "Enter
at least one details to get started" and "If the user already exist in
the system, you can view user information and invite to take a
additional roles.". The "Cancel" question asks "Are you sure want to
cancel this invitation?", and the email page's description mentions
"GDPR polices".

Every page works and the meaning is clear, so nothing is lost. The
slips sit on a screen every journal, press and preprint server uses to
add people.

Only the English texts are affected; other languages have their own
translations. The fix is a few words of text, but in four repositories:
pkp-lib and each of the three applications.

## Impact

- **Lost.** Nothing: wording only.
- **Who.** Managers, each time they invite someone to a role. The
  invitation email the person receives does not carry these texts.
- **Way round.** None needed; the texts are understood as they are.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`. Nothing else; no email is sent.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and
   press "Invite to a role".
3. Read the paragraph under the heading "STEP 1 - Search User".
4. Type `dbuskins@mailinator.com` into "Search for a user by email
   address, username, or ORCID iD" and press "Search User".
5. On the page headed "STEP 2 - Enter details and invite for roles",
   press "Cancel" and read the "Cancel Invitation" window. Press "Go
   Back".
6. In the empty role row choose "Author", today as "Start Date" and
   "Does not appear on the masthead", then press "Save And Continue".
7. Read the paragraph under the heading "STEP 3 - Modify email shared
   with the user". Nothing needs to be sent.

**Expected.** Correct English. For the search page, pkp-lib's own text:
"If the user does not exist, you can invite them to take on roles. If
the user already exists in the system, you can view their information
and invite them to take on additional roles."; the "Cancel" window asks
"Are you sure you want to cancel this invitation?"; the email page says
"GDPR policies".

**Observed.** On OJS; OMP and OPS read "press" and "server" for
"journal":

```
Search page (step 3):  Search for the user using their email address, username or ORCID ID. Enter at
                       least one details to get started. If the user does not exist, you can invite
                       them to take up roles and be a part of your journal. If the user already exist
                       in the system, you can view user information and invite to take a additional
                       roles.
Cancel window (step 5): Cancel Invitation
                       Are you sure want to cancel this invitation?
                       [Cancel Invite] [Go Back]
Email page (step 7):   Send the user an email to let them know about the invitation, next steps,
                       journal GDPR polices and ORCID verification
```

## Cause

The texts sit in two places, and both carry slips from the feature's
first version.

The "Cancel" question is pkp-lib's `userInvitation.cancel.message` in
`locale/en/invitation.po`, written "Are you sure want to cancel this
invitation?" when the wizard came in (e8bdca4673) and never corrected.
The email page's description is each application's own
`userInvitation.sendMail.stepDescription` ("GDPR polices"), in its
`locale/en/invitation.po`.

The search page's text is a stale copy. pkp-lib's
`userInvitation.searchUser.stepDescription` first held the sentence
shown above. On 2024-10-31 and 2024-11-01 each application gave the
invitation texts its own `locale/en/invitation.po`, to say "journal",
"press" or "server". OJS copied this text as it was, and OMP and OPS
copied it with "press" and "server" for "journal". pkp-lib then
rewrote its own copy in `pkp/pkp-lib#10895`
([c2f9b5e9f9](https://github.com/pkp/pkp-lib/commit/c2f9b5e9f9a0d925e3c2350a55b9a37e4d147813),
2025-02-25) into the correct, context-free text quoted under Expected.
The applications' copies were not updated, and an application's text
wins over pkp-lib's for the same key, so every install still shows the
old one.

Reach:

- The search page, the "Cancel" window and the email page, on every
  application (seen on screen).
- `userInvitation.searchUser.stepDescription` is read by
  `SendInvitationStep::invitationSearchUser()`, for the search page,
  and also by `AcceptInvitationStep::verifyOrcidStep()`, which passes
  it as the description of the invitee's ORCID section, a copy-paste
  slip. The acceptance page shows only each step's own description, so
  that use never reaches the screen (read in the code).
- Two more English slips are on the invitee's side, the acceptance page
  the email's "Accept Invitation" link opens, and were read in the code,
  not seen: the ORCID step's "If you chose to skip it now" (each
  application's `acceptInvitation.verifyOrcid.stepDescription`, shown
  only when ORCID is set up for the context) and the given-name help
  "it is tha part of a personal name" (pkp-lib's
  `acceptInvitation.userDetailsForm.givenName.description`, on a new
  account's "Enter details" step). The diffs correct them too.
- Not this fault: "Invitation Sent"'s "has been invited to new role",
  rewritten by another report's fix
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A5-invitation-sent-promises-decision-updates.md)).

## Proposed fix

Delete the applications' stale copy of the search page's text, so that
pkp-lib's corrected one shows, and correct the other slips where they
are. One diff per application, against the application's root, each
with the same pkp-lib part
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-wizard-typos/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-wizard-typos/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-wizard-typos/fix-ops.diff)):

```diff
 # lib/pkp/locale/en/invitation.po
 msgid "userInvitation.cancel.message"
-msgstr "Are you sure want to cancel this invitation?"
+msgstr "Are you sure you want to cancel this invitation?"
 # (and "it is tha part of" -> "it is the part of")

 # locale/en/invitation.po (OMP shown; OJS and OPS the same)
-msgid "userInvitation.searchUser.stepDescription"
-msgstr "Search for the user using their email address, ... invite to take a additional roles."
-
 msgid "userInvitation.sendMail.stepDescription"
-msgstr "Send the user an email to ..., press GDPR polices and ORCID verification"
+msgstr "Send the user an email to ..., press GDPR policies and ORCID verification"
 # (and "If you chose to skip it now" -> "If you choose to skip it now")
```

pkp-lib's version of the search text names no kind of publication, so
the applications need no copy of their own, and it says what the
search box's own label and help already say.

Tried on `main`, on all three applications: with the diffs applied,
the search page shows pkp-lib's text quoted under Expected, the
"Cancel" window asks "Are you sure you want to cancel this
invitation?" and the email page reads "GDPR policies". The same pages'
other application texts ("The user already exists in the press", the
"Press Masthead" column) were unchanged.

**Alternatives**

- Correct the three applications' copies in place: the same result on
  screen, but three copies to keep in step with pkp-lib again.

**What goes with it**

- The diffs change English only and rename no key. OJS also has the
  search text in 21 translations (OMP and OPS have it in English only).
  They translate the old wording without its slips, so the diffs leave
  them; deleting them in the same change would show pkp-lib's
  translation in 16 of those languages, but a raw code in the five that
  pkp-lib does not translate (Estonian, Croatian, Mongolian, Norwegian
  Bokmål, Vietnamese). Their translators can drop the key on Weblate
  once English no longer has it.
- In the same pkp-lib change, `AcceptInvitationStep::verifyOrcidStep()`
  can stop passing the search text as its section description; nothing
  shows it.
- Backport: the same texts are on `stable-3_5_0` and in the released
  3.5.0-5; the diffs apply there as written.

Medium: text only, but four pull requests, in pkp-lib and in each
application, and a `lib/pkp` submodule update in each application.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/invitation-wizard-typos/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-wizard-typos/walk.js)
  (helpers in `lib.js` beside it) takes steps 1 to 7:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/invitation-wizard-typos/walk.js`
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 3788b55 (2026-10-02).
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7 (`lib/pkp`
  ddd8ab243a on OJS, 3dc90c81a6 on OMP and OPS); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3 (`lib/pkp` cf3f984335).
- Code reads: pkp-lib's and the applications' `locale/en/invitation.po`
  on `main` and `stable-3_5_0` (the same texts; `stable-3_5_0`'s pkp-lib
  also holds the corrected search text); `SendInvitationStep.php` and
  `AcceptInvitationStep.php` for the readers of the search text; OJS's
  `locale/*/invitation.po` against pkp-lib's for the translations.
- OMP's copy is
  [4c15df30b](https://github.com/pkp/omp/commit/4c15df30b17b77aa126bbe09bb4fa72980adf989)
  and OPS's
  [1f9bfc725a](https://github.com/pkp/ops/commit/1f9bfc725aa146c202ee41330080256a3a215bac).
  `pkp/pkp-lib#11265` lists other wording slips of the same wizard
  (closed, fixed); none of these.
- Unverified: the ORCID step's and the given-name help's slips on
  screen (ORCID is off in the dataset, and no new account was invited).
