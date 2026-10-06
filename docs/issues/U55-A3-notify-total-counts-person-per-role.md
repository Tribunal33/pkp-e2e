# Notify users: the "Send Email" window counts a person once per ticked role and leaves out the copy

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6374` and `pkp/ui-library#129` for `pkp/pkp-lib#4017` · [eda42e5626](https://github.com/pkp/ui-library/commit/eda42e56265399f875ff64353a9a159bee6630a1) · 2020-11-25 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#12548` (open), covering the double count, reported on 3.3; this report adds the left-out copy, steps on today's code and a tried fix
- **Tracked in** spec U55 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U55-notify-users.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Users & Roles › "Notify", a manager who ticks several
roles is asked to confirm "You are about to send an email to {total}
users", where the total counts a person once for each ticked role they
hold. With "Copy" ticked, the manager's own copy, one more person, is
left out, so with "Copy" ticked and no shared members the total is one
short.

The emails themselves reach the right people, once each; only the
number the manager confirms is wrong. In PKP's default test data every
Author is also a Reader, so "Author" and "Reader" together read 40 for
20 people.

## Impact

- **Lost**: nothing; the manager confirms a send on a wrong number.
- **Who**: managers and the Site Administrator who send a bulk email to
  roles that share members, on a journal, press or server where the
  site allows bulk email.
- **Way round**: none on screen; the manager can only guess the overlap.

Low: a wrong number in a confirmation, on a send that does what it
should. Managers holding back sends because the number looks too large
would raise the severity.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (OMP and OPS the same; their
  numbers in brackets). In it every Author account is also a Reader and
  no one else is a Reader: 20 people [OMP 17, OPS 19]. `rvaca`, the
  Journal manager [Press manager, Preprint Server manager], holds
  neither role.
- The dataset allows no journal bulk email, so step 1 turns it on.

Steps:

1. Sign in as `admin`. Open Administration › "Site Settings" › "Site
   Setup" › "Bulk Emails", tick "Journal of Public Knowledge" ["Public
   Knowledge Press", "Public Knowledge Preprint Server"] and press
   "Save". Sign out.
2. Sign in as `rvaca` and open Settings › Users & Roles › "Notify"
   (`/index.php/publicknowledge/en/management/settings/access#notify`).
3. Tick "Author" and press "Save". The window "Send Email" reads "You
   are about to send an email to 20 users." [17, 19]. Press "Cancel".
4. Tick "Reader" as well and press "Save".
5. Press "Cancel", tick "Copy" ("Send a copy of this email to me at
   rvaca@mailinator.com.") and press "Save".
6. Press "Cancel", type "Library hours" in "Subject" and "The library
   opens at nine." in "Email", press "Save", then "Send Email" in the
   window.
7. Let the queued jobs run (the install's job runner runs them on page
   requests, or run `php lib/pkp/tools/jobs.php run` from the app
   root), then count the emails "Library hours" in the install's mail
   catcher or mail log.

**Expected** Step 4: "You are about to send an email to 20 users." [17,
19], since every Reader is also an Author. Steps 5 and 6: "…to 21
users." [18, 20], the copy to `rvaca` being one more. Step 7: 21 emails
[18, 20].

**Observed** Steps 4, 5 and 6 read the same:

```
Send Email
You are about to send an email to 40 users. Are you sure you want to send this email?
```

(OMP 34, OPS 38). Step 6 shows "Emails are successfully queued to be
sent at the earliest convenience.", and step 7 finds 21 emails [18, 20]:
one to each Author and one to `rvaca`.

With "Author" alone (step 3) the total is right.

## Cause

The confirmation's number is computed in the browser from per-role
counts. `PKPNotifyUsersForm` (pkp-lib,
`classes/components/forms/context/PKPNotifyUsersForm.php`) sends the page
one active-member count per role, `userGroupCounts`, from
`UserGroup::withActiveUserCount()`. ui-library's
`src/components/Form/context/NotifyUsersForm.vue` `nextPage()` adds them
up for the ticked roles:

```js
totalUserCount = this.submitValues.userGroupIds.reduce(
	(total, userGroupId) => {
		return total + this.userGroupCounts[userGroupId];
	},
	0,
);
```

Who receives the email is decided elsewhere, in
`PKPEmailController::create()` (`api/v1/_email/PKPEmailController.php`):
the user collector filtered by the context and the ticked roles returns
each user once, however many of the roles they hold, and `copy` appends
the sender's own id when they are not already in the list. A sum of
per-role counts cannot know either fact, so the window overstates the
reach whenever the roles share members and leaves out the copy.

`pkp/pkp-lib#13184` (lib/pkp 6a902ad50a, 2026-08-31) made each role's
count leave out disabled accounts and ended roles, but kept the sum.

Reach:

- All three apps share the form, the window and the API (code; walked
  on OJS, OMP and OPS on `main` and 3.5).
- 3.4 and 3.3 sum the same way, from
  `getUserCountByContextId()` per role, while their send collects each
  user once (`whereExists` on the role assignments) (code).
- No other ui-library screen sums counts over sets that can overlap
  (code; `StatsEditorialPage` adds submissions by stage, and a
  submission is in one stage).

## Proposed fix

Let the server that picks the recipients also give the number. This is
the first of the options `pkp/pkp-lib#12548` lists.
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-total-counts-person-per-role/fix.diff)):

