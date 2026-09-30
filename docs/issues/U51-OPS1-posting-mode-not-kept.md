# A preprint server's "Posting Mode" says "Saved" but keeps nothing, and the server goes on posting

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** [b29114d544](https://github.com/pkp/ops/commit/b29114d544854ca2af40b33f35d6c3423ff4c5c2) (no pull request; OPS's first development) · 2019-11-21 · Antti-Jussi Nygård (ajnyga)
- **Upstream** `pkp/pkp-lib#8343` (open), covering OMP as well and planning to take the choice off the screen; `pkp/ops#368`, a pull request that added the missing schema entry, closed unmerged
- **Tracked in** spec U51 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#ops1), spec U08 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#ops2), spec U15 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ops2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a preprint server's Settings › Distribution › "Access", choosing
either "Posting Mode" choice and pressing "Save" shows "Saved", but the
next load of the tab shows neither choice selected. A manager who
chooses "OPS will not be used to post the server's contents online."
expects the server's content to go offline. Instead, visitors and
readers still get "Archives", the search box above the preprints list,
the preprints list, every preprint page with its PDF, and the Search
page.

The proposal makes "Posting Mode" work as the tab promises: the choice
is stored, and the server's pages close as they are already written to.
`pkp/pkp-lib#8343` plans to implement the same mode but to take the
choice off the screen. Storing the choice is needed for that plan too;
whether the tab keeps offering it is the team's decision.

## Impact

- **Lost.** The content the manager chose to take offline stays public.
- **Who.** A Preprint Server manager who wants the server's content
  offline, for example while closing the server. It happens every time,
  for either choice.
- **Way round.** The manager ticks "Users must be registered and log in
  to view the server site." (Users & Roles › "Site Access Options"), or
  the Site Administrator unticks "Enable this server to appear publicly
  on the site" (Administration › Hosted Servers › "Edit"). Either sends
  signed-out visitors to the Login page; any signed-in user still reads
  everything.

Medium: the task fails every time, but the manager can see that it did,
since the tab shows neither choice after a reload and the header still
offers "Archives". The content stays as public as it was before the
save, and the manager can keep signed-out visitors out another way. It
would be high if the tab showed the choice as kept while the pages
stayed open.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (the same on `stable-3_5_0`):
  the server `publicknowledge`, "Public Knowledge Preprint Server", with
  its posted preprints. Nothing is created.

Steps:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open Settings › Distribution, tab "Access"
   (`/index.php/publicknowledge/en/management/settings/distribution#access`).
   Neither "Posting Mode" choice is selected.
3. Choose "OPS will not be used to post the server's contents online."
   and press "Save". "Saved" appears.
4. Reload the page and open the tab "Access" again.
5. Log out and open the server's home page.
6. Press "Archives" in the header.
7. Open preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence"
   (`/index.php/publicknowledge/en/preprint/view/2`).
8. Sign in as `ckwantes` (Author, Reader) and press "Search" in the
   header.

**Expected.** Step 4: "OPS will not be used to post the server's
contents online." is still selected. Step 5: the header has no
"Archives", and the search box above the preprints list is gone. The
header's "Search" link stays, as on a journal that does not publish
online, and leads to the closed Search page. Steps 6 and 7: a visitor
is sent to the Login page. Step 8: the Reader gets a sentence saying the
server does not post its content online instead of the Search page.

**Observed.** Step 3:

```
POST /index.php/publicknowledge/api/v1/contexts/1   (X-Http-Method-Override: PUT)
publishingMode=2&enableOai=true
→ 200; the returned server carries no "publishingMode"
```

Step 4: neither choice is selected. Step 5: the header reads "Archives
About", with the "Search" link, and the search box above the preprints
list is there. Step 6: "Archives" opens the list of preprints. Step 7:
the preprint's page opens. Step 8: the Search page opens. No request
failed and no page script failed.

Choosing "The server will provide open access to its contents." is not
kept either. On a journal (OJS, the same dataset), "OJS will not be used
to publish the journal's contents online." is kept and the header drops
"Current" and "Archives".

## Cause

The "Access" tab's form,
[`APP\components\forms\context\AccessForm`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/components/forms/context/AccessForm.php#L41-L48),
offers `publishingMode` with the values `Server::PUBLISHING_MODE_OPEN`
(0) and `PUBLISHING_MODE_NONE` (2), and saves it through the context
API. OPS's server schema,
[`schemas/context.json`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/schemas/context.json),
has no `publishingMode` property, and neither has pkp-lib's shared
context schema. OJS declares it in its own schema (`in:0,1,2`).

`PKPContextService::edit()` merges the value into the context. Then
[`SchemaDAO::updateObject()`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/classes/db/SchemaDAO.php#L144-L165)
writes only the properties the schema declares. So the value is dropped
without a validation error, the API answers 200 with the server as
stored, and the form shows "Saved".

The code that should follow the mode is all in place. It calls
`getData('publishingMode')`, gets `null`, and treats `null` as open.
The access check that closes the pages,
[`OpsServerMustPublishPolicy`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/security/authorization/OpsServerMustPublishPolicy.php#L35-L66),
denies with the message `user.authorization.serverDoesNotPublish`, a
key in no locale file of OPS or pkp-lib. Today no Reader ever reaches
that message, because the mode is never stored. Once it is stored, a
Reader would see the raw key `##user.authorization.serverDoesNotPublish##`
in its place; pkp-lib's `Locale::translate()` does not fall back to
English. OJS's twin has `user.authorization.journalDoesNotPublish`,
"This journal does not publish its content online.", in its own
`locale/en/locale.po`.

OPS began as a copy of OJS.
[3f69b496b5](https://github.com/pkp/ops/commit/3f69b496b5b6b6fa37de1c5b67ee6a41d0d9a8e6)
(2019-06-03, "remove unnecessary user groups") removed the journal-only
settings from the server schema, `publishingMode` among them.
[c23a08c6a6](https://github.com/pkp/ops/commit/c23a08c6a6338a4d6c04e160becf52ff381a3949) (2019-06-05,
"remove unnecessary settings forms") deleted the Access form. b29114d544
(2019-11-21, "Initial support for OAI") added the form back with the two
"Posting Mode" choices beside "Enable OAI", without the schema entry.

The code that reads `publishingMode`, and how each was checked:

- The header's "Archives" item, `NavigationMenuService` line 85: seen
  in the browser.
- The Search page, the preprints list and the preprint pages with their
  files, through the policy on `SearchHandler`, `PreprintsHandler` and
  `PreprintHandler`: seen in the browser. The section pages, through
  the policy on `SectionsHandler`: read in the code only.
- The search box above the preprints list,
  `templates/frontend/components/searchForm_archive.tpl` line 12: seen
  in the browser.
- A preprint summary's galley link (`preprint_summary.tpl`, line 115)
  and the OAI-PMH Dublin Core record (`Dc11SchemaPreprintAdapter`, line
  149): read in the code only.
- The same mistake elsewhere: on Users & Roles › "Site Access Options",
  OPS's `UserAccessForm` offers `restrictPreprintAccess`, which is not
  in the schema either and which no code reads. Read in the code only,
  not walked; a separate finding, left out of this fix.
- Stored data: nothing was ever written, so there is nothing to repair.

## Proposed fix

A proposal; the team decides. Declare `publishingMode` in OPS's server schema with the two values the
form offers, as OJS does in its own schema, and add the English sentence
the policy shows, as OJS has for its journals. The whole of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posting-mode-not-kept/fix.diff):

```diff
--- a/schemas/context.json
+++ b/schemas/context.json
@@ -86,6 +86,13 @@
 				"nullable"
 			]
 		},
+		"publishingMode": {
+			"type": "integer",
+			"validation": [
+				"nullable",
+				"in:0,2"
+			]
+		},
 		"sponsoringOrganization": {
 			"type": "string",
 			"validation": [
--- a/locale/en/locale.po
+++ b/locale/en/locale.po
@@ -105,6 +105,9 @@
 msgid "user.authorization.representationNotFound"
 msgstr "The requested galley could not be found."
 
+msgid "user.authorization.serverDoesNotPublish"
+msgstr "This server does not post its content online."
+
 msgid "user.noRoles.selectUsersWithoutRoles"
 msgstr "Include users with no roles in this server."
 
```

Tried on `main`. With the fix in, the choice is still selected after a
reload. For a visitor, the header drops "Archives" and keeps "Search",
the search box above the preprints list is gone, and opening the list
or preprint 2 leads to the Login page. `ckwantes` gets "This server does
not post its content online." instead of the Search page and the list.
`dbarnes` still opens the preprints list, the Search page and preprint
2. Saving "The server will provide open access to its contents." is
kept and brings "Archives" back.

**Alternatives**

- Take "Posting Mode" off the tab, as `pkp/pkp-lib#8343` plans. The tab
  would stop promising what it does not do. But the mode would still
  need this schema entry to be stored at all, the access checks that
  are already written would serve no one, and a manager would keep no
  way to take the server's content offline. It is a product decision,
  and not a smaller change.
- Declare the property in pkp-lib's shared context schema: OMP has no
  such mode and OJS takes three values, so each app declares its own.

**What goes with it**

- The context API now accepts and returns `publishingMode` on OPS (0 or
  2; 1 is refused). No plugin hook changes. Servers keep behaving as
  open until a manager chooses.
- Other languages: the diff adds the English sentence only. The other
  OPS languages get it from translators in the usual Weblate flow, as
  OJS's sentence reached 65 of its 78 languages. Until then, a Reader
  using another language sees the raw key there.
- Still shown with the mode set (seen with the fix in): the home page's
  "Latest preprints" list, with titles, authors, keywords and "PDF"
  links that lead to the Login page. Read in the code: the category
  pages and the sitemap do not check the mode. The Dublin Core record
  computes `$includeUrls` from the mode, but puts the preprint page's
  address in `dc:identifier` whatever the mode. OJS hides its current
  issue from its home page in this mode (`IndexHandler`). These belong
  to the full mode `pkp/pkp-lib#8343` asks for. This fix makes the
  choice kept and the existing access checks work.
- Backport: the diff applies as written to 3.5 and 3.4. On 3.3 the
  schema entry goes after `enableOai`, and the policy there denies with
  `user.authorization.journalDoesNotPublish` (in no OPS locale file
  either), so the sentence goes under that key in
  `locale/en_US/locale.po`.
- Test: an end-to-end test that saves each "Posting Mode" choice,
  reloads the tab, and checks the header and a visitor's view of the
  preprints list.

Small: one schema entry and one locale string in OPS, following OJS,
with no data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posting-mode-not-kept/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/posting-mode-not-kept/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). OPS takes steps
  1–8. Then, as a neighbour check, `dbarnes` opens the list, the Search
  page and preprint 2, and saves the open-access choice. OJS takes
  steps 1–5 and the open-access save as the control. OMP has no
  "Access" tab and is skipped.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/posting-mode-not-kept/fix.diff ops`,
  the script, then `node bin/try-fix.js revert ops`. The neighbour
  check ran with the fix in and out.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), on `main` and `stable-3_5_0`.
- Tips:
  - `main`: OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
    OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994)
    and OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    both with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: on 3.5, the diff applies as written (a dry run). On 3.4,
  `schemas/context.json` has no `publishingMode`, `AccessForm.php`
  offers it (lines 45–52), the policy's key is in no locale file, and
  pkp-lib's `SchemaDAO::updateObject()` writes the schema's properties
  only. On 3.3 the same, in `AccessForm.inc.php` (lines 40–47),
  `OpsServerMustPublishPolicy.inc.php` (key
  `user.authorization.journalDoesNotPublish`) and `SchemaDAO.inc.php`.
- Introduced: `git log -S publishingMode` on `schemas/context.json`
  finds 3f69b496b5; `git blame` on the form's `publishingMode` field
  leads to b29114d544, which created the file. GitHub lists no pull
  request for either commit.
- Upstream: `pkp/pkp-lib#8343` (open since 2022) reads "Implement fully
  the PUBLISHING_MODE_NONE for OMP and OPS, but do not provide the
  setting in the UI". `pkp/ops#368` (`main`) and `pkp/ops#367`
  (`stable-3_3_0`), both closed unmerged, were for `pkp/pkp-lib#8318`
  (search results from journals that do not publish); #368 added this
  schema entry. Searched pkp/pkp-lib, pkp/ops and pkp/ui-library.
- Read in the code only: the section pages, category pages, sitemap and
  OAI-PMH record; a signed-out visitor pressing the header's "Search"
  with the fix in (the same policy as the list, walked); the two ways
  round (pkp-lib `RestrictedSiteAccessPolicy`, and `PKPPageRouter`,
  where a disabled context sends a signed-out visitor to the Login
  page); the raw key for other languages (`Locale::translate()`); and
  the `restrictPreprintAccess` box ("Users must be registered and log in
  to view open access content.").
- Not driven: MySQL; languages other than English.
