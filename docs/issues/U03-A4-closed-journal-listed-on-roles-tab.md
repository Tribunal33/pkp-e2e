# A journal closed to registrations is still listed, with nothing to tick, on Roles tabs and the Register page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#2225` for `pkp/pkp-lib#2039` · [638c16d79e](https://github.com/pkp/pkp-lib/commit/638c16d79eb300cab28d0738a9deaab5f5a60dd2) · 2017-01-24 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U03 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When a journal's manager closes it to registrations ("The Journal
Manager will register all user accounts…" under Site Access Options),
its role boxes disappear everywhere, but its name does not. Other
journals' profiles list it under "Register with other journals" with
nothing to tick, and so do the site-level profile's Roles tab and the
site-wide Register page, under "Which journals on this site would you
like to register with?".

A visitor or a user reads it as a journal they could join, and finds no
way to. The journals that accept registrations keep their boxes.

It needs a site with two or more journals, one of them closed to
registrations. Where exactly one other journal accepts registrations,
the profile opened in the closed journal does not offer that journal
either: its Roles tab has no "Register with other journals" at all.

## Impact

- **Lost**: no data and no role. In the second case the user loses the
  route, from the closed journal's profile, to register with the one
  journal that accepts registrations.
- **Who**: every signed-in user who opens "Register with other
  journals" on another journal's profile, and every visitor on the
  site-wide Register page. A visitor reaches that page from the site
  homepage's "Register" on any site with several journals, unless the
  homepage is redirected to one journal ("Journal redirect" in the site
  settings); then only by its address. The site-level profile shows the
  list to the site administrator always, and to a user with roles in
  two or more journals. The second case reaches a user on the closed
  journal's profile when exactly one other journal is open.
- **Way round**: in the second case, the open journal's own profile
  ("Roles") or its Register page offers its boxes.

Low: the listed name misleads without blocking anything, and the one
missing route has a way round one page away. It would be medium if
visitors were found to give up on registering because the list misled
them.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. OMP and OPS take the same
  steps with "Press" or "Server" for "Journal"; their role boxes differ
  (OMP adds "Chapter Author" and reads "External Reviewer"; OPS has no
  reviewer role).
- The dataset has one journal; the steps add two more, both public, and
  close the second to registrations. Two journals must accept
  registrations for the "Register with other journals" link to show.

Steps:

1. Sign in as `admin`. Administration › "Hosted Journals" › "Create
   Journal": Name "u03rf Open Journal", Journal initials "U03RFO", a
   contact name and email, Country "Canada", Path "u03rfopen", "English"
   as language and primary locale, "Enable this journal to appear
   publicly on the site" ticked; "Save".
2. The same for "u03rf Closed Journal", initials "U03RFC", path
   "u03rfclosed".
3. Open u03rfclosed's Settings › Users & Roles › "Site Access Options"
   (`/index.php/u03rfclosed/en/management/settings/access`). Under "User
   Registration" choose "The Journal Manager will register all user
   accounts. Editors or Section Editors may register user accounts for
   reviewers." (OMP: "The Press Manager will register all user
   accounts. …"; OPS: "The Server Manager will register all user
   accounts."); "Save".
4. Sign out, and sign in as `dbarnes`.
5. Open the profile in u03rfclosed
   (`/index.php/u03rfclosed/en/user/profile`) and press "Roles".
6. Open the profile in publicknowledge
   (`/index.php/publicknowledge/en/user/profile`), press "Roles", then
   "Register with other journals".