- `PKPEmailController`: move the parameter parsing, the allowed-roles
  check and the recipient query of `create()` into three methods
  (`getParams()`, `canSendTo()`, `getRecipientIds()`), and add `GET
  _email/recipients`, which answers `{total: <count of
  getRecipientIds()>}` (0 with no role ticked) behind the same
  bulk-email and role checks. `create()` sends to the same
  `getRecipientIds()`, so the number and the send cannot drift apart.
- `NotifyUsersForm.vue`: `nextPage()` asks that endpoint before it opens
  the window, the way `FieldOrcid.vue` calls the API from a method with
  `useUrl()` and `useFetch()`:

```diff
-		nextPage: function (pageId) {
-			let totalUserCount = 0;
-			if (this.submitValues.userGroupIds) {
-				totalUserCount = this.submitValues.userGroupIds.reduce(
-					(total, userGroupId) => {
-						return total + this.userGroupCounts[userGroupId];
-					},
-					0,
-				);
+		nextPage: async function (pageId) {
+			const {apiUrl} = useUrl('_email/recipients');
+			const {data, fetch} = useFetch(apiUrl, {
+				query: {
+					userGroupIds: this.submitValues.userGroupIds || [],
+					copy: this.submitValues.copy,
+				},
+			});
+			await fetch();
+			if (!data.value) {
+				return;
 			}
 			this.openDialog({
 				name: 'confirmNotify',
 				title: this.sendLabel,
-				message: this.confirmLabel.replace('{$total}', totalUserCount),
+				message: this.confirmLabel.replace('{$total}', data.value.total),
```

- `PKPNotifyUsersForm`: drop `userGroupCounts`, its query and its
  config key, and the matching prop in the Vue form, since nothing reads
  them any more.

`copy` is passed as the form holds it (not turned into 0 or 1), so
the count parses it exactly as the send does. The count keeps the intent of `pkp/pkp-lib#13184`,
because the user collector already leaves out disabled accounts and
ended roles.

Tried on `main` on all three apps. With the fix applied, steps 4 to 6
read "…to 20 users." and "…to 21 users." [17 and 18, 19 and 20], and
the send still delivered 21 [18, 20] emails. The neighbouring cases read
the same with the fix in and out: "Author" alone, the manager role with
"Copy" ticked by a manager who holds it (2, 3 on OPS), and nothing
ticked (0). An Author who types the new address is refused (401, "The
current role does not have access to this operation.").

**Alternatives**

- Sending each role's member ids to the page and counting the union in
  the browser: exact, but the page then carries an id for every
  member of every role, which grows with the journal's readership.
- A count per role beside each role's name, and no total: honest, but
  the manager still cannot see the reach of two roles together.
- Dropping the number from the window: it loses the check that
  `pkp/pkp-lib#4017` added before a mass email.

**What goes with it**

- Overlap: [Users & Roles › "Notify": no field is marked required, and
  an empty form asks to email "0 users"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A2-notify-required-fields-unchecked.md)
  changes the same `nextPage()` and `PKPNotifyUsersForm`: it adds a
  `validate()` call before the window opens. Merged, `nextPage()`
  validates, then asks for the count, then opens the window.
- Failure and busy state, not in the tried diff: when the count request
  fails, `useFetch()` opens its own "Error" window instead of the
  confirmation, with the answer's `error` text (a context no longer
  allowed bulk email) or "An unexpected error has occurred. Please
  reload the page and try again." (a refused role, whose 400 carries
  only a field message). And `nextPage()` sets no busy state, so a
  second "Save" while the request runs can open a second window. The
  team should add an `onError` that puts the 400's message on "Roles",
  and set `isSaving`, as `submit()` does, until the window opens.
