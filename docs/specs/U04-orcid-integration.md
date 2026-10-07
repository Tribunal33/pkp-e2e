---
name: orcid-integration
status: verified
---

# ORCID integration

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

An ORCID iD is a researcher's persistent public identifier. This feature lets
a journal collect **verified** iDs rather than ones typed in on trust. Users connect
an iD to their account from their profile or while registering. Editors ask a
submission's contributors by email to verify theirs. A journal that holds
ORCID **member** credentials also writes back: when an article is published,
its record is added to each verified contributor's ORCID profile, and on a
journal a completed peer review can be added to the reviewer's profile as a
review contribution. Everything is switched on per journal, or once for the
whole site, with API credentials issued by ORCID.

## Actors & permissions

The screens that host an ORCID control (the profile, the workflow's
Contributors list, the Reviewers table) keep their own access rules in their
own features. This table covers only the ORCID capability on each of them.

| Action | Who may — and when |
|--------|--------------------|
| **Enable & configure ORCID for one journal** | • Site Administrator; Journal Manager: the "ORCID" tab on Settings → Users & Roles (Rule 1). The tab is locked read-only while the site-wide configuration is active (Rule 3) <sup>a</sup> |
| **Enable & configure ORCID site-wide** | • Site Administrator: the "ORCID" tab on Site Settings. The tab exists only while the install hosts more than one journal (Rule 2) <sup>b</sup> |
| **Connect / authorize own iD** | • Any signed-in user: profile, Identity tab (Rules 5–6)<br>• Any visitor: a journal's registration page (Rule 7). Not offered on the site-level registration page <sup>c</sup> |
| **Remove own iD** | • The user themselves, while their iD is verified: "Delete" beside it on the Identity tab (Rule 6c)<br>• ⚠ [A13](#a13) nobody while the iD is unauthenticated: the tab offers no "Delete" for it <sup>d</sup> |
| **Request a contributor's verification by email** | • Site Administrator; Journal Manager; Section Editor assigned to the submission: "Request verification" on the contributor's ORCID iD field (Rule 8)<br>• Author of the submission: the same button, from the submission wizard's Contributors step. On a journal or press the contributor list on the author's own dashboard is read-only. On a preprint server that list offers "Edit" on the author's not-yet-posted preprint, and the form it opens carries the same button (the preprint baseline is described in [Contributors & affiliations](U41-contributors-and-affiliations.md#ops1))<br>• ⚠ [A5](#a5) an Assistant who can edit the contributor is offered the same button. The request is refused, yet the field reports it as sent <sup>e</sup> |
| **Remove a contributor's iD** | • The same roles as the row above: "Delete" on the contributor's ORCID iD field (Rule 8a) ⚠ [A5](#a5) <sup>e</sup> |
| **Verify via the emailed link** | • Whoever holds the emailed authorization link. It works signed out, and the link is single-use (Rule 9) <sup>f</sup> |
| **Send a review to ORCID** {OJS} | • Site Administrator; Journal Manager; Section Editor: "Send Review To ORCID" on the reviewer's row (Rule 12)<br>• ⚠ [A1](#a1) a Press Manager is offered the same action, though a press deposits nothing <sup>g</sup> |
| **Read the public ORCID pages** | • Anyone, signed in or out: the "What is ORCID?" page and the verification landing page, reached from links or by URL (Rules 9–10) <sup>f</sup> |

## Fields & validation

Journal ORCID settings ("ORCID" tab, Settings → Users & Roles):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Enable ORCID functionality" | no | Unchecking hides every ORCID surface for this journal (Rule 4). Checked and locked while the site-wide configuration is active (Rule 3) <sup>a</sup> |
| "ORCID API" | yes (when enabled) | Four choices: Public / Public Sandbox / Member / Member Sandbox. Member unlocks deposits (Rule 11). Sandbox points every ORCID link at ORCID's test service <sup>a</sup> |
| "Client ID" / "Client Secret" | yes (when enabled) | Credentials issued by ORCID. The secret is entered masked. Both are shown read-only, the secret fully masked, while configured site-wide <sup>a</sup> |
| "City" | no | Sent as the review venue on review deposits. A review deposit silently requires both this and the journal's country to be set (Rule 12) <sup>g</sup> |
| "Send e-mail to request ORCID authorization from authors when an article is accepted ie. sent to copy editing" | no | Turns on the automatic author emails of Rule 13 ⚠ [A6](#a6) |
| "ORCID request log" | no | Error (default) or full logging of ORCID traffic, for the journal's technical staff <sup>a</sup> |

Site-wide ORCID settings carry only the first three rows (enable, API, Client
ID/Secret). City, the email toggle and the log level remain per-journal. <sup>b</sup>

Contributor's ORCID iD field (add/edit contributor, Contributors list):

| State | What the field shows |
|-------|----------------------|
| No iD | A "Request verification" button. Pressing it asks "Would you like to send an email to this author requesting they verify their ORCID?" For a contributor being added, the dialog adds "The email will be sent once the author has been created." After sending, the button is disabled and reads "ORCID Verification has been requested!", with a "Resend Verification Email" link beside it (Rule 8) <sup>e</sup> |
| Unauthenticated iD | The iD as a link, the hollow ORCID icon, and the note "This ORCID has not been verified. Please remove this unverified ORCID and request verification from the user/author directly." plus "Delete" <sup>e</sup> |
| Verified iD | The iD as a link with the solid ORCID icon, plus "Delete" (confirmation before removal) <sup>e</sup> |

What the field shows in the French interface: Rule 17a.

## Rules & state

1. **Per-journal switch.** ORCID is off until a Journal Manager enables it on
   the "ORCID" tab and saves credentials. Every rule below assumes it is on
   for the journal at hand. The tab is always present, enabled or not. <sup>a</sup>
2. **Site-wide switch (multi-journal installs).** On an install hosting more
   than one journal, the Site Administrator's Site Settings carry an "ORCID"
   tab that enables ORCID **for every journal at once** with one set of
   credentials. On a single-journal install the tab is absent ⚠ [A9](#a9).
   What the tab shows in the French interface: Rule 17. <sup>b</sup>
3. Site-wide configuration overrides the journals. Each journal's tab then
   shows "Enable ORCID functionality" checked and locked, the API type and
   Client ID read-only, the secret masked, and a note ending "Contact your
   site administrator to disable ORCID functionality or change these
   credentials." City, the email toggle and the log level stay editable per
   journal. <sup>b</sup>
4. **Disabled means invisible.** With ORCID off for a journal, the profile's
   Identity tab shows no ORCID field at all, the registration page shows no
   ORCID block, and the contributor form has no ORCID iD field. <sup>c</sup>
5. **Connecting from the profile.** On the Identity tab of an ORCID-enabled
   journal an ORCID block appears. What it holds depends on the account's iD.
   With no iD: a "Create or Connect your ORCID iD" button. With an
   unauthenticated iD: the iD as a hollow-icon link suffixed
   "(unauthenticated)" and an "Authorize and Connect your ORCID iD" button,
   but no "Delete" (Rule 6c). With a verified iD: only the iD as a
   solid-icon link and its "Delete" button; the connect button and the
   "What is ORCID?" link beside it are gone. The connect/authorize button
   opens ORCID's sign-in in a popup window. Completing it stores the
   verified iD and reloads the tab. <sup>c</sup> <sup>h</sup>
6. Companions of the profile flow:
   6a. ⚠ [A4](#a4) the "What is ORCID?" link beside the button opens the same
   sign-in popup instead of the What-is-ORCID page it names. <sup>c</sup>
   6b. Denying access on ORCID's consent screen records the refusal. The
   stored iD and token, if any, are cleared. <sup>f</sup>
   6c. "Delete" beside a verified iD opens a window titled "Confirm" that
   asks "Are you sure you want to remove this ORCID?", with "OK" and
   "Cancel". "OK" removes the iD at once, with no separate save, and tells
   ORCID to cancel this install's access token. ⚠ [A13](#a13) an
   unauthenticated iD has no "Delete", so its owner cannot remove it from
   the profile. <sup>d</sup>
7. **Connecting while registering.** A journal's registration page offers the
   same "Create or Connect your ORCID iD" button at the top of the form.
   Completing ORCID's sign-in fills the name, email, country and affiliation
   fields from the ORCID record and pins the iD to the form. Connecting is
   never required to register. ⚠ [A3](#a3) the account created afterwards
   holds the iD as unauthenticated, so the new user is expected to press
   "Authorize and Connect" once more from their profile. <sup>i</sup>
8. **Contributor verification requests.** On the contributor form, "Request
   verification" emails that contributor an authorization link (Rule 14
   chooses the email). The button then reads "ORCID Verification has been
   requested!" with a "Resend Verification Email" link. For a contributor
   being added, the request is remembered and the email goes out when the
   contributor is saved.
   8a. "Delete" beside a contributor's iD (verified or not) removes it after
   confirmation and cancels its token at ORCID. <sup>e</sup>
9. **The emailed link and the verification landing.** The emailed
   authorization link leads to ORCID's sign-in. ORCID then returns the
   browser to the journal's "ORCID Authorization" page, which answers one
   of these: <sup>f</sup>
   - On success: the verified iD and "Your ORCID iD has been verified and
     successfully associated with the submission."; after ten seconds the
     page returns the visitor to the journal front page. <sup>o</sup>
   - An iD already attached to the submission: "An ORCID iD was already
     stored for this submission." <sup>o</sup>
   - A used, stale or tampered link: "Your ORCID iD could not be verified.
     The link is no longer valid." <sup>f</sup>
   - A visitor who pressed Deny at ORCID: ⚠ [A2](#a2) a raw placeholder
     where the explanation should be. <sup>f</sup>

   Every failure closes with "Please contact the journal manager with your
   name, ORCID iD, and details of your submission." ⚠ [A8](#a8) that line
   says "journal manager" verbatim on presses and preprint servers too. <sup>f</sup>
10. **The What-is-ORCID page.** Every journal exposes a public "What is
    ORCID?" page, linked from the ORCID emails and also reachable by URL. It
    explains the iD and how the journal uses it. Its "How and why" section
    differs between public-API and member-API journals. ⚠ [A15](#a15) the
    browser tab of this page and of the "ORCID Authorization" page (Rule 9)
    reads only "| {journal name}", with no page name before it. <sup>f</sup>
11. **Member API = deposits.** With a Member (or Member Sandbox) API
    configured, publishing an article adds it as a "work" to the ORCID record
    of every contributor holding a verified iD with a live deposit
    permission. "Live" means not expired and not revoked. No screen shows
    liveness; the deposit simply skips the others. Publication is the
    trigger, and nothing is deposited before it. A contributor verified under
    the public API holds no deposit permission. For them the deposit pauses
    and the journal emails a request to re-authorize with the wider
    permission (Rule 14). ⚠ [A14](#a14) that email's link, back from
    ORCID, ends on a blank page because the app fails, so the deposit
    never resumes. Works deposited once are updated in place on later
    publishes.
    [OMP1](#omp1) presses request and verify iDs identically but deposit
    nothing. <sup>j</sup>
12. **Review deposits {OJS}.** On a journal with the member API, a completed
    review can be added to the reviewer's ORCID record as a review
    contribution. The Reviewers table offers "Send Review To ORCID" on the
    row of a reviewer with a verified iD, behind a confirmation ("Send this
    review to the reviewer's ORCID?"). Confirming closes the dialog with no
    on-screen message either way; the deposit runs in the background.
    Publishing the article also deposits its completed reviews. A review
    deposit additionally requires the ORCID settings' City and the journal's
    country to be set. Otherwise it is skipped without a message. The row
    action's presence depends on the reviewer's verified iD alone. The member
    API gates only the deposit, so a public-API journal offers the action
    too, and its confirm deposits nothing. ⚠ [A1](#a1) the row action is
    offered before the review is complete, though nothing is deposited for an
    incomplete review. <sup>g</sup>
13. **Automatic author emails {OJS OMP}.** With the settings tab's email
    toggle on, recording the editorial decision Accept (or Skip Review) emails
    every contributor who does not yet hold a verified iD with a live
    permission (Rule 11) the verification request of Rule 8 ⚠ [A6](#a6). ⚠ [OPS1](#ops1) a preprint
    server shows the toggle but has no accepting decision to trigger it. <sup>k</sup>
14. **Which email goes out.** Under a public API the request email's subject
    line reads "Submission ORCID", which asks the contributor to connect
    their iD. Under a member API it reads "Requesting ORCID record access",
    which asks for deposit permission. The re-authorization mail of Rule 11
    is "Requesting updated ORCID record access". All three carry the personal
    authorization link and the What-is-ORCID link, sent from the journal's
    principal contact. ⚠ [OPS2](#ops2) on a preprint server none of the three
    appears on the Emails settings screen. The re-authorization mail was once
    listed nowhere; it gained its journal and press rows upstream
    ([A7](#a7), resolved 2026-08-25). <sup>l</sup>
15. Other screens that surface ORCID follow the rules above. The invitation
    wizard's "Verify ORCID iD" step (described in
    [User invitations](U06-user-invitations.md)) appears only while ORCID is
    enabled. The reviewer-suggestion form collects a plain, unverified
    "ORCID iD" text field. Reviewer lists distinguish a verified iD (solid
    icon) from an unauthenticated one (hollow icon, "(unauthenticated)"
    suffix); that is described with the Reviewers table in
    [Reviewer assignment & management](U27-reviewer-assignment-and-management.md). <sup>m</sup>
16. A preprint server's install additionally ships the retired ORCID Profile
    plugin from the time before the built-in integration [OPS3](#ops3). The
    built-in integration this spec describes is what runs everywhere.
17. **The French interface: the settings tabs.** ⚠ [A11](#a11) In French
    ("français" or "French" in "Change Language", the one installed), the
    journal's tab on Settings → Users & Roles and the site's side tab on
    Administration › Site Settings are named "Plugiciel de profil ORCID"
    ("ORCID Profile Plugin") instead of "ORCID". On the site's tab the box
    reads "##orcid.manager.siteWide.enabled##" and its explanation
    "##orcid.manager.siteWide.description##": raw codes, a text's
    internal name between "##" marks where its translation is missing.
    The three fields the box reveals are in French ("API ORCID",
    "Identifiant ORCID du client", "Clé secrète du client"), as is the
    journal's whole tab. <sup>n</sup>

    17a. **The French interface: the contributor's ORCID iD field.**
    ⚠ [A12](#a12) On the contributor form of the workflow's Contributors
    list, the field's label "Identifiant ORCID" and its help text are
    French. Everything else it shows is a raw code; the buttons work as
    in English (Rules 8, 8a): <sup>n</sup>

    | Where | English | French |
    |-------|---------|--------|
    | The request button | "Request verification" | "##orcid.field.verification.request##" |
    | Its question window: title, question | "Request ORCID verification", "Would you like to send an email to this author requesting they verify their ORCID?" | "##orcid.field.authorEmailModal.title##", "##orcid.field.authorEmailModal.message##", with "Oui" and "Non" |
    | After the request, and after the form is reopened: the disabled button, the link | "ORCID Verification has been requested!", "Resend Verification Email" | "##orcid.field.verification.requested##", "##orcid.field.verification.resendRequest##" |
    | An unauthenticated iD's note | "This ORCID has not been verified. Please remove this unverified ORCID and request verification from the user/author directly." | "##orcid.field.unverified.shouldRequest##", above the iD, "(non authentifié)" and "Supprimer" |
    | "Delete"'s question window: title, question | "Delete ORCID", "Are you sure you want to remove this ORCID?" | "##orcid.field.deleteOrcidModal.title##", "##orcid.field.deleteOrcidModal.message##", with "Oui" and "Non" |

## Side effects

- **On "Request verification" / the Rule 13 decision**: one email to the
  contributor (Rule 14 chooses which), carrying their single-use
  authorization link. <sup>l</sup>
- **On completing an emailed authorization for a published article**: the
  work is deposited at once and the landing page adds "The submission has
  been added to your ORCID record." For an article not yet published it says
  the record will be added on publication. <sup>f</sup>
- **On publication**: work deposits to every eligible contributor (Rule 11)
  and, on a journal, review deposits for the article's completed reviews
  (Rule 12). They run in the background, with no notice on the publishing
  screen. Under the member API, publishing a journal article without an
  issue fails with "An unexpected error has occurred…" for a contributor
  with a verified iD: a reload shows the article live, and nothing
  reaches their ORCID record
  ⚠ [→ Publish, schedule & versions OJS4](U49-publish-schedule-and-versions.md#ojs4). <sup>j</sup>
- **On removing an iD** (own profile or a contributor's): the install asks
  ORCID to cancel the matching access token in the background. <sup>d</sup>
- **ORCID request log**: traffic with ORCID is written to the application
  log at the level the settings tab chooses. <sup>a</sup>

## Settings that modify behavior

- **Enable ORCID functionality** (per journal, or site-wide on multi-journal
  installs): the master switch; Rules 1–4.
- **ORCID API**: Public collects verified iDs only; Member also deposits
  (Rules 11–12). The two Sandbox variants aim every link and deposit at
  ORCID's test service instead of the real one.
- **Send e-mail to request ORCID authorization…**: the Rule 13 automatic
  emails; off by default.
- **City** plus the journal's country (from the journal's masthead settings):
  both required for review deposits (Rule 12).
- **ORCID request log**: logging verbosity only; no user-facing change.

## Cross-feature interactions

- **Profile — Identity tab** hosts the connect, authorize and delete controls
  (Rules 5–6). The tab itself and its other fields belong to the *User
  profile* feature.
- **Contributors list** (workflow and submission wizard) hosts the
  contributor ORCID field (Rule 8). The list's own mechanics belong to
  *Contributors & affiliations*.
- **Reviewers table** {OJS} hosts "Send Review To ORCID" (Rule 12). The
  table, its other row actions and its confirm-dialog chrome belong to
  [Reviewer assignment & management](U27-reviewer-assignment-and-management.md).
- **User invitations**: the accept wizard's "Verify ORCID iD" step and the
  send wizard's ORCID note are described in
  [User invitations](U06-user-invitations.md). They obey this spec's
  enablement rules.
- **Emails management**: the stored ORCID email templates are edited on the
  Emails settings screen (feature spec to come: *Emails management*). This
  spec owns the ORCID-specific gaps ⚠ [OPS2](#ops2) ⚠ [A7](#a7).
- **Publishing**: publication is the deposit trigger (Rule 11). The publish
  action itself belongs to
  [Publish, schedule & versions](U49-publish-schedule-and-versions.md).
- **Site settings**: the site-wide "ORCID" tab is one of the Site Settings
  side tabs. Its "Save", and a change left unsaved, follow that page's
  rules ([Site settings](U60-site-settings.md), Rule 4).

## Canonical scenarios

Every scenario runs on a scratch journal with throwaway accounts, ORCID
enabled with sandbox credentials (scenario 1's journal starts with it off,
scenario 7's has it disabled); no step completes ORCID's own sign-in, and
the iDs a scenario starts from are seeded. Scenarios 4, 7 and 8 run on two
scratch journals each (4's second on the Member Sandbox API, 7's with ORCID
enabled, 8's with the email toggle off), scenarios 4 and 8 read the mail
catcher, and scenario 10 signs in as the Author. The tooling recipe is in
the footnote. <sup>s</sup>

1. **Turn ORCID on for a journal**

   Given: a Journal Manager, signed in, on a scratch journal with ORCID not
   yet enabled. <sup>s</sup>

   - **The "ORCID" tab**: open Settings → Users & Roles, tab "ORCID". Tick
     "Enable ORCID functionality"; the API fields appear. Pick "Public
     Sandbox" and enter a placeholder Client ID, APP-TEST, and a placeholder
     Client Secret, test-secret. Both must be filled in, but the save does
     not check them against ORCID. Save.
   - **The profile's Identity tab, in another browser tab**: an ORCID block
     with a "Create or Connect your ORCID iD" button has appeared.
   - **Control**: untick "Enable ORCID functionality" and save again: the
     ORCID block is gone, and the Identity tab shows no ORCID field at all.

2. **The connect offer, and the About link that doesn't go there**

   Given: any signed-in user whose account holds no iD, on the profile's
   Identity tab of a scratch journal with ORCID enabled. <sup>s</sup>

   - **"Create or Connect your ORCID iD"**: press it. A small popup window
     opens on an ORCID sign-in address while the profile tab stays put. On
     an offline install the popup shows a connection error; that is
     expected. Close it.
   - **The "What is ORCID?" link beside the button**: press it: ⚠ [A4](#a4)
     the same popup opens instead of the What-is-ORCID page.
   - **Control**: the popup is a window of its own: the profile tab under it
     stays where it was, on the Identity tab's own address, and only the
     popup shows the ORCID sign-in address.

3. **Remove a connected iD from the profile**

   Given: a user whose account holds a verified iD (seeded), signed in, on
   the profile's Identity tab of a scratch journal with ORCID enabled; a
   second user of the same journal whose account holds an unauthenticated
   iD (seeded), in a browser of their own, signed in. <sup>s</sup>

   - **The Identity tab, verified iD**: shows the iD as a link with the solid
     ORCID icon and a "Delete" button; the connect button and the "What is
     ORCID?" link beside it are gone (Rule 5).
   - **The second user's Identity tab, unauthenticated iD**: shows the iD as
     a hollow-icon link suffixed "(unauthenticated)" and an "Authorize and
     Connect your ORCID iD" button (Rule 5); ⚠ [A13](#a13) no "Delete" is
     offered.
   - **"Delete"**: on the first user's tab, press Delete. The dialog asks
     "Are you sure you want to remove this ORCID?"; confirm. The iD is gone.
   - **Control**: the "Create or Connect your ORCID iD" button is back.

4. **Ask a contributor to verify**

   Given: a Journal Manager, signed in, on a scratch journal with a
   submission whose contributor has no iD; a second scratch journal on the
   Member Sandbox API with the same, its Journal Manager signed in as well;
   each journal with a principal contact of its own. <sup>s</sup>

   - **The contributor's ORCID iD field**: on the submission's Contributors
     list, edit a contributor who has no iD. The ORCID iD field shows
     "Request verification". Press it. The dialog asks "Would you like to
     send an email to this author requesting they verify their ORCID?";
     confirm. A saved contributor's email leaves at once; one still being
     added waits for the save (Rule 8).
   - **The field after the request**: on the open form, the field reads
     "ORCID Verification has been requested!", with a "Resend Verification
     Email" link beside it. Save, reopen the contributor: it reads the same
     (Rule 8).
   - **The contributor's mailbox**: holds the request email, subject line
     "Submission ORCID" on this public-API journal (Rule 14), with a
     personal authorization link (leading to ORCID's site) and the
     What-is-ORCID link, sent from the journal's principal contact (Rule 14).
   - **The member-API journal**: on the second journal, request verification
     for its contributor the same way: that contributor's mailbox holds the
     subject line "Requesting ORCID record access" instead, with the same
     two links, sent from that journal's principal contact (Rule 14).
   - **The What-is-ORCID link in each email**: open it: each journal's "What
     is ORCID?" page renders, and the member-API journal's "How and why"
     section differs from the public-API journal's (Rule 10).
   - **A contributor being added**: back on the first journal's Contributors
     list, add a contributor: Given Name Nova, Email a throwaway address of
     its own (the footnote names it), Country Canada. On the new form press
     "Request verification": the dialog now adds "The email will be sent
     once the author has been created."; confirm. The new address's mailbox
     holds nothing: the request is remembered and waits for the save
     (Rule 8).
   - **Control**: save the new contributor: the address's mailbox now holds
     the request email, the positive control for the empty read above
     (Rule 8).

5. **Remove a contributor's iD**

   Given: a Journal Manager, signed in, on a scratch journal with a
   submission whose contributor's iD is unauthenticated (seeded). <sup>s</sup>

   - **The contributor's ORCID iD field**: edit the contributor. The field
     shows the hollow-icon iD link, the not-verified warning, and "Delete".
   - **"Delete"**: press Delete and confirm: the iD is gone.
   - **Control**: the field offers "Request verification" again.

6. **The public ORCID pages by URL**

   Given: a visitor, signed out, on a scratch journal with ORCID enabled.
   <sup>s</sup>

   - **The "What is ORCID?" page**: type the journal's `/orcid/about`
     address. The "What is ORCID?" page renders inside the journal's own
     header and footer.
   - **The "ORCID Authorization" page**: type `/orcid/verify`. The "ORCID
     Authorization" page answers "Your ORCID iD could not be verified. The
     link is no longer valid." and "Please contact the journal manager with
     your name, ORCID iD, and details of your submission." ⚠ [A8](#a8). A
     stale or truncated verification link gets this explanation, never an
     error page.
   - **Control**: `/orcid/about`, typed the same way while signed out,
     rendered its page, so the "no longer valid" answer is `/orcid/verify`'s
     own, an explanation and never an error page.

7. **A journal with ORCID off shows none of it**

   Given: a visitor and a Journal Manager on a scratch journal with ORCID
   disabled; a second scratch journal with ORCID enabled. <sup>s</sup>

   - **The registration page**: has no ORCID block.
   - **A contributor form**: has no ORCID iD field.
   - **The profile's Identity tab**: shows no ORCID field at all.
   - **The site-level Register page**: the site's own Register page, reached
     from the site homepage that lists the journals, shows no ORCID block
     either, while the enabled journal's Register page offers "Create or
     Connect your ORCID iD" at the top of its form (Actors row 3).
   - **Registering without connecting**: on the enabled journal's Register
     page, fill in the form with a throwaway username and email (the
     footnote names them; the form's own fields belong to *Registration &
     account validation*) and press "Register" without pressing "Create or
     Connect your ORCID iD": the registration completes as any registration
     does; connecting is never required to register (Rule 7).
   - **Control**: the same screens on the enabled journal show the Rule 5
     and Rule 8 controls: "Create or Connect your ORCID iD" on the Identity
     tab and at the top of the registration form, "Request verification" on
     the contributor's ORCID iD field.

App-specific:

8. **Accepting a submission asks the authors** {OJS OMP}

   Given: a Journal Manager, signed in, on a scratch journal with the ORCID
   email toggle on and two submissions in review, the second submitted by a
   contributor whose iD is verified (seeded); a second scratch journal with
   the toggle off and a submission in review. <sup>s</sup>

   - **Accept with the toggle on**: record Accept on the first submission in
     review. Each contributor without a verified iD receives the Rule 14
     request email, subject line "Submission ORCID" on this public-API
     journal (observe the mailbox).
   - **A contributor already verified**: record Accept on the second
     submission: nothing arrives for its verified contributor's address
     (Rule 13); the first submission's email is the positive control.
   - **Control**: with the toggle off, accepting the second journal's
     submission sends nothing: its contributor's mailbox holds no request
     email. On a preprint server this scenario does not
     run: its ORCID tab shows the same toggle, but the server has no
     accepting decision to trigger it [OPS1](#ops1).

9. **Send a review to ORCID** {OJS}

   Given: a Journal Manager, signed in, on a scratch journal configured with
   the Member Sandbox API, with a submission in review whose reviewer holds
   a verified iD (seeded) and whose second reviewer holds no iD. <sup>s</sup>

   - **The Reviewers table, before the review is complete**: the API type
     gates only the background deposit, never the row action's presence
     (Rule 12). Open the row menu of the reviewer with the verified iD:
     "Send Review To ORCID" is offered ⚠ [A1](#a1) even before the review is
     complete.
   - **After the review is complete** (that reviewer has submitted their
     review): press "Send Review To ORCID". The dialog asks "Send this
     review to the reviewer's ORCID?"; confirm. The dialog closes with no
     message of any kind. The deposit itself happens in the background
     (Rule 12).
   - **Control**: the second reviewer's row menu, their account holding no
     iD, offers no "Send Review To ORCID": the row action's presence depends
     on the reviewer's verified iD alone (Rule 12).

10. **Where the Author can request verification** {OJS OMP OPS}

    Given: an Author, signed in, on a scratch journal with ORCID enabled,
    with a submitted submission of their own and a second one of their own
    not yet submitted; the journal's Journal Manager, in a browser of their
    own, signed in. <sup>s</sup>

    - **The submitted submission's Contributors list**: open the submission
      from the author's dashboard. On a journal or press its Contributors
      list is read-only; no contributor can be opened for editing, so no
      ORCID iD field and no "Request verification" is reached (Actors
      row 5). On a preprint server the same list offers "Order", "Preview"
      and "Add Contributor", and the author's own row "Edit" and "Delete"
      (the preprint baseline: [Contributors & affiliations](U41-contributors-and-affiliations.md#ops1)):
      press "Edit"; the ORCID iD field offers "Request verification". Close
      the form without pressing it.
    - **The wizard's Contributors step**: open the unsubmitted submission
      from the dashboard; the submission wizard opens. Go on to its
      Contributors step and open the Author's own contributor for editing
      (the step's own controls belong to *Contributors & affiliations*): the
      ORCID iD field shows "Request verification". Press it. The dialog asks
      "Would you like to send an email to this author requesting they verify
      their ORCID?"; confirm: the field reads "ORCID Verification has been
      requested!" (Rule 8; Actors row 5).
    - **Control**: the Journal Manager opens the submitted submission's
      Contributors list and edits the same contributor: the ORCID iD field
      offers "Request verification" (Rule 8).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A4 (issue report `docs/issues/U04-A4-what-is-orcid-link-opens-sign-in.md`): Scenario 2 presses "What is ORCID?" on the profile Identity tab and the registration page and expects the "What is ORCID?" page.
  - the guard for A2 (issue report `docs/issues/U04-A2-orcid-denied-page-raw-placeholder.md`): a contributor who denies access at ORCID lands on the "ORCID Authorization" page and reads "You denied access to your ORCID record.", no raw key.
  - the guard for A11 (issue report `docs/issues/U04-A11-orcid-tabs-named-after-old-plugin.md`): in French (Canada), both ORCID tabs (the site's and the journal's) read "ORCID".
  - the guard for A12 (issue report `docs/issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md`): in French (Canada), the site's ORCID switch and every state of the contributor's ORCID iD field show no untranslated text key (A11's switch too).
  - the guard for A5's refusal (issue report `docs/issues/U04-A5-assistant-orcid-controls-refused.md`): an Assistant whose assignment has the "Permissions" box presses "Request verification" (the email arrives) and "Delete" (the iD is gone), and one without the box is offered no "Edit".
  - the guard for A14 (issue report `docs/issues/U04-A14-orcid-reauthorization-link-blank-page.md`): once fixed, a contributor verified under the public API follows "Requesting updated ORCID record access" after the journal moved to the member API and lands on the "ORCID Authorization" page, not a blank page.
  - the guard for A15 (issue report `docs/issues/U04-A15-orcid-pages-tab-no-page-name.md`): once fixed, the "What is ORCID?" and "ORCID Authorization" pages' browser tab reads "What is ORCID? | {journal name}" and "ORCID Authorization | {journal name}".
  - the profile's "Delete" window titled "Confirm", with "OK" and "Cancel" (Rule 6c; scenario 3's "Delete" bullet).
  - a contributor verified under the public API receiving "Requesting updated ORCID record access" from the journal's principal contact, with the personal authorization link and the What-is-ORCID link, when their article is published after the journal switched to the member API (Rules 11, 14; journals and preprint servers, a press deposits nothing, OMP1).
- **Nothing new to test**:
  - a Site Administrator on the journal's ORCID tab (Actors row 1; scenario 1's Journal Manager sees the same tab)
  - a Site Administrator or an assigned Section Editor requesting verification (Actors row 5; scenario 4's button)
  - a contributor's verified iD also offering "Delete" (Rule 8a; scenario 5's unauthenticated one)
  - a public-API journal offering "Send Review To ORCID" too (Rule 12; scenario 9's row action, the API type gating only the deposit)
  - Skip Review also triggering the emails (Rule 13; scenario 8's Accept)
  - the ORCID request log level, no user-facing change (Settings)
- **Register carries it**:
  - A9 (the site tab absent on a single-journal install; Rule 2)
  - A5 (an Assistant offered "Request verification" and "Delete", refused yet reported sent; Actors rows 5–6)
  - A1 (a Press Manager offered "Send Review To ORCID"; Actors row 8)
  - A4 ("What is ORCID?" beside the button opening the popup; Rule 6a; scenario 2 marks it)
  - A3 (the registration sign-in filling the form, the iD landing unauthenticated; Rule 7)
  - A2 (the landing after Deny showing a raw placeholder; Rule 9)
  - A8 (the failure line saying "journal manager" on presses and preprint servers; Rule 9; scenario 6 marks it)
  - A1 (the action offered before the review is complete; Rule 12; scenario 9 marks it)
  - A6 (the toggle's label misdescribing when it fires; Rule 13)
  - OPS2 (the preprint server's Emails screen lacking the three ORCID rows; Rule 14)
  - OPS3 (the legacy ORCID Profile plugin on preprint servers; Rule 16)
  - A11 (the French interface: both ORCID tabs named after the old plugin, the site switch in raw codes; Rule 17)
  - A12 (the French interface: the contributor's ORCID iD field in raw codes; Rule 17a)
  - A13 (no "Delete" for the owner's unauthenticated iD on the Identity tab; Actors row 4, Rule 6c; scenario 3 marks it)
  - A14 (the re-authorization email's link failing with a server error; Rule 11)
  - A15 (the public ORCID pages' browser tab showing no page name; Rule 10)
- **No seed**:
  - the Site Administrator enabling ORCID site-wide (Actors row 2, Rule 2): Site Settings → ORCID is one setting shared by every test running at once, so it stays off
  - the journal tab locked read-only under the site-wide configuration (Rule 3): the same site-wide setting
  - the sign-in completion storing the verified iD and reloading the tab (Rule 5): ORCID's own sign-in cannot complete on the test installs, so verified iDs are seeded instead
  - the emailed link completing verification, signed out (Actors row 7, Rule 9): the same sign-in
  - the emailed link being single-use (Actors row 7, Rule 9): the same sign-in
  - denying at ORCID's consent screen clearing the stored iD (Rule 6b): ORCID's consent screen
  - the landing answering "An ORCID iD was already stored for this submission." (Rule 9): the same sign-in
  - the success landing returning to the front page after ten seconds (Rule 9): the same sign-in
  - the landing after an authorization adding "The submission has been added to your ORCID record." or promising it on publication (Side effects): the same sign-in
  - publishing depositing works to contributors with a live permission (Rule 11): deposits need ORCID's own service
  - works updated in place on later publishes (Rule 11): the same deposit
  - presses depositing nothing, OMP1 (Rule 11): the same deposit
  - publishing depositing the article's completed reviews (Rule 12): the same deposit
  - City plus the journal's country required for review deposits, else skipped silently (Settings; Rule 12): the same deposit
  - the Sandbox variants aiming at ORCID's test service (Settings): the same service
  - removing an iD cancelling the token at ORCID (Side effects): the same service
  - the ORCID request log written at the chosen level (Side effects): the application log is not read by the suites
  - a verified contributor whose permission has lapsed being asked again on Accept (Rule 13): no seed for a lapsed permission
- **Owned by another feature**:
  - the invitation wizard's "Verify ORCID iD" step, present only while ORCID is enabled (Rule 15; *User invitations*)
  - the reviewer-suggestion form's plain "ORCID iD" field (Rule 15; *Reviewer suggestions*)
  - the reviewer lists' verified and unauthenticated icons (Rule 15; *Reviewer assignment & management*)
  - publishing without an issue failing for a contributor with a verified iD (Side effects; *Publish, schedule & versions*, its register entry OJS4)
  - the site tab's "Save" and a change left unsaved (Cross-feature interactions; *Site settings*, Rule 4)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-07; additions
2026-08-29, 2026-09-28 and 2026-10-05), unreviewed unless an entry notes otherwise; the team settles
them on spec review. The summary is sorted 🐞 → ❓ → ✅ and the entries below
are the source; badges, Impact and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | "Send Review To ORCID" is offered before the review is complete, and confirms in silence | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A2](#a2) | A contributor who presses "Deny" at ORCID lands on a page showing "##orcid.authDenied##" | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A4](#a4) | "What is ORCID?" beside the ORCID button opens ORCID's sign-in instead of the explanation page | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A5](#a5) | An Assistant's contributor-ORCID controls are refused by the server yet report success | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A8](#a8) | A press's or preprint server's ORCID verification failure page says to contact "the journal manager" | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A11](#a11) | In French, the site's ORCID switch shows raw codes, and both ORCID tabs are named "Plugiciel de profil ORCID" | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A12](#a12) | In French, the contributor's ORCID iD field shows raw codes for its button, questions and notes | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A14](#a14) | A contributor following the "Requesting updated ORCID record access" link gets a blank page and can never allow deposits | 🐞 | medium · crash: server | issues (claude), 2026-10-07 — re-verified |
| [A15](#a15) | The "What is ORCID?" and "ORCID Authorization" pages' browser tab shows only "\| {journal name}" | 🐞 | low | issues (claude), 2026-10-07 — re-verified |
| [OPS2](#ops2) | The ORCID request emails have no rows on the preprint server's Emails screen | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A3](#a3) | An iD connected while registering lands on the account unverified | ❓ | minor | — |
| [A6](#a6) | The author-email toggle's label misdescribes when it fires | ❓ | minor | — |
| [A7](#a7) | The re-authorization email template is not editable in any app. Resolved upstream for journals and presses (pkp/pkp-lib#13050); the preprint-server gap is [OPS2](#ops2)'s | ❓ | latent | rebase check (claude) 2026-08-25 |
| [A9](#a9) | The site tab's absence on single-journal installs rests on its switch-on condition, not observation | ❓ | minor | — |
| [A13](#a13) | A user whose own iD is unauthenticated is offered no "Delete" on the profile's Identity tab | ❓ | minor | — |
| [OPS1](#ops1) | The author-email toggle exists on a preprint server that can never trigger it | ❓ | latent | — |
| [A10](#a10) | Deleting a contributor's unauthenticated iD fails: the confirm never completes and the iD stays (regression, pkp/pkp-lib#13003) | ✅ | retired | rebase check (claude), 2026-09-03 — fixed upstream (pkp-lib `ecd12271ed` + `d9e9b3fc7c`), suites green on all three apps |
| [OMP1](#omp1) | A press requests and verifies iDs but deposits no works | ✅ | user-visible | — |
| [OPS3](#ops3) | A preprint server additionally bundles the legacy ORCID Profile plugin | ✅ | invisible | — |

### All apps

<a id="a1"></a>
**A1 — Send Review To ORCID ignores review completion, and answers with silence** · 🐞 · medium.
The Reviewers table offers "Send Review To ORCID" on any row whose reviewer
holds a verified iD, whatever the state of the review: the completion
condition the action was given never evaluates to false. Confirming it
then answers with silence. An editor who presses it on a completed
review and answers "OK" sees the question close and nothing else, though
in several setups nothing is sent: a press sends no reviews to ORCID by
design, and a journal sends nothing when its ORCID settings use the
public API or lack a City, or the journal has no country. Only a journal
on the member API with both set queues the review, or first emails the
reviewer a request for permission, also without a word to the editor
(Rule 12).
Basis: probe, 2026-10-03. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — A contributor who presses "Deny" at ORCID lands on a page showing "##orcid.authDenied##"** · 🐞 · low.
A contributor who follows the emailed ORCID verification link and
presses "Deny" on ORCID's consent screen comes back to the "ORCID
Authorization" page. Where it should explain that they refused access,
the page shows the raw code `##orcid.authDenied##`. The refusal itself
is recorded correctly; only the explanation is missing, and the fix is
to render the sentence the translations already hold. The setup is any
journal, press or preprint server with ORCID turned on. The verification
email goes out when an editor presses "Request verification" on a
contributor, or when a submission is accepted with the ORCID setting
"Send e-mail to request ORCID authorization from authors when an article
is accepted" ticked.
Basis: probe, 2026-10-03. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Registration-connected iD arrives unverified** · ❓ · minor.
A visitor who connects their ORCID iD while registering, by signing in at
ORCID from the registration page's popup, gets an account that holds the iD
as **unauthenticated**. The profile then shows the hollow icon, the
"(unauthenticated)" suffix and an "Authorize and Connect your ORCID iD"
button asking them to do it again. The sign-in they already completed
granted this install a token that is simply not kept.
Question: should the registration connect count as verification?
Lean: yes. Asking the same person to authorize twice reads as a gap, not a
choice.
Basis: code (the OAuth leg is unreachable from the test install). <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — "What is ORCID?" beside the ORCID button opens ORCID's sign-in instead of the explanation page** · 🐞 · low.
On a journal, press or preprint server with ORCID turned on, a user who
presses "What is ORCID?" beside the "Create or Connect your ORCID iD"
button gets ORCID's sign-in window, the same as the button, instead of
the site's "What is ORCID?" page. This happens on the profile's Identity
tab and at the top of the registration form. The window opens over the
page: the profile, or the registration form with whatever the visitor
has typed, stays as it was behind it, and the user can close the window
and carry on. Nothing typed is lost.
Basis: probe, 2026-10-03. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — Assistant's refused ORCID controls report success** · 🐞 · low.
When an editor lets an Assistant change the publication, the Assistant
can edit a contributor, and the contributor's "ORCID iD" field offers
them "Request verification" and "Delete". The server refuses both: a
window titled "Error" says "You are not authorized to access the
requested resource.", no email goes out, and the iD stays. The ORCID
routes leave the Assistant out, though Assistants may edit every other
contributor field. The field behind the window still reports success:
it switches to "ORCID Verification has been requested!" or shows the
iD gone, until the form is closed and opened again.
Basis: probe, 2026-10-03. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — The email toggle's label misdescribes its trigger** · ❓ · minor.
The setting reads "Send e-mail to request ORCID authorization from authors
when an article is accepted ie. sent to copy editing". The emails actually
fire when the decision Accept **or Skip Review** is recorded, and Skip Review
is not mentioned. The grammar ("ie.") is also off. Elsewhere the same setting
is described as acting "on publication", which it does not.
Question: which wording is the intended contract?
Lean: keep the accept-time behavior, fix the label.
Basis: probe + code. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Re-authorization email not editable anywhere** · ❓ · latent.
The "Requesting updated ORCID record access" email (sent when a deposit needs
a wider permission, Rule 11) is delivered from a stored template that no app
lists on its Emails settings screen, so no manager can review or customize
it. Its two sibling ORCID emails are listed (on journals and presses).
Question: intended, or an omission from the emails roster?
Lean: omission. It shares its purpose and audience with the two listed ones.
Basis: probe + code. <sup>[f-a7](#fn-a7)</sup>

> **Resolved upstream — rebase check (claude), 2026-08-25**: the lean was
> right. pkp/pkp-lib#13050 adds the mailable to the shared map, so the
> template's row now appears wherever its two siblings do (journals and
> presses). A preprint server still lists none of the three — that gap
> remains [OPS2](#ops2)'s. Code-anchored, not live-probed (suites paused).

<a id="a8"></a>
**A8 — A press's or preprint server's ORCID verification failure page says to contact "the journal manager"** · 🐞 · low.
When a contributor's ORCID verification fails on a press or a preprint
server (a used or stale link, a refusal at ORCID, an iD already stored),
the "ORCID Authorization" page closes with "Please contact the journal
manager with your name, ORCID iD, and details of your submission." A
press has a press manager and a preprint server a preprint server
manager; there is no journal. The fix is one English sentence. Ten other
languages translate it, nine of them naming a journal's manager or
editor; their translators would update them afterwards.
Basis: probe, 2026-10-03. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Site ORCID tab on a single-journal install** · ❓ · minor.
Rule 2 says a single-journal install carries no "ORCID" tab in Site
Settings. The tab's presence on multi-journal installs is confirmed. Its
absence rests on the condition that switches the tab on, since every
install at hand hosts several journals.
Question: is the tab really absent when the install hosts a single journal?
Lean: yes. The tab renders only when the install counts more than one
journal.
Basis: code. <sup>[f-a9](#fn-a9)</sup>

<a id="a11"></a>
**A11 — French: the site's ORCID switch is unlabelled, and both ORCID tabs carry the old plugin's name** · 🐞 · low.
A Site Administrator working in French (Canada) expects the site's ORCID
tab in French, as the journal's tab is. Instead the one box that turns
ORCID on for every journal reads "##orcid.manager.siteWide.enabled##",
explained by "##orcid.manager.siteWide.description##": untranslated text
keys, so nothing on the tab says what the box does (Rule 17). Both ORCID
tabs, the site's and the journal's, are named "Plugiciel de profil
ORCID" ("ORCID Profile Plugin"), the name of the retired plugin (Rule
16), where English says "ORCID"; the same old name shows in 31 other
interface languages, whose translations were not marked for review when
the English text changed.
Basis: probe, 2026-10-03. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — French: the contributor's ORCID iD field shows raw codes** · 🐞 · low.
A Journal Manager working in French (Canada) expects the contributor's
ORCID iD field in French. Its label and help text are, but the button
that asks the author to verify their iD and its question, the button's
"requested" state and its resend link, an unverified iD's warning and
the question "Supprimer" asks all show untranslated text keys (Rule 17a).
The buttons still work ("Oui" sends the email or removes the iD), but
the manager cannot read what they confirm.
Basis: probe, 2026-10-03. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — An unauthenticated iD cannot be removed from its owner's profile** · ❓ · minor.
On the profile's Identity tab a verified iD has a "Delete" button, but an
unauthenticated one has none (Rules 5, 6c). A user whose account holds an
iD they never verified, one imported or one connected while registering
([A3](#a3)), cannot remove it themselves: the tab's only button for it,
"Authorize and Connect your ORCID iD", opens ORCID's sign-in. The
contributor's ORCID iD field differs: it offers "Delete" for an
unauthenticated iD and its note asks for that iD to be removed (Fields &
validation).
Question: should the owner of an unauthenticated iD be able to remove it
from their profile?
Lean: yes. The iD is unverified data on their own account, and the
contributor field already allows the same removal.
Basis: probe, 2026-10-01. <sup>[f-a13](#fn-a13)</sup>

<a id="a14"></a>
**A14 — A contributor following the "Requesting updated ORCID record access" link gets a blank page and can never allow deposits** · 🐞 · medium · crash: server.
A journal that moves from ORCID's public API to its member API needs
wider permission from contributors who verified their iD before the
move. When such a contributor's article is published, the journal emails
them "Requesting updated ORCID record access", with a link to ORCID's
sign-in. When ORCID sends them back to the journal, the app fails on the
server and the browser shows a blank page, whether they pressed
"Authorize" or "Deny". Nothing is stored, so the article never reaches
their ORCID record, and every later click fails the same way. The fix
touches two shared classes, and its success path can only be tested
against ORCID's member sandbox. (Rule 11)
Basis: probe, 2026-10-07. <sup>[f-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — The "What is ORCID?" and "ORCID Authorization" pages' browser tab shows only "| {journal name}"** · 🐞 · low.
A journal's public pages name themselves in the browser tab before the
journal's name: "About the Journal | Journal of Public Knowledge". Two
ORCID pages do not, signed in or out. On the "What is ORCID?" page and
the "ORCID Authorization" page the tab reads "| Journal of Public
Knowledge" ("| Public Knowledge Press" on a press, "| Public Knowledge
Preprint Server" on a preprint server), though each page's heading shows
its name. Contributors reach these pages through ORCID. Every ORCID
email links to "What is ORCID?". ORCID sends the contributor back to
"ORCID Authorization" after they answer an authorization request. Both
pages open by their address on every install, whether or not ORCID is
turned on, but nothing links to them until it is. The fix is one
attribute in each of the two page templates, the way the other public
pages already pass their title. (Rules 9, 10)
Basis: probe, 2026-10-07. <sup>[f-a15](#fn-a15)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press verifies iDs but deposits nothing** · ✅ · user-visible.
A press collects and verifies contributor iDs exactly like a journal, with
the same settings, the same emails and the same landing pages. Publishing a
monograph, however, adds nothing to anyone's ORCID record, member API or
not. The deposit machinery declares monograph deposits unsupported for now.
Under the member API the press's What-is-ORCID page (Rule 10) still
tells contributors "In addition, publication metadata will automatically
be pushed to your ORCID record, enabling us to help you keep your record
up-to-date with trusted information."
Rationale: an acknowledged not-yet-built capability, not decay. The code
marks it as pending future work.
Basis: code; the page's text probe, 2026-10-05. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A dead email toggle on preprint servers** · ❓ · latent.
A preprint server's ORCID settings show the same "Send e-mail to request
ORCID authorization from authors…" toggle as a journal. The decision that
triggers those emails (Accept) does not exist on a preprint server, so the
toggle changes nothing. Editors can still request verification per
contributor by hand.
Question: hide the toggle on preprint servers, or give posting the same
trigger?
Lean: hide it. A control that can never act misleads.
Basis: probe + code. <sup>[f-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — ORCID request emails hidden from the OPS Emails screen** · 🐞 · medium.
On a preprint server the Emails settings screen lists no row for the ORCID
request emails, so a manager cannot review or customize them. The "Request
verification" button still sends them using the seeded texts. On journals
and presses the two request emails are listed. They are among nine emails a
preprint server sends that its Manage Emails list leaves out, all from one
cause: the preprint server keeps its own list of emails, and the shared
emails added since 3.4 never joined it.
Basis: probe, issue report walk, 2026-10-02. <sup>[f-ops2](#fn-ops2)</sup>

<a id="ops3"></a>
**OPS3 — Legacy ORCID Profile plugin ships alongside the built-in feature** · ✅ · invisible.
A preprint server's install additionally bundles the old "ORCID Profile"
generic plugin (the pre-3.5 implementation), which journals and presses no
longer carry. The built-in integration described in this spec is what runs.
The plugins screen lists the plugin as "ORCID Profile Plugin", disabled,
with its enable box offered. Journals and presses list no ORCID plugin row.
Basis: probe + code (bundled files + migration helper).
<sup>[f-ops3](#fn-ops3)</sup>

### Retired

<a id="a10"></a>
**A10 — Deleting a contributor's iD fails outright** · ✅ · retired. Fixed upstream (pkp-lib `ecd12271ed` + `d9e9b3fc7c`, pkp/pkp-lib#13003 follow-ups), 2026-09-03. <sup>[f-a10](#fn-a10)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Context form: `PKP\components\forms\context\OrcidSettingsForm`
(component `orcidSettings`), mounted as tab `orcidSettings` in
`templates/management/access.tpl` from `ManagementHandler::access()` — the tab
is unconditional (no enablement gate). Fields/constants:
`OrcidManager::ENABLED/API_TYPE/CLIENT_ID/CLIENT_SECRET/CITY/
SEND_MAIL_TO_AUTHORS_ON_PUBLICATION/LOG_LEVEL`; API options
`publicProduction/publicSandbox/memberProduction/memberSandbox`; API type,
Client ID and Client Secret are `isRequired` and shown only while the enable
box is ticked (`showWhen: orcidEnabled`). Tab label = locale
`orcid.displayName` ("ORCID"). Logging: `OrcidManager::logInfo()/logError()`
via Laravel `Log`, level from `LOG_LEVEL` (`ERROR` default / `INFO` = all).
Screen reachability: Users & Roles gating is the user-management feature's
(`CanAccessSettingsPolicy`). Live-probed 2026-08-07 (OJS, OMP, OPS): tab,
fields, labels and required-field errors as described, identical in all
three apps.

<a id="fn-b"></a>
**b** — Site form: `PKP\components\forms\site\OrcidSiteSettingsForm`
(component `orcidSiteSettings`), tab in `templates/admin/settings.tpl` gated
`componentAvailability['orcidSiteSettings']` =
`AdminHandler::settings()`'s `$isMultiContextSite = context count !== 1`.
Site fields: enable ("Enable ORCID functionality site-wide"), API type,
Client ID, Client Secret only. Override behavior:
`OrcidManager::isGloballyConfigured()` (site `orcidEnabled`) short-circuits
`isEnabled()` to true for every context and makes `getClientId()/
getClientSecret()/getApiType()` read site values; the context form then
renders the enable option `disabled`, API/ID as read-only rows, the secret
as `*************************`, and appends
`orcid.manager.settings.description.globallyconfigured` ("…Contact your site
administrator to disable ORCID functionality or change these credentials.").
City/email-toggle/log-level have no site fields (`getCity()` etc. always read
the context). Live-probed 2026-08-07: the site tab carries exactly the four
fields; enabling site-wide locks every journal's tab as described
("configured globally" text, masked secret); disabling it restores each
journal's own editable values. The single-journal absence case was not
exercised — every test install hosts several journals (finding A9).
Live-probed 2026-09-28 (OJS, OMP, OPS; English and French; two runs
each; Rule 2, Fields "Site-wide ORCID settings"): the side tab
(`#orcidSiteSettings-button`) under "Site Setup", its box "Enable ORCID
functionality site-wide" with the description "ORCID functionality can
optionally be enabled and configured at a site level for all
journals/presses/servers. …"; ticked, the three required fields (API
default "Public"). "Save" ticked with both credentials empty is refused
on the page ("This field is required." under each, "Please correct 2
errors.", Save disabled) and sends no request; "Save" on the untouched,
unticked tab answers "Saved" and stores `orcidEnabled=0`, the box still
unticked after a reload. A tick left unsaved survives a trip to
"Information" and back, and is dropped without a question on leaving the
page (the Site settings spec's Rule 4). Site-level ORCID was never
switched on (`orcidEnabled=0` before and after).

<a id="fn-c"></a>
**c** — Profile: `PKP\user\form\IdentityForm::fetch()` assigns
`orcidEnabled` only when `$request->getContext() && OrcidManager::isEnabled()`
(code comment: ORCID needs a context, so the site-level profile never shows
it); template `lib/pkp/templates/user/identityForm.tpl` guards the whole
block `{if $orcidEnabled}`. Live-probed 2026-08-07 (OJS, OMP, OPS): with
ORCID disabled the Identity tab renders NO ORCID field at all — the
template's fallback plain `orcid` text field does not surface on screen;
enabled, all three connect states render with the strings and icons of
Rule 5, and in the verified state the connect button and About link are
gone. Enabled: the included
`templates/form/orcidProfile.tpl` hides `input[name=orcid]` via JS
(`targetOp == 'profile'`) and injects: authorise variant (hollow icon link +
`orcid.authorise` button) when `$orcid && !$orcidAuthenticated`, connect
variant (`orcid.connect` button) otherwise, or the solid-icon `#orcid-link`
when `$orcidAuthenticated` (`User::hasVerifiedOrcid()` =
`orcidIsVerified`). `openORCID()` pings ORCID logout then
`window.open($orcidOAuthUrl)` — URL from `OrcidManager::buildOAuthUrl(
'authorizeOrcid', ['targetOp' => 'profile'])`; scope `/authenticate` (public)
or `/activities/update` (member). Popup completion:
`AuthorizeUserData::execute()` case `profile` stores
`setVerifiedOrcidOAuthData()` (iD, verified flag, token, scope, refresh,
expiry) and reloads the profile tab. The About link:
`<a href="{orcid/about}" onclick="return openORCID();">` — finding A4.

<a id="fn-d"></a>
**d** — Delete own iD: `#deleteOrcidButton` (guard
`$orcid && $orcidAuthenticated`), confirm modal
`orcid.field.deleteOrcidModal.message`, submits with injected
`removeOrcidId=true`; `IdentityForm::execute()` then nulls
orcid/verified and calls `OrcidManager::removeOrcidAccessToken($user)` which
dispatches `PKP\jobs\orcid\RevokeOrcidToken` (JOB-018 — POST to ORCID's
`oauth/revoke`) and clears token fields. Live-probed 2026-08-07: confirming
the modal removes the iD at once — no separate form save. The modal is the
shared `linkAction/buttonConfirmationLinkAction.tpl`: title
`form.confirmSubmit.title` ("Confirm"), buttons `common.ok` / `common.cancel`;
`identityForm.tpl`, `orcidProfile.tpl` and the three locale strings are
identical in the three apps' lib/pkp, with no app override. Live-probed
2026-10-01 (OJS, two runs, a journal with ORCID on, two throwaway Readers
signed in on the Identity tab; kept walk
`shared/playwright/checks/U14/Ks01/ks01.js`, its `orcid` phase): the
verified Reader's "Delete" opened the window "Confirm" with the question,
"OK" and "Cancel"; the unauthenticated Reader's tab carried no "Delete"
button at all (finding A13).

<a id="fn-e"></a>
**e** — Contributor field: `PKP\components\forms\FieldOrcid` added to
`ContributorForm` only when `OrcidManager::isEnabled()`; Vue
`FieldOrcid.vue` — states per its guards: request button
(`orcid.field.verification.request` / dialog
`orcid.field.authorEmailModal.title/.message`) posting
`orcid/requestAuthorVerification/{authorId}`; requested state
(`orcid.field.verification.requested`, `orcid.field.verification.resendRequest`);
deferred mode `currentValue='shouldRequestVerification'` when `authorId` is 0
— honored by `PKPSubmissionController::addContributor()`, which sends after
creating the author; unverified note `orcid.field.unverified.shouldRequest`;
delete button posting `orcid/deleteForAuthor/{authorId}` →
`OrcidController::deleteForAuthor()` (nulls iD, revokes token). API gate
(API-029): middleware roles Site Admin, Manager, Sub-editor, Author +
`hasEditPermissions()` (managers; assigned sub-editors; the submission's
authors) — `ROLE_ID_ASSISTANT` absent → finding A5. Requests also set
`orcidVerificationRequested` (drives the requested state on reload).
Live-probed 2026-08-07 (OJS deep; OMP and OPS request round-trip): dialog,
requested state, resend link, both iD states and the delete confirmation as
described; the deferred-request dialog adds "The email will be sent once the
author has been created." and the mail goes out on save; an Author reaches
the button from the submission wizard's Contributors step (the dashboard
contributor list is read-only for them on OJS and OMP; test run 2026-09-13
on OPS: the submitting author's dashboard list on an unposted preprint
carried "Order", "Preview", "Add Contributor" and the row's "Edit" and
"Delete", and "Edit" opened the form with the ORCID iD field's "Request
verification", the *Contributors & affiliations* OPS1 baseline).

<a id="fn-f"></a>
**f** — Pages: `PKP\pages\orcid\OrcidHandler` (ROUTE-021), ops
`verify/authorizeOrcid/about/updateScope`, site-access policy all roles
(login required only for `authorizeOrcid` with `targetOp` profile/submit);
`about` renders `frontend/pages/orcidAbout.tpl` (`orcid.about.title` "What
is ORCID?"; member/public branch `orcid.about.howAndWhyMemberAPI` vs
`…PublicAPI`); `verify` matches the author by emailed token
(`orcidEmailToken` + publication `state`) then
`VerifyIdentityWithOrcid` exchanges the OAuth code, stores
verified iD + token, and for published articles deposits at once
(`sendSubmissionSuccess` → "The submission has been added to your ORCID
record."; unpublished → `submissionNotPublished`). Template
`frontend/pages/orcidVerify.tpl` branch keys: success `orcid.verify.success`
+ 10-second JS redirect (`orcid.verify.success.redirect`); failure
`orcid.verify.failure`, `orcid.verify.duplicateOrcid` (Rule 9's duplicate
sentence quotes this key's locale text — the branch itself needs live ORCID
and was not rendered), `orcid.invalidClient`,
`orcid.authFailure`, missing `orcid.authDenied` (finding A2); tail
`orcid.failure.contact`. `updateScope` serves the re-authorization
links (`OrcidDepositType` work or review) and, for a work, finds no
contributor: the emailed link carries no `state`, which
`getAuthorToVerify()` filters on, and the handler then passes the null
identity to `VerifyIdentityWithOrcid` before the code is read (finding
A14). Deny handling:
`OrcidHandler::handleUserDeniedAccess()` stores `orcidAccessDenied`, clears
token fields. Config kill-switch: `[general] sandbox` makes
verify/authorizeOrcid/updateScope return blank (not set on the test
installs). Live-probed 2026-08-07: about and verify render by URL inside
the journal chrome with the stated headings and failure text (OJS; URL
control on OMP and OPS); a member-API journal switches the about page's
"How and why" section. Live-probed 2026-10-05 (Actors row 8; Rules 9–10;
scenario 6; OJS, OMP and OPS on `main`, two runs, signed out and as Site
Administrator, Journal Manager and Author): both pages answered 200 with
"What is ORCID?" and "ORCID Authorization" inside the context's header
and footer; `orcid/verify` typed bare, and the verification email's link
(`…/orcid/verify?token=…&state=…&author_id=…`, reached through
`sandbox.orcid.org/oauth/authorize`) returned with a code ORCID did not
issue, both read "Your ORCID iD could not be verified. The link is no
longer valid." and the `orcid.failure.contact` line, the same words on
OMP and OPS; `orcid/updateScope` typed bare answered the same page (200).
"How and why" under Public Sandbox read "…confident that you are
correctly identified…" with no deposit sentence; under Member Sandbox
"…confident you are correctly identified…" plus "In addition, publication
metadata will automatically be pushed to your ORCID record…" and a link
"Six ways to make your ORCID iD work for you!". The page's links: the
breadcrumb "Home" (the context's front page) and two info.orcid.org
articles; the "Requesting updated ORCID record access" email links the
page too.

<a id="fn-g"></a>
**g** — {OJS} Row action: `useReviewerManagerConfig.js` pushes
`Actions.REVIEWER_SEND_TO_ORCID` (label
`dashboard.reviewAssignment.action.sendReviewToOrcid` = "Send Review To
ORCID") when `reviewAssignment.reviewerHasOrcid &&
pkp.const.REVIEW_ASSIGNMENT_STATUS_COMPLETE` — the second operand is a bare
constant, always truthy (finding A1); `reviewerHasOrcid` =
reviewer's `orcidIsVerified` and not anonymized
(`PKP\submission\maps\Schema`). The guard carries no API-type term;
live-probed 2026-08-07 on a Public Sandbox (public-API) journal: the
completed review's row menu offered "Send Review To ORCID", the dialog read
"Send this review to the reviewer's ORCID?" with OK/Cancel, and confirming
returned 200 with an empty body and closed the dialog with no message. The
deposits-nothing half of that clause stays code-anchored — the deposit
itself is unobservable in-env — per the `DepositOrcidReview::handle()`
member-API gate below. Dialog + POST
`reviews/{submissionId}/{reviewAssignmentId}/sendToOrcid`
(`PKPReviewController::sendToOrcid`, roles Site Admin/Manager/Sub-editor) →
`APP\orcid\actions\SendReviewToOrcid` (OJS: chains
`ReconcileOrcidReviewPutCode` (JOB-034) + `DepositOrcidReview` (JOB-033);
OMP/OPS: base no-op). `DepositOrcidReview::handle()` returns unless status ∈
`REVIEW_COMPLETE_STATUSES`, member API on, and
`OrcidManager::getCity() && getCountry()` — the silent City+country
requirement; public-scope token → dispatches `SendUpdateScopeMail`
(JOB-020). Publication-time review deposits:
`PKPSendSubmissionToOrcid::depositReviewsForSubmission()`. Live-probed
2026-08-07 (OJS + OMP): dialog title "Send Review To ORCID", message "Send
this review to the reviewer's ORCID?", OK/Cancel; confirming succeeded with
no on-screen feedback of any kind.

<a id="fn-h"></a>
**h** — Display value/icons: `Identity::getOrcidDisplayValue()` appends
`orcid.unauthenticated` ("(unauthenticated)") for an unverified iD; solid
(`orcid.svg`) vs hollow (`orcid_unauthenticated.svg`) icon on the same
guard. Live-probed 2026-08-07 (OJS, reviewer list instance of the same
display logic): unauthenticated case rendered the hollow icon + suffixed
link, verified case the solid icon + bare iD link.

<a id="fn-i"></a>
**i** — Registration: `RegistrationForm::fetch()` assigns the block only for
context registration (`$request->getContext() !== null` — code comment);
`orcidProfile.tpl` register variant renders hidden `orcid` field + connect
button. Popup completion: `AuthorizeUserData` case `register` fetches
name/email/country/employment from ORCID and fills the form fields via
JS, hides the connect button; no token is stored anywhere (the account does
not exist yet) and `RegistrationForm::execute()` saves only
`$user->setOrcid(...)` — never `orcidIsVerified` — finding A3. Live-probed
2026-08-07 (OJS): the block renders at the top of the journal registration
form and the form submits without it; the site-level registration page
shows none.

<a id="fn-j"></a>
**j** — Deposit pipeline: listener
`PKP\observers\listeners\SendSubmissionToOrcid` on `PublicationPublished`
(status published/scheduled) → `APP\orcid\actions\SendSubmissionToOrcid
::execute()`: returns unless enabled + member API + app
`canDepositSubmission()`; collects contributors with iD + unexpired token;
per author dispatches `PKP\jobs\orcid\DepositOrcidSubmission` (JOB-017) —
POST/PUT `…/work[/put-code]` with the app's work payload
(`APP\orcid\OrcidWork` over `PKPOrcidWork`; OJS adds issue data), storing
`orcidWorkPutCode` for updates, deleting expired/revoked tokens; a
public-scope token instead dispatches `SendUpdateScopeMail` (JOB-020) →
the `updateScope` landing, which fails before it can resume the deposit
(finding A14). App split: OJS
`canDepositSubmission()` true (+ issue); OPS true (no reviews —
`depositReviewsForSubmission()` overridden empty); OMP false and
`getOrcidWork()` null, with `FIXME: OMP cannot deposit submissions
currently. Check can be removed once added` — finding OMP1. Author-verify
deposits: `VerifyIdentityWithOrcid::depositOrcidItem()`. Publishing
without an issue (Side effects): live-probed 2026-09-28 by the Publish,
schedule & versions check (OJS, "Member Sandbox", a contributor with a
verified iD and token, a journal with no issues): the publish request
failed on the server in the OJS work builder's issue read
(`OrcidWork::getAppDoiExternalIds`), the publication was published after
a reload, and no `DepositOrcidSubmission` was queued; the evidence and
its controls are that spec's note f-ojs4.

<a id="fn-k"></a>
**k** — Listener `PKP\observers\listeners\SendAuthorOrcidEmail` on
`DecisionAdded`: fires for `Decision::ACCEPT` and
`Decision::SKIP_EXTERNAL_REVIEW` when the context's
`orcidSendMailToAuthorsOnPublication` is set, emailing (via
`SendAuthorMail`, JOB-019) every contributor without a live token. Neither
decision exists in OPS — finding OPS1; label text —
finding A6. Listeners auto-discover from `lib/pkp/classes/observers/
listeners` in all three apps (`EventServiceProvider`). Live-probed
2026-08-07 (OJS deep, OMP spot): with the toggle on, "Accept Submission"
and "Accept and Skip Review" each delivered one "Submission ORCID" mail per
contributor alongside the decision mail; with it off, only the decision
mail arrived.

<a id="fn-l"></a>
**l** — Emails: `SendAuthorMail` picks
`OrcidRequestAuthorAuthorization` (member API; key
`ORCID_REQUEST_AUTHOR_AUTHORIZATION`, name "Requesting ORCID record
access") vs `OrcidCollectAuthorId` (public; key `ORCID_COLLECT_AUTHOR_ID`,
name "Submission ORCID"); `SendUpdateScopeMail` sends
`OrcidRequestUpdateScope` (key `ORCID_REQUEST_UPDATE_SCOPE`, name
"Requesting updated ORCID record access"). All from the
principal contact, to the contributor, with variables `authorOrcidUrl`
(single-use OAuth link; token `orcidEmailToken`) + `orcidAboutUrl`
(`OrcidVariables`). Template keys seeded in every app's
`registry/emailTemplates.xml`. Roster gaps: OPS
`classes/mail/Repository::map()` replaces the base list and includes no
ORCID mailable (finding OPS2; OJS map lists the two request mailables, OMP
merges OJS's); `OrcidRequestUpdateScope` is in no app's map (finding A7).
Live-probed 2026-08-07: the public-API request delivered "Submission
ORCID" and the member-API request "Requesting ORCID record access" (wider
permission in its link), from the principal contact, in all three apps. On
the Emails settings screen the two listed rows are titled by internal name
— "orcidCollectAuthorId", "orcidRequestAuthorAuthorization" — so a manager
finds them by searching "ORCID", not by the names above; the row naming
itself is the Emails-management feature's territory.

<a id="fn-m"></a>
**m** — Riders: invitation ORCID step gate
`OrcidManager::isEnabled($context)` in `AcceptInvitationStep` (owned by
*User invitations*); invitation send-wizard note `invitation.orcid.description`
(`UserDetailsForm`, shown only when enabled); reviewer suggestions:
`ReviewerSuggestionsForm` adds plain `FieldText('orcidId')` when enabled;
reviewer-list display: see note h.

<a id="fn-n"></a>
**n** — French interface (Rules 17, 17a): live-probed 2026-09-28 (OJS,
OMP, OPS identical; two runs each, the interface switched to `fr_CA`
under "UI" and "Forms"): Administration › Site Settings (French address
`index/fr_CA/admin/settings`) › "Réglage du site" › "Plugiciel de profil
ORCID" showed the group label "ORCID", the two raw codes, and once ticked
"API ORCID" (default "Public"), "Identifiant ORCID du client", "Clé
secrète du client", each "Obligatoire"; Settings › Users & Roles read
"Utilisateurs-trices", "Rôles", "Options d'accès au site", "Plugiciel de
profil ORCID", its form in French with no raw code ("Activer la
fonctionnalité ORCID", "Ville", "Paramètres des courriels", "Journal des
enregistrements ORCID"). On the workflow's Contributors › "Modifier",
every code of the Rule 17a table; "Oui" posted the request
(`orcid/requestAuthorVerification`, 200) and the removal
(`orcid/deleteForAuthor`, 200), the field then showing the requested
state or the raw request button again, the same after the form was
reopened. English controls on the same scratch journal as in Rules 8
and 8a, with the question windows titled "Request ORCID verification"
and "Delete ORCID". Cause: lib/pkp's `locale/fr_CA/user.po`, shared by
the three apps, translates `orcid.displayName` (both tab names) as
"Plugiciel de profil ORCID" and has none of `orcid.manager.siteWide.*`
nor any of the nine `orcid.field.*` messages `FieldOrcid.vue` asks for
(the ninth, `.authorEmailModal.message.noAuthor`, is the added
contributor's sentence of Rule 8, not driven in French).

<a id="fn-o"></a>
**o** — Not observable on the test installs: these two landings need
ORCID's own sign-in to complete, and outbound HTTP fails at the test
config's dead-port `[proxy]` (the dummy client pair is no ORCID account
either), as Coverage "No seed" says. Read from the code
(`frontend/pages/orcidVerify.tpl`, note f): the success branch
`orcid.verify.success` with its 10-second JS redirect
(`orcid.verify.success.redirect`), and `orcid.verify.duplicateOrcid`,
set by `getAuthorToVerify()` when the link's `author_id` names a
contributor already verified. The links themselves were read on
2026-10-05: they point at ORCID's authorize address with the landing as
the return address.

<a id="fn-s"></a>
**s** — Scenario seeding: scratch journals/submissions via the scenario
endpoints (`POST scenarios/context`, `POST scenarios/submission`,
`scenarios.md`), one scratch context per test and app, its tag carrying app,
scenario and run, every account a `users[]` entry (`<username>@mail.test`,
password the username twice), the Journal Manager a `manager` role entry.
ORCID is enabled with dummy sandbox credentials through the context's
`orcid` key (`orcid: {}` = enabled, Public Sandbox, the dummy
`APP-TESTCLIENTID` pair; scenario 1's and scenario 7's first journal omit the
key, which leaves ORCID off; scenario 9's journal and scenario 4's second
journal pass `apiType: memberSandbox`; scenario 8's two journals pass
`sendMailToAuthorsOnPublication` true and false). The OAuth exchange itself
needs orcid.org — outbound HTTP fails fast at the test config's dead-port
`[proxy]`, and no real ORCID account backs the dummy pair — so scenario
steps stop at the popup/emailed link, and deposit outcomes rest on code,
notes g and j. Verified/unauthenticated iDs are seeded directly
(`user_settings`/`author_settings`: `orcid`, `orcidIsVerified` — recipe
proven in the 2026-08-07 reviewer-list probe; since 2026-09-13 a verified
seed also stamps the access-token fields the profile popup's completion
stores, so it counts as live for Rules 11 and 13, as the 2026-09-13 OJS
serial run showed: no "Submission ORCID" to the verified submitter after
Accept beside the unverified contributor's), the iD ORCID's sandbox
example `https://sandbox.orcid.org/0000-0002-1825-0097`: a `users[]` entry
with `orcid` and `orcidIsVerified: true` is scenario 3's first user and
scenario 9's first reviewer (`externalReviewer`), with `orcidIsVerified:
false` scenario 3's second user; scenario 9's second reviewer and scenario
4's contributors carry no `orcid`; the submission seed's `author: {orcid,
orcidIsVerified}` sets the submitter's contributor record, `false` for
scenario 5's unauthenticated contributor and `true` for the submitter of
scenario 8's second submission on the toggle-on journal. Scenario 9's
submission carries `decisions: ['sendExternalReview']` and one
`reviewRounds[]` entry naming both reviewers `accepted`; the review is
completed on screen through the reviewer wizard before the row action is
pressed. Every ORCID mailable is queued mail and the fleets run with the
job runner off, so scenarios 4 and 8, the two that read the mail catcher,
live in each app's `tests/serial/` suite, which drains the queue (`php
lib/pkp/tools/jobs.php run`) after the action and reads Mailpit scoped by
the throwaway recipient; every silence claim (scenario 8's toggle-off
journal and its verified submitter, scenario 4's not-yet-saved contributor)
waits on a positive control delivered by the same drain. Scenario 4's
journals set `context.contactName` ("ORCID Contact <tag>") and
`context.contactEmail` (`contact-<tag>@mail.test`) and the request email's
From is read against them; its added contributor's address is
`nova-<tag>@mail.test`, typed on the Contributors list's add form (Given
Name, Email and the form's required Country). Scenario 7's second journal is
the enabled one (`orcid: {}`), the site-level Register page is the site's
`index/user/register` (present because the install hosts more than one
context once any scratch context exists), and its registration types a
throwaway username `u04s7-<app>` with `<username>@mail.test`. Scenario 6
types `{journal}/orcid/about` and `{journal}/orcid/verify`. Scenario 10's
submissions are two seeds by the same `author` submitter, `submitted: true`
(opened from the author's dashboard, My Submissions on OJS, whose
contributor list offers no edit on OJS and OMP; on OPS the row's "Edit" is
pressed, the field read and the form closed) and `submitted: false` (a wizard-resumable
draft that opens on "Upload Files"; the Contributors step is reached with
"Continue"; the request's email is queued mail the parallel suite never
drains, so the field alone is read); its Control signs in as the journal's
`manager` entry. Site-level ORCID stays off throughout: Site Settings →
ORCID is a shared singleton across every parallel worker and fleet.

<a id="fn-a1"></a>
**f-a1** — `useReviewerManagerConfig.js` "ORCID reviewer deposit" block:
`if (reviewAssignment.reviewerHasOrcid && pkp.const.REVIEW_ASSIGNMENT_STATUS_COMPLETE)`
— compares nothing to `reviewAssignment.statusId`; the constant (numeric,
non-zero) makes the guard `reviewerHasOrcid`-only. Deposit-side re-check:
`DepositOrcidReview::handle()` early-returns for incomplete statuses
(note g), so the UI offer outruns the deposit. Live-probed 2026-08-07: on
an incomplete review's row the action is offered for a verified-iD
reviewer and absent for a no-iD reviewer (OJS); confirming on a completed
review succeeded with no feedback of any kind; a Press Manager gets the
same action, dialog and silent success (OMP — base `SendReviewToOrcid` is
a no-op there).
Issue report: [pkp-e2e#684](https://github.com/jardakotesovec/pkp-e2e/issues/684) ([docs/issues/U27-A1-send-review-to-orcid-offered-before-complete.md](../issues/U27-A1-send-review-to-orcid-offered-before-complete.md)).
Issue report: [pkp-e2e#736](https://github.com/jardakotesovec/pkp-e2e/issues/736) ([docs/issues/U04-A1-send-review-to-orcid-confirms-in-silence.md](../issues/U04-A1-send-review-to-orcid-confirms-in-silence.md)).

<a id="fn-a2"></a>
**f-a2** — `orcidVerify.tpl` denied branch: `{translate
key="orcid.authDenied"}`; no `msgid "orcid.authDenied"` exists in any
`locale/` tree (the defined key is `orcid.verify.denied`, which nothing
renders). Missing keys render as `##orcid.authDenied##`. The branch is
reached without ORCID's consent screen: "Deny" there only returns the
browser to the authorization link's `redirect_uri`
(`{journal}/orcid/verify?token=…&state=…&author_id=…`) with
`error=access_denied&error_description=…` appended, and that address,
read from the verification email and opened directly, lands on the branch
(`OrcidHandler::verify()` → `handleUserDeniedAccess()`; `error_description`
is required). Live-probed 2026-10-03 on `main` and `stable-3_5_0`, OJS, OMP and
OPS, signed out, on the default datasets with a Member Sandbox placeholder
client (kept walk
`shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js`):
under "ORCID Authorization" the failure box read `##orcid.authDenied##`,
then the `orcid.failure.contact` line; the page answered 200 with no
console error; a denial carrying a token no contributor holds showed the
generic "could not be verified" failure instead. ORCID's consent screen
itself was not driven (orcid.org is unreachable through the dead-port
`[proxy]`, and the placeholder client would be refused).
Issue report: [pkp-e2e#737](https://github.com/jardakotesovec/pkp-e2e/issues/737) ([docs/issues/U04-A2-orcid-denied-page-raw-placeholder.md](../issues/U04-A2-orcid-denied-page-raw-placeholder.md)).

<a id="fn-a3"></a>
**f-a3** — Note i: `AuthorizeUserData` case `register` only fills form
fields; `RegistrationForm::execute()` stores `orcid` without
`orcidIsVerified` or token data. Contrast case `profile`, which stores the
full verified set. The follow-up state (hollow icon + "Authorize and
Connect") is the note-c authorise variant.

<a id="fn-a4"></a>
**f-a4** — `orcidProfile.tpl`: the about link carries
`onclick="return openORCID();"` — `openORCID()` opens the OAuth popup and
returns false, cancelling navigation. Affects profile and register variants
(both render the same capture). Live-probed 2026-08-07 (OJS Identity tab):
the click opened the sign-in popup and never navigated; `/orcid/about`
typed directly renders the page.
Issue report: [pkp-e2e#729](https://github.com/jardakotesovec/pkp-e2e/issues/729) ([docs/issues/U04-A4-what-is-orcid-link-opens-sign-in.md](../issues/U04-A4-what-is-orcid-link-opens-sign-in.md)).

<a id="fn-a5"></a>
**f-a5** — Note e: API-029's role middleware (site admin / manager /
sub-editor / author) + `hasEditPermissions()`; contributor editing
otherwise admits Assistants (the contributors feature's gate). Live-probed
2026-08-07 (OJS): both actions returned an authorization refusal
(HTTP 401) — no email delivered, stored iD unchanged — while the field
showed the requested state / the iD removed.
Issue reports: the field's state, [pkp-e2e#749](https://github.com/jardakotesovec/pkp-e2e/issues/749) ([docs/issues/U04-A5-orcid-field-refusal-shown-as-done.md](../issues/U04-A5-orcid-field-refusal-shown-as-done.md)); the server's refusal, [pkp-e2e#750](https://github.com/jardakotesovec/pkp-e2e/issues/750) ([docs/issues/U04-A5-assistant-orcid-controls-refused.md](../issues/U04-A5-assistant-orcid-controls-refused.md)).

<a id="fn-a6"></a>
**f-a6** — Label `orcid.manager.settings.sendMailToAuthorsOnPublication`
(verbatim in Fields & validation); trigger note k (accept + skip-review,
not copyediting entry, not publication); the constant's own name says
"OnPublication". Docs-vs-behavior only; no code defect. Label
live-confirmed identical in all three apps and trigger live-confirmed
(note k), 2026-08-07.

<a id="fn-a7"></a>
**f-a7** — `OrcidRequestUpdateScope` appears in no `Repository::map()`
(lib/pkp, OJS, OMP or OPS — dispatched directly from `SendUpdateScopeMail`),
and the Emails screen lists templates through the mailable map. Template
seeded in all three registries. Live-probed 2026-08-07: an "ORCID" search
of the Emails screen returns no row for it in any app (the two request
templates are listed on OJS and OMP). Update 2026-08-25 (rebase check):
pkp/pkp-lib#13050 adds `OrcidRequestUpdateScope` (with two unrelated
mailables) to the lib/pkp `Repository::map()`, which OJS and OMP merge; OPS's
override still builds its own list without it, so the OPS absence stands.

<a id="fn-a8"></a>
**f-a8** — The closing line is the shared tail string of the verification
landing (`orcid.failure.contact`, note f) — no per-app recast. Live-probed
2026-08-07: the OMP and OPS `/orcid/verify` pages both close with the
sentence verbatim, "journal manager" unchanged.
Issue report: [pkp-e2e#738](https://github.com/jardakotesovec/pkp-e2e/issues/738) ([docs/issues/U04-A8-orcid-failure-page-says-journal-manager.md](../issues/U04-A8-orcid-failure-page-says-journal-manager.md)).

<a id="fn-a9"></a>
**f-a9** — Note b's gate: the tab renders only while
`AdminHandler::settings()` counts more than one context
(`$isMultiContextSite`). The test installs all host several journals, so
the single-journal case was not exercised (2026-08-07); the multi-journal
presence is live-probed.

<a id="fn-a10"></a>
**f-a10** — POST `api/v1/orcid/deleteForAuthor/{authorId}` answers 500
with `{"error":"Failed to serialize job of type
[PKP\\jobs\\orcid\\RevokeOrcidToken]: Serialization of 'Closure' is not
allowed"}`. Mechanism: pkp/pkp-lib#13003 hydrates every Author with
three closure-backed LazyCollections (`classes/author/DAO.php:143,150,155`
— affiliations, creditRoles, contributorRoles);
`OrcidManager::removeOrcidAccessToken()`
(`classes/orcid/OrcidManager.php:304`) dispatches `RevokeOrcidToken`
storing the whole Author (`jobs/orcid/RevokeOrcidToken.php:29-33`); the
queue dispatch `serialize()`s the closures and throws. The same bug
class was fixed for `SendAuthorMail` in daad5785 (`.collect()` of the
three fields in the constructor) but not here.
`jobs/orcid/DepositOrcidSubmission.php:33` holds a `private Author
$author` too (latent, same landmine), and
`classes/orcid/actions/PKPSendSubmissionToOrcid.php:67` calls the revoke
path from deposit error handling (latent). CLI probe 2026-08-28 on a
seeded install: `serialize(Author)` and `serialize(job)` both throw, and
collecting the three fields fixes serialization. Reported to the team
2026-08-28 (the maintainer has the report). Scenario 5 (suite S5) fails
on all three apps at the 2026-08-29 tips (ojs 0471e029b9 /
omp d34542e83 / ops 28d4cb1dff, lib/pkp 13b621e42); still present at
main 2026-08-29 — per convention the test stays red until the upstream
fix lands (the reds are the bug, not drift). The profile disconnect
(note d) acts on a User, which carries no LazyCollections — unaffected.
Retired 2026-09-03: fixed upstream by pkp-lib `ecd12271ed` ("pkp/pkp-lib#13003
Fix audit report issues") plus `d9e9b3fc7c` ("Do not attempt to serialize
LazyCollections"). Verified fully green on OJS in pkp/ojs Actions run
33466736951 (2026-09-01); on 2026-09-03 both commits sit in OMP's and OPS's
`lib/pkp` (OMP `a1aefa3fe`, OPS `6bda92fb03`) and the apps' own e2e runs at
those tips are green (pkp/omp run 33629780688, pkp/ops run 33629815586, both
2026-09-02). Scenario 5 (suite S5) passes on all three apps again.

<a id="fn-a11"></a>
**f-a11** — Note n (the tabs, the raw codes, the locale cause). Seen
identically on OJS, OMP and OPS in two runs, 2026-09-28; the English
interface is the control (note b). The run records list a server error on
every Site Settings load, from the Plugin Gallery's list
([Plugins management A1](U62-plugins-management.md#a1)); the ORCID tab
itself failed nothing, so the entry carries no crash word.
Issue report: [pkp-e2e#739](https://github.com/jardakotesovec/pkp-e2e/issues/739) ([docs/issues/U04-A11-orcid-tabs-named-after-old-plugin.md](../issues/U04-A11-orcid-tabs-named-after-old-plugin.md)).
Issue report: [pkp-e2e#740](https://github.com/jardakotesovec/pkp-e2e/issues/740) ([docs/issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md](../issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md)).

<a id="fn-a12"></a>
**f-a12** — Note n (every code, the two requests answering 200, the
locale cause). Seen identically on OJS, OMP and OPS in two runs,
2026-09-28, with no failure behind either request; the English field on
the same journals is the control.
Issue report: [pkp-e2e#740](https://github.com/jardakotesovec/pkp-e2e/issues/740) ([docs/issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md](../issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md)).

<a id="fn-a13"></a>
**f-a13** — Note d: `identityForm.tpl` renders `#deleteOrcidButton` and its
confirmation only under `{if $orcid && $orcidAuthenticated}`; the
unauthenticated branch of `orcidProfile.tpl` renders the hollow-icon link
and the `orcid.authorise` button and nothing else. Contrast note e:
`FieldOrcid.vue` offers its delete button for an unverified iD beside
`orcid.field.unverified.shouldRequest`. Live-probed 2026-10-01 (OJS, two runs;
the `orcid` phase of `shared/playwright/checks/U14/Ks01/ks01.js`): a
throwaway Reader seeded with an unverified iD, signed in on a journal with
ORCID on, found no "Delete" on the Identity tab, while a second Reader's
verified iD offered it. OMP and OPS were not walked by that check; both
templates are identical in their lib/pkp, with no app override, and each
app's scenario 3 test already expects no `#deleteOrcidButton` on the
second user's unauthenticated tab.

<a id="fn-a14"></a>
**f-a14** — Live-probed 2026-10-05 on `main` (OJS and OPS, two runs each)
and `stable-3_5_0` (OJS and OPS, two runs each), signed out: a scratch
context on Public Sandbox (dummy `APP-TESTCLIENTID` pair) with a
submission whose contributor seed carries `orcid` and `orcidIsVerified:
true` (token scope `/authenticate`); the ORCID tab switched to "Member
Sandbox" on screen and saved; the article published on screen
("Schedule For Publication" › "Publish"; OPS "Post"); the queue drained
(`DepositOrcidSubmission`, then `SendUpdateScopeMail`). The contributor
received "Requesting updated ORCID record access" from the principal
contact ("Site Admin" on the scratch context), with ORCID's authorize
address twice (scope `/activities/update`) and the What-is-ORCID link;
ORCID's service is not needed for this half. Its `redirect_uri`,
`…/orcid/updateScope?token=…&itemId=…&itemType=work&userId=…&userIdType=author`
(no `state`), opened with `error=access_denied&error_description=…`
(Deny) or with `code=…` (Authorize), answered 500 with an empty page
every time, the server log reading "Uncaught TypeError:
PKP\orcid\actions\VerifyIdentityWithOrcid::__construct(): Argument #1
($identity) must be of type PKP\identity\Identity, null given, called in
…/lib/pkp/pages/orcid/OrcidHandler.php"; afterwards the contributor's
scope was still `/authenticate`, no `orcidAccessDenied` was stored and
the email token remained. OMP (no deposits, so no email): the same
address typed answered the same 500 on `main` and 3.5. Controls: on the
same contexts the verification request's link (`…/orcid/verify?…&state=…`)
returned the same two ways answered the "ORCID Authorization" page (200),
and `updateScope` typed bare answered the "no longer valid" page (200).
Mechanism: `SendUpdateScopeMail::handle()` builds the link without
`state`; `OrcidHandler::updateScope()` → `getIdentityToVerify()` →
`getAuthorToVerify()` filters the publication's authors by `state`, finds
none, prepares the failure (`handleNoAuthorWithToken()`) and goes on,
since `itemType` is set, to `new VerifyIdentityWithOrcid(null, …)`. The
handler and the job are the same on `stable-3_5_0`. A reviewer's
re-authorization (OJS `DepositOrcidReview` dispatches the same email
with `itemType=review`; `getReviewerToVerify()` looks the user up by
`userId` and token, without `state`) was not driven.
Issue report: [docs/issues/U04-A14-orcid-reauthorization-link-blank-page.md](../issues/U04-A14-orcid-reauthorization-link-blank-page.md).

<a id="fn-a15"></a>
**f-a15** — Live-probed 2026-10-05 (OJS, OMP, OPS on `main`, two runs,
signed out and as Site Administrator, Journal Manager and Author; on
`stable-3_5_0` signed out, the same): the `<title>` of `…/orcid/about`,
`…/orcid/verify` and `…/orcid/updateScope` read "| {context name}",
while the same context's "About the Journal" ("About the Press", "About
the Server") and "Login" pages read "About the Journal | {context name}"
and "Login | {context name}". Cause: `orcidAbout.tpl` and
`orcidVerify.tpl` include `frontend/components/header.tpl` without a
`pageTitle` (contrast `userLogin.tpl`, `pageTitle="user.login"`).
Issue report: [docs/issues/U04-A15-orcid-pages-tab-no-page-name.md](../issues/U04-A15-orcid-pages-tab-no-page-name.md).

<a id="fn-omp1"></a>
**f-omp1** — `omp-main/classes/orcid/actions/SendSubmissionToOrcid`:
`canDepositSubmission()` returns false, `getOrcidWork()` returns null;
base `PKPSendSubmissionToOrcid::execute()` early-returns on the flag with
`FIXME … once functionality added to OMP`. Everything identity-side is the
shared lib/pkp path (empty-chain evidence: OMP adds no other ORCID
overrides). The page text is the shared lib/pkp locale
`orcid.about.howAndWhyMemberAPI`; live-probed 2026-10-05 (OMP, two runs,
the ORCID tab switched to "Member Sandbox" on screen): `orcid/about` read
the deposit sentence quoted in the entry, absent under Public Sandbox.
The deposit absence itself was not re-driven (no publish on OMP).

<a id="fn-ops1"></a>
**f-ops1** — Note k: the trigger decisions do not exist in OPS's decision
roster; the settings form is the shared note-a component, so the toggle
renders. Live-probed 2026-08-07: the OPS ORCID tab shows the toggle with
the identical label; a submitted preprint's workflow offers only "Post the
preprint" and "Decline Submission" — no accepting decision.

<a id="fn-ops2"></a>
**f-ops2** — Note l: OPS `Repository::map()` override ("OPS uses distinct
mailables") lists no ORCID mailable while the OPS registry seeds all three
templates; same mechanism as the invitation-template gap recorded in
[User invitations](U06-user-invitations.md). Live-probed 2026-08-07: searching
"ORCID" on the OPS Emails screen returns "No items found.", while "Request
verification" on a preprint contributor delivered the "Submission ORCID"
email (positive control).
Issue report: [pkp-e2e#519](https://github.com/jardakotesovec/pkp-e2e/issues/519) ([docs/issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md](../issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md)).

<a id="fn-ops3"></a>
**f-ops3** — `ops-main/plugins/generic/orcidProfile` (submodule, release
1.3.4.3 / 2023-02-17, lazy-load) — the pre-3.5 plugin generation; absent
from `ojs-main`/`omp-main` plugin trees. OPS also carries the full built-in
integration (`ops-main/classes/orcid/*` mirroring OJS minus reviews). An
`OrcidProfileEmailDataMigration` class inside the plugin suggests it is
kept for upgrade data migration. Live-probed 2026-08-07: OPS Website
Settings → Plugins lists one row among Generic Plugins — "ORCID Profile
Plugin", "Allows for the import of user profile information from ORCID.",
enable box present and unchecked (enabling not exercised), no error
rendered; OJS and OMP list no ORCID plugin row (absence controls).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Journal ORCID settings tab | Settings → Users & Roles → "ORCID" | AFFM-117 |
| Site ORCID settings tab | Site Settings → "ORCID" (multi-journal installs) | AFFM-222 |
| Profile identity ORCID block | Profile → Identity tab | AFFU-065..066, 099..103 |
| Registration ORCID block | `{journal}/user/register` | AFFU-099..101, 103 |
| Contributor ORCID field | workflow → Contributors → add/edit | AFFU-106..110 |
| What-is-ORCID page | `{journal}/orcid/about` | AFFU-104 · ROUTE-021 |
| Verification landing | `{journal}/orcid/verify` (also `updateScope`, `authorizeOrcid`) | AFFU-105 · ROUTE-021 |
| Send Review To ORCID row action {OJS} | workflow → Review → Reviewers table row menu | AFFW-502 (dialog chrome AFFW-506 — owned by *Reviewer assignment & management*) |
| Verification-request API | `POST orcid/requestAuthorVerification/{authorId}` · `POST orcid/deleteForAuthor/{authorId}` | API-029 |
| Review deposit API {OJS} | `POST reviews/{submissionId}/{reviewAssignmentId}/sendToOrcid` | API-032 rider (owned by *Review activity & history*) |
| Request emails | keys `ORCID_COLLECT_AUTHOR_ID`, `ORCID_REQUEST_AUTHOR_AUTHORIZATION`, `ORCID_REQUEST_UPDATE_SCOPE` | MAIL-027..029 |
| Background jobs | work deposit, token revocation, author mail, scope mail | JOB-017..020 |
| Background jobs {OJS} | review deposit, put-code reconciliation | JOB-033..034 |
| Legacy plugin {OPS} | `plugins/generic/orcidProfile` (bundled, install fact) | PLUG-021 |

## Reference — code anchors

- `lib/pkp/classes/orcid/OrcidManager.php` — enablement, API/credential resolution, token revocation
- `lib/pkp/classes/orcid/actions/` — `PKPSendSubmissionToOrcid`, `PKPSendReviewToOrcid`, `VerifyIdentityWithOrcid`, `AuthorizeUserData`
- `lib/pkp/pages/orcid/OrcidHandler.php` — verify/about/updateScope/authorizeOrcid pages
- `lib/pkp/api/v1/orcid/OrcidController.php` — contributor verification-request/delete API
- `lib/pkp/classes/components/forms/context/OrcidSettingsForm.php` · `site/OrcidSiteSettingsForm.php` · `FieldOrcid.php`
- `lib/pkp/jobs/orcid/` — `DepositOrcidSubmission`, `RevokeOrcidToken`, `SendAuthorMail`, `SendUpdateScopeMail`
- `lib/pkp/classes/observers/listeners/SendSubmissionToOrcid.php` · `SendAuthorOrcidEmail.php`
- `lib/pkp/templates/form/orcidProfile.tpl` · `user/identityForm.tpl` · `frontend/pages/orcidVerify.tpl` · `orcidAbout.tpl`
- App layer: `{app}/classes/orcid/actions/SendSubmissionToOrcid.php` (OJS deposit+issue / OMP disabled / OPS deposit, no reviews); OJS `classes/orcid/OrcidWork.php`, `OrcidReview.php`, `jobs/orcid/DepositOrcidReview.php`, `ReconcileOrcidReviewPutCode.php`; OPS `plugins/generic/orcidProfile` (legacy bundle)
- UI library: `src/components/Form/fields/FieldOrcid.vue` · `src/managers/ReviewerManager/useReviewerManagerConfig.js`