7. Sign out, and sign in as `admin`. Open the site-level profile
   (`/index.php/index/en/user/profile`) and press "Roles". (`dbarnes`
   holds roles in one journal only, so this address sends him on to
   that journal's profile.)
8. Sign out, and open the site-wide Register page
   (`/index.php/index/en/user/register`).

Only one other journal open:

9. Sign in as `admin` and close u03rfopen as in step 3.
10. Sign in as `dbarnes`, open the profile in u03rfclosed and press
    "Roles".

**Expected**: a journal closed to registrations is not offered anywhere.
At step 6 the fold lists "u03rf Open Journal" with "Reader", "Author"
and "Reviewer", and nothing else. At step 7 the list holds "Journal of
Public Knowledge" and "u03rf Open Journal", each with its boxes. At step
8, under "Which journals on this site would you like to register with?",
the same two journals. At step 10, "Register with other journals"
offers "Journal of Public Knowledge" with its boxes.

**Observed**: at step 6 the fold lists "u03rf Open Journal" with its
three boxes, then "u03rf Closed Journal" with nothing under it. At step
7 the list ends with "u03rf Closed Journal", again with nothing under
it. At step 8 the Register page lists "Journal of Public Knowledge" and
"u03rf Open Journal" with "Reader" and "Reviewer", then "u03rf Closed
Journal" with nothing under it; a screen reader also reads its prompt
"Request the following roles.", which the default theme hides from
sight. At step 10 the Roles tab holds only "Reviewing interests" (OJS,
OMP) or nothing but the "Roles" heading (OPS). On OMP the lists read
"u03rf Closed Press", on OPS "u03rf Closed Server".

At step 5 the closed journal's own tab looks right: "Roles", then
"Register with other journals" with the two open journals and their
boxes. The page still holds an empty section for u03rf Closed Journal,
which shows nothing only because of a separate fault (Cause).

## Cause

`PKP\user\form\UserFormHelper::assignRoleContent()`
(`lib/pkp/classes/user/form/UserFormHelper.php`) prepares the role
choices for the profile's Roles tab (`RolesForm`) and for the
registration form (`RegistrationForm`). It counts the contexts open to
registration, but hands the templates every enabled context:

```php
$contexts = $contextDao->getAll(true)->toArray();
$contextsWithUserRegistration = [];
foreach ($contexts as $context) {
    if (!$context->getData('disableUserReg')) {
        $contextsWithUserRegistration[] = $context;
    }
}
$templateMgr->assign([
    'contexts' => $contexts,
    'showOtherContexts' => !$request->getContext() || count($contextsWithUserRegistration) > 1,
]);
```

The loop below it skips the closed contexts when it collects the
reader, author and reviewer groups. Two templates loop over `$contexts`
and print each context's name with its groups under it:
`lib/pkp/templates/user/userGroups.tpl` (the profile's other-journal
fold and the site-level list) and
`lib/pkp/templates/frontend/components/registrationFormContexts.tpl`
(the site-wide Register page, which also prints the legend "Request
the following roles." per context). A closed context has no groups, so
it gets its name and nothing under it. Both templates document
`$contexts` as "List of journals/presses on this site that have enabled
registration", and the app's `TemplateManager::initialize()` assigns
exactly that list on site-level pages (`$contextsForRegistration`).
`assignRoleContent()` runs later and overwrites it.

What worked before: in November 2016 (`pkp/pkp-lib#1847`), OJS
76da2ec621 added that filtered list and pkp-lib 87177eb953 removed
`assignRoleContent()`'s own `'contexts' => $contexts`, so the
site-level profile and the site-wide Register page offered only
journals open to registration; the issue's author confirms it there.
Journal-level pages had no `$contexts`, so the profile's fold stayed
empty (`pkp/pkp-lib#2039`). In January 2017, 638c16d79e filled the fold
by putting the assignment of every enabled context back, which also
replaced the filtered list on the site-level pages. Closed journals
then showed with their boxes. In March 2017, 19b1636052
(`pkp/pkp-lib#2375`, "Fix disableUserReg setting effectiveness") made
`assignRoleContent()` and `saveRoleContent()` skip closed contexts,
which removed the boxes and left the names.

Two more places treat the journal the profile is opened in as open to
registration:

- `userGroups.tpl` prints the current journal's section whenever there
  is a current journal, closed or not. For a closed one it is empty.
  It stays invisible only because its label never prints:
  `fbvFormSection label=$userGroupSectionLabel translate=false` goes
  through `lib/pkp/templates/form/formSection.tpl`, which with
  `translate` off assigns `$FBV_Label` (capital L, an unset variable)
  instead of `$FBV_label`. So "Register in {$contextName} as..." is
  missing for open journals too (pkp-lib 0180326a67, 2015). Once that
  typo is fixed, a closed journal's tab would show "Register in u03rf
  Closed Journal as..." with nothing under it.
- `showOtherContexts` counts every journal open to registration, the
  current one included, and asks for more than one. When the profile is
  opened in a closed journal and only one other journal is open, the
  count is 1, so the "Register with other journals" link is not shown
  at all (step 10).

Reach:

- One pkp-lib class and two templates serve OJS, OMP and OPS; no app
  overrides them (code).
- A closed journal's own Register page shows "This journal is
  currently not accepting user registrations." instead of the form
  (`RegistrationHandler::validate()`, code), so the listing shows only
  on site-level pages and in other journals' folds.

## Proposed fix

Hand the templates only the contexts open to registration, count the
others for the fold, and leave the current journal's section out when
it is closed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/closed-journal-listed-on-roles-tab/fix.diff)):

