# A preprint server's site-wide Register page asks for reviewing interests, though servers have no reviewers

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** not traced; present since at least [c8998de57c](https://github.com/pkp/ops/commit/c8998de57c0d739bc69f3b33786a5b56d360f465) (2016-05-18)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U02 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#ops1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A preprint server's site-wide Register page asks "If you requested to be
a reviewer, please enter your subject interests." and offers a box for
them. But a preprint server has no reviewer role. The page offers none
either: where each server is listed with the roles a visitor can tick,
"Reader" is the only one. The server's own Register page asks nothing of
the kind.

Whatever the newcomer types is accepted without a word and kept, though
nothing on a server uses it. On main they never see it again: their
Profile's "Roles" tab has no "Reviewing interests" field. On 3.5 that
tab lists the interests under "Reviewing interests". Nothing breaks, but
the newcomer answers a question that does not apply to them and may
wonder whether they signed up to review.

A site with several servers links to this page from its own menu. On a
site with one server it is reached only by typing its address.

## Impact

- **Lost**: nothing; the account is created as asked.
- **Who**: visitors who register on a preprint-server site's site-wide
  Register page.
- **Way round**: none needed; the visitor can leave the box empty.

Low: wording that misleads while the outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` ("Public Knowledge Preprint
  Server").
- Nothing else. The site hosts one server, so its home page forwards to
  the server; open the site-wide Register page by its address.

Steps:

1. Signed out, open `/index.php/index/en/user/register`, the site-wide
   "Register" page.
2. Look under "Which servers on this site would you like to register
   with?" and below that list.
3. Fill "Given Name" `u02g`, "Family Name" `Visitor`, "Affiliation"
   `u02g`, "Country" "Canada", "Email" `u02g.visitor@mailinator.com`,
   "Username" `u02gvisitor`, and "Password" and "Repeat password"
   `u02gvisitoru02gvisitor`.
4. Under "Public Knowledge Preprint Server", tick "Reader", then tick the
   server's privacy line that appears under it.
5. Type `ethics, statistics` in the box under "If you requested to be a
   reviewer, please enter your subject interests."
6. Press "Register".
7. Open `/index.php/publicknowledge/en/user/profile` and select the
   "Roles" tab.

**Expected**: step 2 shows no reviewing-interests question, as the
server's own Register page (`/index.php/publicknowledge/en/user/register`)
does not, since the server offers no reviewer role.

**Observed**: in step 2, "Public Knowledge Preprint Server" offers
"Request the following roles." with "Reader" alone. Below the list the
page reads "If you requested to be a reviewer, please enter your subject
interests." above a text box. Step 6 ends on "Registration complete"
with no message about the interests. In step 7 the "Roles" tab lists
"Reader" and "Author" and has no "Reviewing interests" field. [3.5: the
tab shows "ethics" and "statistics" under "Reviewing interests".]

Control: on OJS the same steps show "Reader" and "Reviewer" under
"Journal of Public Knowledge" and the question "If you requested to be a
reviewer on any journal, please enter your subject interests.". The
"Roles" tab then lists "ethics" and "statistics" under "Reviewing
interests". OMP is the same, with "External Reviewer".

## Cause

pkp-lib's `templates/frontend/pages/userRegister.tpl` prints the box in
its `{if !$currentContext}` branch (lines 117–129 on `main`) with no
condition at all. The journal-level branch of the same template asks for
interests only inside the reviewer fieldset (lines 72–112). That fieldset
is printed only when `$userCanRegisterReviewer` counts a reviewer group
that permits self-registration in the context.

`UserFormHelper::assignRoleContent()` gives the template every open
context's reviewer groups as `$reviewerUserGroups`. On a preprint site
each server's entry is empty, because OPS's `registry/userGroups.xml`
defines no Reviewer group.

The site-wide branch, with its box shown unconditionally, came with
`pkp/pkp-lib#1443` (36cd2cc1cb, 2016-05-18), which split registration
into a journal-level and a site-wide path. That was before OPS existed,
when every app had reviewers; OPS took the template over unchanged.

`RegistrationForm::execute()` (line 350) saves what was typed with
`Repo::userInterest()->setInterestsForUser()`, into the site's interests
vocabulary. On `main`, `RolesForm::fetch()` stops the "Roles" tab from
printing its field on OPS (`disableInterestsSection`, `Application::get()->getName()
=== 'ops'`, lines 57–58). That came with `pkp/pkp-lib#12013`
([093e000b86](https://github.com/pkp/pkp-lib/commit/093e000b868aac526038d53a22cf916cc66ffc6f),
2025-11-27), which left the Register page's box in place. On 3.5 and
older the tab shows the field on every app.

Reach:

- Settings › "Users & Roles" › a user's "Edit" › "View more details"
  shows a "Reviewing interests" line on OPS too. It reads the user's
  stored interests (`UserRoleAssignmentInviteResource`,
  `reviewInterests` from `getInterestString()`;
  `UserInvitationExtendedMetaData.vue`, no app check). The line was seen
  on OPS `main`, and with the typed values on OPS 3.5. Left out of the
  fix: it shows what is stored, and after the fix nothing new is stored
  on a server.
- A separate fault, outside this report and its fix: on OPS `main`,
  saving the "Roles" tab erases the user's stored interests.
  `userGroups.tpl` (line 49) prints no interests field there, so the
  request carries no `interests`, and `RolesForm::execute()` passes the
  empty value to `setInterestsForUser()`, which deletes the user's
  interests (`classes/user/interest/Repository.php`, line 89). Accounts
  that registered with interests, or came from 3.5, lose them silently
  (code).
- On an OJS or OMP site where no journal or press lets visitors register
  as reviewers, the site-wide page asks the same pointless question. The
  fix hides it there too (code).

## Proposed fix

Show the site-wide box only when at least one context on the page offers
a reviewer group for self-registration, the journal-level branch's rule
read across all contexts:

```smarty
{if !$currentContext}
	{assign var=siteCanRegisterReviewer value=false}
	{foreach from=$reviewerUserGroups item=contextReviewerUserGroups}
		{foreach from=$contextReviewerUserGroups item=userGroup}
			{if $userGroup->permitSelfRegistration}
				{assign var=siteCanRegisterReviewer value=true}
			{/if}
		{/foreach}
	{/foreach}
	{if $siteCanRegisterReviewer}
		<div class="fields">
			<div class="reviewer_nocontext_interests"> … unchanged … </div>
		</div>
	{/if}
```

The full change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/server-site-register-asks-reviewing-interests/fix.diff).
It reads the reviewer groups rather than the app's name, so it also
covers a site whose journals or presses all keep reviewers from
self-registering.

The fix was tried on `main` in OJS, OMP and OPS. With it, the OPS page
has no question and no box, and registration still ends on
"Registration complete". OJS and OMP show the question as before. Two
nearby paths gave the same result with and without the fix: on OJS and
OMP the site-wide page with the reviewer role ticked still saves the
interests to the "Roles" tab, and the server's own Register page still
has no box.

**Alternatives**

- Gate on the app, as `RolesForm` does (`getName() === 'ops'`). This
  matches the Roles tab, but it hard-codes the app and misses an OJS or
  OMP site that offers no reviewer self-registration.
- Compute the flag in `RegistrationForm::fetch()`. This works the same,
  but the journal-level count already lives in the template.
- Change only OPS's text. The question would still ask for something no
  server uses.

**What goes with it**

- Interests already stored by OPS accounts stay. They are harmless, and
  managers still see them under "View more details". No repair.
- No API or hook change. A theme that overrides `userRegister.tpl` keeps
  its own copy.
- 3.5 takes the diff as it stands (same template, same `UserGroup`
  model). 3.4 and 3.3 have the same branch, but their `UserGroup` is a
  `DataObject`, so the condition reads
  `$userGroup->getPermitSelfRegistration()`, as their
  `registrationFormContexts.tpl` does. Not tried.
- Guard: an e2e check that a preprint server's site-wide Register page
  shows no reviewing-interests box.

Small: a few lines in one pkp-lib template, and an e2e check.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/server-site-register-asks-reviewing-interests/walk.js)
  (helpers in `lib.js` beside it) takes steps 1–7 through the screens on
  OJS, OMP and OPS, on an install freshly loaded from the default
  dataset. It then signs in as `admin` and opens the newcomer's
  "Edit" page in Settings › "Users & Roles". `neighbour` as its argument
  runs the nearby paths: on OJS and OMP the site-wide page with the
  reviewer role ticked, then the "Roles" tab; on OPS the server's own
  Register page.
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/server-site-register-asks-reviewing-interests/walk.js [walk|neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/server-site-register-asks-reviewing-interests/fix.diff ojs omp ops`,
  then the steps and the neighbour paths, then `revert` and the
  neighbour paths again. No request failed and no page script failed in
  any walk.
- The manager's "Edit" page, after "View more details": on OPS `main`
  it was read only with the fix applied, where no interests are stored,
  and showed "Reviewing interests --". OJS and OMP `main` and OPS 3.5
  showed "Reviewing interests ethics, statistics". That OPS `main`
  without the fix shows the typed values is read in the code (the same
  resource and component on every app).
- Datasets: pkp/datasets 566bb1f (2026-10-03), `main` and
  `stable-3_5_0`, on PostgreSQL. MySQL not checked; the fault does not
  depend on the database.
- Branch tips. `main`: OJS ff004d0973 (pkp-lib 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6). 3.5: OJS
  c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (pkp-lib cf3f984335). 3.4: pkp-lib 767353f4fe; OPS acd8ae704b. 3.3:
  pkp-lib ac3fa73402; OPS c5532e2161.
- Code reads. `main` and 3.5: pkp-lib
  `templates/frontend/pages/userRegister.tpl` (the same on the three
  apps' pkp-lib on `main`),
  `templates/frontend/components/registrationFormContexts.tpl`,
  `templates/user/userGroups.tpl`,
  `classes/user/form/RegistrationForm.php` (`readInputData()`,
  `execute()`), `classes/user/form/UserFormHelper.php`,
  `classes/user/form/RolesForm.php`,
  `classes/user/interest/Repository.php::setInterestsForUser()`,
  `classes/invitation/invitations/userRoleAssignment/resources/UserRoleAssignmentInviteResource.php`,
  ui-library `src/pages/userInvitation/UserInvitationExtendedMetaData.vue`;
  OPS `registry/userGroups.xml` and `locale/en/locale.po`. 3.5's
  `RolesForm` has no `disableInterestsSection`, and its `userGroups.tpl`
  prints the field unconditionally. 3.4 and 3.3: pkp-lib `stable-3_4_0`
  and `stable-3_3_0` `templates/frontend/pages/userRegister.tpl` print
  the box under `{if !$currentContext}` with no condition (line 110),
  and `templates/user/userGroups.tpl` shows the "Roles" tab's field.
  OPS `stable-3_4_0` and `stable-3_3_0` `registry/userGroups.xml` define
  no Reviewer group, and their `locale/en`/`en_US` `locale.po` carry the
  server's text of the question.
- Introduced: `git blame` on the `{if !$currentContext}` line in pkp-lib
  gives 36cd2cc1cb (`pkp/pkp-lib#1443`, 2016-05-18, Nate Wright), before
  OPS existed. In pkp/ops, `git log -S noContextReviewerInterests` gives
  c8998de57c (`pkp/pkp-lib#1443`, 2016-05-18) as the oldest commit, from
  the history OPS shares with OJS, with OJS's "on any journal" text;
  3d318e9b1c (2019-11-24) gave it the server's own text. So OPS has
  shown the box since it began. `RolesForm`'s OPS check is 093e000b86
  (`pkp/pkp-lib#12014` for `pkp/pkp-lib#12013`), on `main` only.
- Upstream: searched pkp/pkp-lib, pkp/ops and pkp/ui-library for
  reviewer interests with registration, OPS and preprint,
  `noContextReviewerInterests`, `reviewer_nocontext_interests`,
  `disableInterestsSection` and "subject interests".
  `pkp/pkp-lib#1029` (the journal-level box following the reviewer
  tick, 2016) and
  `pkp/pkp-lib#1734` (OMP's wording) are about the same box, not this
  fault. `pkp/pkp-lib#6788` is about the interests box opening ORCID.
- Not driven: 3.4 and 3.3 (read in the code), the fix's backport, saving
  the "Roles" tab on OPS `main` (read in the code), and the site menu's
  "Register" link on a site with several servers. That link opens the
  site-wide page; this is read in the code.
