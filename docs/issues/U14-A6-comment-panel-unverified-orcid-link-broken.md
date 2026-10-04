# Comments page: the link to an unverified ORCID iD in the comment and report panels opens a wrong address

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no reader comments)
  - 3.4: none (code; no reader comments)
  - 3.3: none (code; no reader comments)
- **Introduced** `pkp/ui-library#664` for `pkp/pkp-lib#11576` · [463f5fbf0](https://github.com/pkp/ui-library/commit/463f5fbf09962bdd6ea22a6c2142b7970645764f) · 2025-08-28 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U14 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U14-reader-comments-and-moderation.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On the Comments page, a moderator who opens a comment ("View Comment")
or a report ("View Report") sees the writer's or reporter's ORCID iD as
a link. When the iD is not verified, the link reads
"https://orcid.org/0000-0001-5109-3700 (unauthenticated)", and pressing
it opens that whole text as the address,
`https://orcid.org/0000-0001-5109-3700%20(unauthenticated)`, not the
person's ORCID page. A verified iD's link opens the right page.

Nothing is lost. The link's text is the only place the iD shows, so a
moderator who wants to check the person on ORCID copies that text and
deletes " (unauthenticated)" from it.

Moderators meet it on comments and reports by anyone whose account holds
an ORCID iD that was never verified with ORCID, for example people who
connected their iD while registering.

## Impact

- **Lost.** Nothing stored. A moderator who presses the link to check
  who wrote or reported a comment lands on the wrong address.
- **Who.** Journal Managers and Editors moderating comments, on comments
  and reports by people whose iD is not verified.
- **Way round.** Copy the link's text, delete " (unauthenticated)" and
  open the rest in the browser.

Low: nothing is lost and moderation works; only the link to the
person's ORCID page is wrong, and the moderator can still open that page
from the iD in the link's text.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`: the journal
  `publicknowledge` (public comments off) and its published submission
  17, "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran".
- `zzedd` (Zayan Zedd) has an ORCID iD that is not verified. The dataset
  has no such user, and only ORCID's service creates one. On a test
  install, insert the one row a registration through "Create or Connect
  your ORCID iD" stores (`RegistrationForm::execute()`, Cause):

  ```sql
  INSERT INTO user_settings (user_id, locale, setting_name, setting_value)
  SELECT user_id, '', 'orcid', 'https://orcid.org/0000-0001-5109-3700'
  FROM users WHERE username = 'zzedd';
  ```

Switching comments on:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Website › "Content" › "Comments", tick "Enable Public
   Comments" and press "Save" (after a save this page always reloads on
   Appearance › Theme).

Two comments and a report:

3. Sign in as `zzedd` and open the article page of submission 17
   (`/index.php/publicknowledge/en/article/view/17`).
4. Under "Comments on this publication" type "u14a comment by Zayan
   Zedd" and press "Submit".
5. Sign in as `ccorino` (Carlo Corino), open the same article page, type
   "u14a comment by Carlo Corino" and press "Submit".
6. Sign in as `rvaca` and open Content › Comments
   (`/index.php/publicknowledge/en/management/settings/userComments`).
7. In the row "u14a comment by Carlo Corino" press "…" › "View Comment",
   then "Approve Comment".
8. Sign in as `zzedd` and open the article page of submission 17. On
   Carlo Corino's comment press "…" › "Report", type "u14a report by
   Zayan Zedd" and press "Submit".

The two panels:

9. Sign in as `rvaca` and open Content › Comments.
10. In the row "u14a comment by Zayan Zedd" press "…" › "View Comment".
    Under "Comment preview", press the iD link below "Zayan Zedd".
11. Press "Close". In the row "u14a comment by Carlo Corino" press "…" ›
    "View Comment"; in its "Reports" table, on the row "u14a report by
    Zayan Zedd", press "…" › "View Report". Under "Report preview", press
    the iD link below "Zayan Zedd".

**Expected.** In both panels the link opens Zayan Zedd's ORCID page,
`https://orcid.org/0000-0001-5109-3700`, in a new tab. The hollow icon
and "(unauthenticated)" may still mark the iD as not verified.

**Observed.** In both panels the line shows the hollow icon and a link
whose text and address are the same (the link as read in the page):

