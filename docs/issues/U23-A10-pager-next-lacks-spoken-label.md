# Paged lists: a screen reader announces the pager's "Next" as plain "Next", unlike its "Go to …" neighbours

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; "Next page" beside "Go to Previous page")
  - 3.3: OJS, OMP, OPS (code; "Next page" beside "Go to Previous page")
- **Introduced** `pkp/ui-library#28` for `pkp/pkp-lib#3673` · [463d74c8](https://github.com/pkp/ui-library/commit/463d74c8ac903453350c4adf0b17be471c644320) · 2019-01-29 · Nate Wright (NateWr); on `main` since [c17db264](https://github.com/pkp/ui-library/commit/c17db264bd6089cbde2c899b8f3e783880fd251b) (`pkp/ui-library#29` for `pkp/pkp-lib#2906`)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U23 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Under a list that runs to more than one page, a screen reader announces
the pager's buttons as "Go to Previous", "Go to Page 1", "Go to Page 2"
and plain "Next". Expected: "Go to Next", like its neighbours.

Every button works as labelled, so nothing is lost and no way round is
needed; only the announced name is out of line.

The same pager sits under every paged list of the back office: the
dashboards, Users and invitations, Jobs, Statistics, DOIs,
Announcements, Institutions, the press's Catalog, "Add Reviewer" and
Comments. The editorial dashboard shows it past 30 submissions, the
Users list past 25 users.

## Impact

- **Lost.** Nothing. A screen reader user hears one button named
  differently from the three beside it.
- **Who.** Screen reader users on any list long enough to have a pager,
  every time they move through it.
- **Way round.** None needed: "Next" is understandable and works.

Low: a spoken label is inconsistent and every task gets done; it would
rise only if the button had no name at all.

## Steps to reproduce

The editorial dashboard pages at 30 rows and the default dataset holds
fewer submissions, so no dashboard view of it has a pager. The Users
list on Settings › Users & Roles uses the same pager at 25 rows a page:
the dataset has 39 users on OJS and 38 on OMP; OPS has 25, one page, so
one more account is registered there.

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.
- OPS only: one more user. Signed out, on the server's "Register" page
  (`/index.php/publicknowledge/user/register`), register Given Name
  "Ursula", Family Name "Pager", Affiliation "Pager", Country "Canada",
  Email `u23r3reader@mailinator.com`, Username `u23r3reader`, a
  password, and press "Register". Sign out.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/management/settings/access`), tab
   "Users". The list reads "Current Users (39)" (OMP 38, OPS 26).
3. Under the list, beside "Showing 1 to 25 of 39", the pager shows
   "Previous", "1", "2" and "Next". With a screen reader (or the
   browser's accessibility tree), move through its buttons.
4. Press "Next". The list shows "Showing 26 to 39 of 39". Move through
   the pager's buttons again.

**Expected.** In the navigation "View additional pages" the buttons are
announced "Go to Previous", "Go to Page 1", "Go to Page 2" and "Go to
Next".

**Observed.** The same on all three apps, on page 1 (the accessibility
tree):

```
- navigation "View additional pages":
  - list:
    - listitem:
      - button "Go to Previous" [disabled]: Previous
    - listitem:
      - button "Go to Page 1": "1"
    - listitem:
      - button "Go to Page 2": "2"
    - listitem:
      - button "Next"
```

On page 2 the same names, with "Next" disabled and "Previous" enabled.
No button is named "Go to Next".

## Cause

ui-library's shared
[`Pagination.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/components/Pagination/Pagination.vue#L46-L54)
renders "Next" as a `PkpButton` with its visible text alone. The
"Previous" button just above it
([L9–L20](https://github.com/pkp/ui-library/blob/64d67363/src/components/Pagination/Pagination.vue#L9-L20))
carries `:aria-label="t('common.pagination.goToPage', {page:
t('common.pagination.previous')})"`, and each page number gets the same
key through `getNumberAriaLabel()`
([L170–L173](https://github.com/pkp/ui-library/blob/64d67363/src/components/Pagination/Pagination.vue#L170-L173)).
`common.pagination.goToPage` is "Go to {$page}".

The first version of the component (ui-library 1ef7ce69, 2019-01-17,
on `stable-3_1_2`) built "Previous" and "Next" as items of the same list
as the page numbers, each with the "Go to" label. Twelve days later
463d74c8 moved both out of the list into the template, to keep the focus
on "Next" while the page numbers redraw; the "Previous" button took its
label along and the "Next" button was written without one. The
component reached `main` in that form with c17db264. No release has had
the label on "Next".

Reach (every user of the component, all three apps unless named):

- Settings › Users & Roles › "Users": the users list
  (`UserAccessManager.vue`, on screen) and the pending invitations above
  it (`UserInvitationManager.vue`, 5 a page; code).
- The dashboards through `TablePagination.vue`: the editorial dashboard,
  My Submissions and the reviewer's assignments (`DashboardTable.vue`;
  code).
- Content › Comments, both tables (`UserCommentsTable.vue`,
  `UserCommentReportsTable.vue`; OJS, `main` only; code).
- Administration › Jobs and Failed Jobs (`JobsPage.vue`,
  `FailedJobsPage.vue`; code).
- The Statistics pages' publication table (pkp-lib
  `templates/stats/publications.tpl`; code) and OJS's Statistics ›
  Issues table (OJS `templates/stats/issues.tpl`; code).
- The list panels: DOIs, Announcements, Institutions, the press's
  Catalog (OMP), the "Add Reviewer" list and `SubmissionsListPanel`
  (code).

No other code in ui-library's `src`, pkp-lib's templates and scripts or
the apps' templates and plugins uses `common.pagination.next` or
`common.pagination.goToPage`, so this is the one instance. The public
site's page links (Smarty `page_links`) are separate code.

## Proposed fix

Give "Next" the label "Previous" already has, in the shared component,
so every pager is covered
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pager-next-lacks-spoken-label/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Pagination/Pagination.vue
+++ b/lib/ui-library/src/components/Pagination/Pagination.vue
@@ -46,6 +46,11 @@
 			<li>
 				<PkpButton
 					:disabled="currentPage === lastPage"
+					:aria-label="
+						t('common.pagination.goToPage', {
+							page: t('common.pagination.next'),
+						})
+					"
 					:is-link="true"
 					@click="setPage('next')"
 				>
```

It keeps the separate button that 463d74c8 introduced for the focus,
and the name still contains the visible word "Next" (WCAG 2.5.3,
label in name), so speech input ("click Next") still finds it. It was tried on OJS, OMP and OPS `main`: the buttons
then read "Go to Previous", "Go to Page 1", "Go to Page 2" and "Go to
Next" on both pages. With the fix in and out, the visible texts stayed
"Previous", "1", "2", "Next", the other three names did not change,
"Next" was disabled on the last page only, and "Next" and "Previous"
still moved between the pages.

This is a proposal; the team decides.

**Alternatives:**

- Drop the label from "Previous" too, so both read their visible text:
  consistent, but the page numbers would still read "Go to Page n" and
  the pager would mix two styles.
- Put "Previous" and "Next" back into `items` with an `ariaLabel`, as
  the first version had: brings back the focus loss 463d74c8 fixed.

**What goes with it:**

- The button's accessible name changes from "Next" to "Go to Next": a
  test that finds it by the exact name "Next" follows.
- No API, plugin hook or stored data is involved.
- Backport: applies as written to `stable-3_5_0`. On `stable-3_4_0` and
  `stable-3_3_0` the hunk does not apply: the button there is
  `<pkp-button>`, "Next" has no `:is-link` line and the text uses
  `__()`, so those lines need their own small diff (the same
  attribute, reading "Go to Next page").
- Guard: a ui-library component test that every pager button has a
  "Go to …" name, or an e2e check on a list with two pages (a Planned
  item in U23).

Small: one attribute in one component, copying its neighbour, plus a
test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/pager-next-lacks-spoken-label/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pager-next-lacks-spoken-label/walk.js)
  (helpers in `lib.js` beside it) takes the precondition and Steps 1–4
  on an install freshly loaded from the default dataset, reading the
  pager's accessibility tree:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/pager-next-lacks-spoken-label/walk.js`.
  `MODE=nb` reads the fix's neighbour checks (visible texts, the other
  names, disabled states, "Previous" back to page 1); it ran with the
  fix in and after the revert.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL,
  from pkp/datasets 1a5552c (2026-10-04). No request failed and no page
  script failed.
- The editorial dashboard was not walked here: the dataset has no view
  of it over 30 rows. An earlier campaign walk (2026-09-28, all three
  apps), on a test install whose 31 submissions the campaign's own test
  setup created rather than the default dataset, read the same four
  names under its "Active submissions".
- 3.5: the same Users page (`UserAccessManager`, 25 a page). 3.4 and
  3.3 (code): ui-library `stable-3_4_0` ee684b34 and `stable-3_3_0`
  96959f9e render "Next" with no `aria-label` beside a labelled
  "Previous"; their pkp-lib (`stable-3_4_0` 767353f4fe, `stable-3_3_0`
  ac3fa73402) reads `common.pagination.next` "Next page" and
  `common.pagination.previous` "Previous page", so there the buttons
  read "Go to Previous page" and "Next page". There the pager pages:
  - on both lines, the list panels for submissions, Announcements, the
    press's Catalog and "Add Reviewer", and the Statistics publication
    table (pkp-lib `templates/stats/publications.tpl`);
  - on 3.4 also the DOIs and Institutions list panels, Administration ›
    Jobs and Failed Jobs (pkp-lib `templates/admin/jobs.tpl`,
    `failedJobs.tpl`) and OJS's Statistics › Issues (OJS
    `templates/stats/issues.tpl`); OJS `stable-3_3_0`'s Issues
    statistics page has no pager.
- Introduced: `git blame` on the "Next" button's lines on `main` passes
  renames (9ed5c60f, 7f13651e) and a fix to its disabled state
  (c1ccad1b) before it reaches c17db264.
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d67363); OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c5, the same `Pagination.vue`);
  `stable-3_5_0` OJS c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c,
  OPS 38b61882d3 (`lib/pkp` cf3f984335), `lib/ui-library` d4e01883;
  OJS `stable-3_4_0` d68934d0d1, `stable-3_3_0` ac77c9fb35.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by the
  symptom's words (pagination, next, aria-label, screen reader,
  accessibility) and by `Pagination.vue` and
  `common.pagination.goToPage`. Near miss: `pkp/pkp-lib#5200` (open),
  the public search results' "<" and ">" page links, other code.