```diff
--- a/lib/pkp/classes/user/form/UserFormHelper.php
+++ b/lib/pkp/classes/user/form/UserFormHelper.php
@@ -42,28 +42,29 @@
      */
     public function assignRoleContent($templateMgr, $request)
     {
-        // Need the count in order to determine whether to display
-        // extras-on-demand for role selection in other contexts.
+        // Only the enabled contexts open to user registration offer roles,
+        // as the site-wide TemplateManager's $contexts and saveRoleContent() do.
         $contextDao = Application::getContextDAO();
-        $contexts = $contextDao->getAll(true)->toArray();
-        $contextsWithUserRegistration = [];
-        foreach ($contexts as $context) {
-            if (!$context->getData('disableUserReg')) {
-                $contextsWithUserRegistration[] = $context;
-            }
-        }
+        $contexts = array_values(array_filter(
+            $contextDao->getAll(true)->toArray(),
+            fn ($context) => !$context->getData('disableUserReg')
+        ));
+        // Need the count of the others in order to determine whether to display
+        // extras-on-demand for role selection in other contexts.
+        $currentContext = $request->getContext();
+        $otherContexts = array_filter(
+            $contexts,
+            fn ($context) => !$currentContext || $context->getId() != $currentContext->getId()
+        );
         $templateMgr->assign([
             'contexts' => $contexts,
-            'showOtherContexts' => !$request->getContext() || count($contextsWithUserRegistration) > 1,
+            'showOtherContexts' => !$currentContext || count($otherContexts) > 0,
         ]);
 
         // Expose potential self-registration user groups to template
         $authorUserGroups = $reviewerUserGroups = $readerUserGroups = [];
 
         foreach ($contexts as $context) {
-            if ($context->getData('disableUserReg')) {
-                continue;
-            }
             $reviewerUserGroups[$context->getId()] = UserGroup::withRoleIds([Role::ROLE_ID_REVIEWER])->withContextIds($context->getId())->get();
             $authorUserGroups[$context->getId()] = UserGroup::withRoleIds([Role::ROLE_ID_AUTHOR])->withContextIds($context->getId())->get();
             $readerUserGroups[$context->getId()] = UserGroup::withRoleIds([Role::ROLE_ID_READER])->withContextIds($context->getId())->get();
--- a/lib/pkp/templates/user/userGroups.tpl
+++ b/lib/pkp/templates/user/userGroups.tpl
@@ -11,7 +11,7 @@
  *}
 
 {fbvFormArea id="userGroups" title="user.roles" class=border}
-	{if $currentContext}
+	{if $currentContext && !$currentContext->getData('disableUserReg')}
 		{capture assign="userGroupSectionLabel"}{translate key="user.register.registerAs" contextName=$currentContext->getLocalizedName()}{/capture}
 		{fbvFormSection label=$userGroupSectionLabel translate=false list=true}
 			{include file="user/userGroupSelfRegistration.tpl" context=$currentContext authorUserGroups=$authorUserGroups reviewerUserGroups=$reviewerUserGroups readerUserGroups=$readerUserGroups}
```

The rule "a journal closed to registrations offers no roles" belongs to
`assignRoleContent()`, the one place both forms take their choices
from, so the fix sits there rather than in each template, and filters
as `TemplateManager::initialize()` already does. With an open current
journal, "at least one other" is the same test as the old "more than
one", so the fold behaves as before; with a closed one it now shows.
The template hunk is needed too: without it, fixing the `$FBV_Label`
typo would print a closed journal's heading over nothing. The intent of
638c16d79e, other journals listed on a journal's profile, is kept. The
typo itself is a separate fault and is left out: fixing it adds the
"Register in … as..." heading to every open journal's Roles tab, a
visible change the team should decide on its own.

Tried on OJS, OMP and OPS `main`: steps 6, 7 and 8 then listed the two
open journals with their boxes and not the closed one, step 5 held no
empty section, and step 10 offered "Register with other journals" with
"Journal of Public Knowledge" and its boxes. What the fix must leave
alone was checked with it in and out, with the same result both times:
publicknowledge's own boxes; a "Reader" ticked under "u03rf Open
Journal" in the fold and saved, still ticked after a reload; and the
Register page offering both open journals with their boxes.