- `UserGroup::withActiveUserCount()` has no other caller once the form
  drops it. It can stay as a scope or go.
- The new route is internal (`_email` is the UI's own API), and no
  stored data changes.
- Backport: on 3.5 the controller and the Vue file are the same as on
  `main`. One hunk of the form's diff needs rebasing to 3.5's slightly
  different lines. 3.4 and 3.3 would need the route on their Slim
  `PKPEmailHandler` and `$.ajax` in place of `useFetch()`, which their
  ui-library lacks.
- Guard: an end-to-end test that ticks "Author", "Reader" and "Copy"
  and checks the window's number against the emails sent. pkp-e2e's
  Notify test does that send and will check the number once the fix
  lands.

Medium: two repositories, pkp-lib and ui-library, and a new API route.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-total-counts-person-per-role/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-total-counts-person-per-role/lib.js).
  It takes the Steps on OJS, OMP and OPS on an install loaded from PKP's
  default test dataset, and is run from the pkp-e2e repo:
  `node bin/probe.js all shared/playwright/checks/issues/notify-total-counts-person-per-role/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` as its
  argument runs the neighbouring cases alone: "Author" alone, the manager
  role with "Copy", nothing ticked, and an Author (`ccorino`; `aclark` on
  OMP) typing `…/api/v1/_email/recipients`.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp ops`
  (rebuilds the JavaScript), the Steps and the neighbouring cases, then
  `revert`, and the neighbouring cases again with the fix out. With the
  fix out, the typed address answers the app's usual 500 for an unknown
  API route. The Author's check ran on OJS and OPS.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on an
  install freshly loaded from pkp/datasets 1a5552c (2026-10-04),
  PostgreSQL. The count does not depend on the database. No request
  failed and no page script failed on any walk. On 3.5 the walk saved
  the window's text at step 6: 40 [34, 38] for 21 [18, 20] emails. Its
  reads at steps 3 to 5 missed 3.5's window markup, which the script
  now handles.
- Branch tips:
  - main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363); OMP
    3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5). The three files the fix touches are identical in all
    three.
  - stable-3_5_0: OJS c1cee76b95 (pkp-lib 771474347e); OMP 9c5e24246 and
    OPS 38b61882d3 (pkp-lib cf3f984335); ui-library d4e01883.
  - stable-3_4_0: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe, ui-library ee684b34.
  - stable-3_3_0: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, pkp-lib
    ac3fa73402, ui-library 96959f9e.
- Code reads:
  - main and 3.5: `NotifyUsersForm.vue` `nextPage()`,
    `PKPNotifyUsersForm` (constructor, `getConfig()`),
    `PKPEmailController::create()`, `user/Collector.php`
    (`filterByUserGroupIds()`), `UserGroup::scopeWithActiveUserCount()`.
  - 3.4 and 3.3 (pkp-lib's and ui-library's `stable-3_4_0` and
    `stable-3_3_0`, shared by the three apps, each of which has
    `api/v1/_email`): `NotifyUsersForm.vue` `nextPage()` (the same sum),
    `PKPNotifyUsersForm` (`getUserCountByContextId()` per role), the send
    in `PKPEmailHandler` (3.4: the collector; 3.3:
    `PKPUserQueryBuilder::buildUserGroupFilter()`, a `whereExists`, so
    one row per user).
- Introduced: `git blame` on the sum gives eda42e5626 (2020-11-25), apart
  from a trailing comma (7f13651e9) and the method's signature line
  (c7cb4e12b), both later reformatting. GitHub's `commits/<sha>/pulls`
  names `pkp/ui-library#129`. The per-role counts came in pkp-lib
  [891eba2020](https://github.com/pkp/pkp-lib/commit/891eba202036ec9d41ff8896949330918c0a4565)
  (`pkp/pkp-lib#6374`), the same day, for the same issue.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for the
  notify users count, the bulk email count, "send an email to" with
  count, bulk email duplicates, `NotifyUsersForm`, `userGroupCounts` and
  `withActiveUserCount`. Besides the issue in the header,
  `pkp/pkp-lib#13184` (closed) fixed the per-role counts and left the
  double count to that issue.
- Unverified, not driven: a "Copy" box ticked and then unticked goes out
  as the string "false", which PHP reads as true, so the send would
  still send a copy and the fix's count would count it.