```
text: https://orcid.org/0000-0001-5109-3700 (unauthenticated)
href: https://orcid.org/0000-0001-5109-3700 (unauthenticated)
```

Pressing it opens a new tab at
`https://orcid.org/0000-0001-5109-3700%20(unauthenticated)`.

Control: give Carlo Corino a verified iD with the six rows
`PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()` stores
after ORCID's answer, then open his comment panel (step 11's "View
Comment"). The link's text and address are both
`https://orcid.org/0000-0002-1825-0097`, and pressing it opens that
address.

```sql
INSERT INTO user_settings (user_id, locale, setting_name, setting_value)
SELECT u.user_id, '', v.name, v.value FROM users u, (VALUES
  ('orcid', 'https://orcid.org/0000-0002-1825-0097'),
  ('orcidIsVerified', '1'),
  ('orcidAccessToken', 'an-access-token'),
  ('orcidAccessScope', '/activities/update'),
  ('orcidRefreshToken', 'a-refresh-token'),
  ('orcidAccessExpiresOn', '2046-10-02 00:00:00')
) AS v(name, value) WHERE u.username = 'ccorino';
```

## Cause

The two panels are ui-library's
[`UserCommentDetailModal.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/pages/userComments/UserCommentDetailModal.vue#L54-L60)
and
[`UserCommentReportDetailModal.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/pages/userComments/UserCommentReportDetailModal.vue#L48-L54).
Each binds the link's `:href` to `userOrcidDisplayValue`, the same field
it prints as the text.

That field is a display string, not an address. The API fills it from
[`Identity::getOrcidDisplayValue()`](https://github.com/pkp/pkp-lib/blob/987776cd04/classes/identity/Identity.php#L252-L259),
which returns the stored iD for a verified one and appends a space and
`orcid.unauthenticated` ("(unauthenticated)") to an unverified one. The
address belongs to the bare iD, the user setting `orcid`, which
`getOrcid()` returns.

The comment panel's data already holds the bare iD:
[`UserCommentResource`](https://github.com/pkp/pkp-lib/blob/987776cd04/api/v1/comments/resources/UserCommentResource.php#L45-L47)
sends `userOrcid` beside `userOrcidDisplayValue`. The report panel's
does not:
[`UserCommentReportResource`](https://github.com/pkp/pkp-lib/blob/987776cd04/api/v1/comments/resources/UserCommentReportResource.php#L35)
sends only `userOrcidDisplayValue` and `isUserOrcidAuthenticated`.

Reach:

- The article page's comments (on screen): fixed upstream for
  `pkp/pkp-lib#13422` in two halves: pkp-lib
  [f5bd392a69](https://github.com/pkp/pkp-lib/commit/f5bd392a691293ca7274648e5927cfee837ca8db)
  added `userOrcid` to `UserCommentResource`, and ui-library
  [64d67363](https://github.com/pkp/ui-library/commit/64d673631817f14826a048a462e56d9ee0168b44)
  passes it to `PkpOrcidDisplay`. Under a comment the unverified
  writer's icon link opens the bare iD.
- Every other link to a person's iD (code): the Select Reviewer list
  (`SelectReviewerListItem.vue`), the profile's ORCID line
  (`templates/form/orcidProfile.tpl`) and the article page's authors
  (OJS `article_details.tpl`) put the bare iD in the address and the
  display value only in the text. No other `:href` in ui-library takes a
  display value.
- OMP and OPS (code): the Comments page and both panels are the same
  shared code, byte for byte, but no screen there writes a comment, so
  no comment or report shows in them.
- Who has an unverified iD (code):
  when the registration has a context and ORCID is enabled,
  `PKP\user\form\RegistrationForm::execute()` stores the `orcid` that
  the ORCID popup wrote into the registration form
  (`AuthorizeUserData::execute()`, 'register'), as one `user_settings`
  row with locale `''`, and never sets `orcidIsVerified`; the users XML import (`UserXmlPKPUserFilter`) stores
  `orcid` alone; and the 3.5 upgrade
  (`I9771_OrcidMigration::markVerifiedOrcids()`) marks an iD verified
  only when an ORCID access token is stored with it.

## Proposed fix

Put the bare iD in the address and keep the display value as the text,
as the Select Reviewer list and the profile form already do. The report
API sends the bare iD too, as the comment API does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comment-panel-unverified-orcid-link-broken/fix.diff)):

```diff
--- a/lib/pkp/api/v1/comments/resources/UserCommentReportResource.php
+++ b/lib/pkp/api/v1/comments/resources/UserCommentReportResource.php
             'userName' => $user->getFullName(),
+            'userOrcid' => $user->getOrcid(),
             'userOrcidDisplayValue' => $user->getOrcidDisplayValue(),
--- a/lib/ui-library/src/pages/userComments/UserCommentDetailModal.vue
+++ b/lib/ui-library/src/pages/userComments/UserCommentDetailModal.vue
-												:href="comment.userOrcidDisplayValue"
+												:href="comment.userOrcid"
--- a/lib/ui-library/src/pages/userComments/UserCommentReportDetailModal.vue
+++ b/lib/ui-library/src/pages/userComments/UserCommentReportDetailModal.vue
-												:href="report.userOrcidDisplayValue"
+												:href="report.userOrcid"
```

It was tried on OJS `main`. Both panels' links then opened
`https://orcid.org/0000-0001-5109-3700`, and their text still read "…
(unauthenticated)". Three things showed the same with the fix in and
out: a verified iD's link in the comment panel, a writer with no iD
(the panel shows no ORCID line), and the icon links under the comments
on the article page.

This is a proposal; the team decides.

**Alternatives:**

- Build the address in the panels by cutting the suffix off the display
  value: it depends on a translated string, so it breaks in every other
  language.
- Use `PkpOrcidDisplay`, as the article page now does: it is a frontend
  component, and its text drops "(unauthenticated)", the only word in
  the panel that says the iD is not verified.

**What goes with it:**

- Add `userOrcid` to `UserComment` and `UserCommentReport` in OJS's
  `docs/dev/swagger-source.json`, which lists neither (not in the tried
  diff).
- The new field is an addition to the API answer; nothing that reads the
  answer today changes.
- No backport: 3.5 and older have no reader comments.
- Guard: an e2e check that opens both panels for a writer and a reporter
  whose iD is not verified and reads the link's address (U14 has a
  verified writer only).

Medium: the change is three lines, but it spans two repositories,
pkp-lib and ui-library, and the OJS API documentation changes with it.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/comment-panel-unverified-orcid-link-broken/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comment-panel-unverified-orcid-link-broken/walk.js)
  takes the precondition and Steps 1–11 on an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/comment-panel-unverified-orcid-link-broken/walk.js`.
  Its `nb` mode, run after a walk with the fix in and again after the
  revert, reads the Control and the fix's neighbour checks.
- The SQL copies `PKP\user\form\RegistrationForm::execute()` (the
  precondition) and `PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()`
  (the Control); it ran on PostgreSQL only.
- The new tab's address was read against a stand-in for orcid.org (the
  test install has no outside network); what orcid.org answers at
  `…%20(unauthenticated)` was not read.
- Walked on OJS `main` on PostgreSQL, from pkp/datasets 1a5552c
  (2026-10-04). No request failed and no page script failed, apart from
  the test install's Plugin Gallery list (no outside network).
- 3.5, 3.4, 3.3 (code): `stable-3_5_0` has no `lib/pkp/api/v1/comments`
  and no `lib/ui-library/src/pages/userComments` in OJS, OMP or OPS;
  pkp-lib's `stable-3_4_0` and `stable-3_3_0` hold no user comments
  (only submission comments, an unrelated feature).
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d67363); OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c5); `stable-3_5_0` OJS c1cee76b95
  (`lib/pkp` 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (`lib/pkp`
  cf3f984335), `lib/ui-library` d4e01883; pkp-lib `stable-3_4_0`
  767353f4fe, `stable-3_3_0` ac3fa73402.
- Introduced: `git blame` on both `:href` lines gives 463f5fbf0, the
  files' first commit (`pkp/ui-library#664`, "Add backoffice UI for
  comment moderation"). The report resource has sent only the display
  value since its first commit, 3aa127313b (`pkp/pkp-lib#11410` for
  `pkp/pkp-lib#11326`, 2025-06-18, same author).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by the
  symptom's words and by the field, method and component names; the
  near misses are `pkp/pkp-lib#13422` (the article page only) and
  `pkp/ui-library#730` (the Select Reviewer list only).