**Alternatives**:

- Skip, inside both templates, a context with no entry in the group
  lists. It hides the symptom in two places and leaves `$contexts`
  holding closed contexts for third-party themes and plugins that read
  it.
- Restore the `TemplateManager` list by not assigning `$contexts` in
  `assignRoleContent()`. Journal-level pages have no such list, so the
  profile's fold would be empty again (`pkp/pkp-lib#2039`).

**What goes with it**:

- Other code that lists contexts for registration already filters:
  `TemplateManager::initialize()` and `RegistrationHandler::validate()`
  build the list of open contexts; `PKPSitemapHandler::_createContextSitemap()`
  and the navigation menu's "Register" item check one context each. No
  other code lists closed contexts (code).
- Nothing stored changes, and saving is untouched. A theme or plugin
  that overrides `registrationFormContexts.tpl` or `userGroups.tpl`
  receives the list its docblock already promises.
- Backport: the same code is on `stable-3_5_0`, where the diff applies
  as it stands. On `stable-3_4_0` the group queries in the context lines
  differ (`Repo::userGroup()->getByRoleIds()`), so the hunk is applied
  by hand; on `stable-3_3_0` the file is `UserFormHelper.inc.php`,
  indented with tabs, and 3.3 supports PHP 7.3, so the arrow functions
  become closures.
- The guard: an e2e check that a journal closed to registrations is not
  listed in another journal's fold, on the site-level profile or on the
  site-wide Register page (a Planned item in spec U03).

Small: a few lines in one pkp-lib method and one template condition,
following a filter the code base already has.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/closed-journal-listed-on-roles-tab/walk.js)
  and
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/closed-journal-listed-on-roles-tab/lib.js),
  run on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/closed-journal-listed-on-roles-tab/walk.js`
  takes steps 1 to 8; with `neighbour` it takes steps 1 to 3, the
  checks of what the fix leaves alone (on the way `dbarnes` takes
  "Reader" in u03rfopen), then steps 9 and 10.
- Walked: steps 1 to 8 on `main` and `stable-3_5_0`, OJS, OMP and OPS,
  the same on all six. Steps 9 and 10 on `main`, three apps, with the
  fix out and in; on `stable-3_5_0` they rest on the code read (the
  same `assignRoleContent()`).
- Branch tips: `main`: OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  `stable-3_5_0`: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
  and OPS 38b61882d3 (lib/pkp cf3f984335). `stable-3_4_0`: OJS
  d68934d0d1, OMP 0aec65441f, OPS acd8ae704b (lib/pkp 767353f4fe).
  `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads: on `main`, the files the Cause names, `RegistrationForm`
  and `RolesForm` (both call `assignRoleContent()`),
  `ProfileHandler::profile()` and `ContextDAO::getAvailable()` (every
  context for the site administrator), `IndexHandler::index()` (the
  site homepage's redirect), the default theme's `register.less` (the
  legend is screen-reader text), every `getAll(true)` and
  `disableUserReg` reader in pkp-lib and OJS, and the `TemplateManager`
  of OMP and OPS. On `stable-3_5_0`, `UserFormHelper.php` and
  `userGroups.tpl` (the same code; the diff applies, `patch
  --dry-run`). On `stable-3_4_0` and `stable-3_3_0`, lib/pkp's
  `UserFormHelper` (`'contexts' => $contexts` and the same count),
  `userGroups.tpl`, `registrationFormContexts.tpl`, `formSection.tpl`
  (the same `$FBV_Label`) and `RegistrationForm`, and each app's
  `TemplateManager`; no app overrides the templates.
- Introduced: `git blame` on the `'contexts' => $contexts` line stops at
  e3f570bc37 (2021, PSR-12 reformatting); `git log -S` on
  `contextsWithUserRegistration` finds 638c16d79e, whose PR is
  `pkp/pkp-lib#2225`. 19b1636052 (no PR) is found by `git log -S
  disableUserReg` on the class.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom's words and by `disableUserReg`,
  `UserFormHelper`, `assignRoleContent`, `userGroups.tpl` and
  `registrationFormContexts`. `pkp/pkp-lib#1847`, `#2039` and `#2375`
  are the history above, all closed.
- MySQL not checked; nothing here depends on the database.
