# Static and custom pages saved with a "." early in their path answer "404 Not Found"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS a custom page only)
  - 3.5: OJS, OMP, OPS (OPS a custom page only)
  - 3.4: OJS, OMP, OPS (code; OPS a custom page only)
  - 3.3: OJS, OMP, OPS (code; OPS a custom page only)
- **Introduced** static pages: [6f150db](https://github.com/pkp/staticPages/commit/6f150db08051dd811522c83fd45141dc4622f553) (no PR) · 2014-09-25 · Alec Smecher (asmecher); custom pages: `pkp/pkp-lib#3335` for `pkp/pkp-lib#2899` · [ecb3765224](https://github.com/pkp/pkp-lib/commit/ecb3765224696d73ef695699d995b416bcd2bec2) · 2018-01-18 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U09 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a10)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

The static page window accepts "." in "Path": the message it shows for
a refused path lists it among the allowed characters ("…alphanumeric
characters plus '.', '/', '-', and '_'."), and the page is saved and
listed. A manager who saves a page at "fees.html" or "info/fees.html"
expects it at that address. Instead the address, typed or followed from
the list's own "Path" link, answers the application's bare "404 Not
Found" page whenever the "." sits in the first or second part of the
path; "info/more/fees.html" opens.

A "Custom Page" item of Settings › Website › "Navigation" does the same:
it saves with a path such as "fees.html", and its address, and any menu
link to it, answers "404 Not Found". Nothing tells the manager when they
save, and no reader can open the page until its path is changed to one
without a "." in its first two parts.

Such paths have never worked, so an upgrade breaks nothing that worked
before. The 404 comes from the application itself, so every install
meets it, whatever its URL settings.

## Impact

- **Lost**: the page's public address, including any old address a
  journal moving its site wanted to keep ("fees.html", "policy.php").
  The page and its text are kept.
- **Who**: a Journal Manager or Press Manager (a static page or a custom
  page), or a Preprint Server Manager (a custom page; OPS has no Static
  Pages plugin), who gives a path with a "." near its start.
- **Way round**: choose another path ("fees-html", or
  "info/more/fees.html"); the address wanted stays out of reach.

Medium: the page cannot be published at the address the form accepted,
and nothing warns the manager, but only for a path with a "." near its
start, and a manager who follows the list's "Path" link meets the 404
and can change the path.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS or OMP for the static pages
  (steps 1 to 9), OJS, OMP or OPS for the custom pages (steps 1 and 10
  to 13; on OPS go from step 1 straight to step 10). The context
  `publicknowledge` has English and French, so its addresses carry
  `/en/`.
- The "Static Pages Plugin" is off in the dataset; step 2 turns it on.

Static pages (OJS, OMP):

1. Sign in as `rvaca` (Journal Manager on OJS, Press Manager on OMP,
   Preprint Server Manager on OPS).
2. Settings › Website › "Plugins": tick "Static Pages Plugin".
3. Reload the page and open the tab "Static Pages".
4. "Add Static Page": Title "u09a10 first", Path "u09a10.html"; "Save".
5. "Add Static Page": Title "u09a10 second", Path "u09a10/fees.html";
   "Save".
6. "Add Static Page": Title "u09a10 third", Path
   "u09a10/info/fees.html"; "Save".
7. In the list, press the "Path" link of "u09a10 first" (it opens a new
   window).
8. Open `/index.php/publicknowledge/en/u09a10/fees.html`.
9. Open `/index.php/publicknowledge/en/u09a10/info/fees.html`.

Custom pages (OJS, OMP, OPS; after step 1):

10. Settings › Website › "Setup" › "Navigation": "Add item", Title
    "u09a10 custom", Navigation Menu Type "Custom Page", Path
    "u09a10-custom.html"; "Save".
11. "Add item", Title "u09a10 custom deep", "Custom Page", Path
    "u09a10-custom/a/page.html"; "Save".
12. Open `/index.php/publicknowledge/en/u09a10-custom.html`.
13. Open `/index.php/publicknowledge/en/u09a10-custom/a/page.html`.

**Expected**: every save is accepted, since each path uses only the
characters the form allows, and every page opens at its own address with
its title as heading.

**Observed**: every save is accepted. The three static pages are
listed with their paths ("u09a10.html", "u09a10/fees.html",
"u09a10/info/fees.html"), and each custom item saves with "Navigation
menu item was successfully added". Steps 7, 8 and 12 answer a page
holding only this line, with status 404:

```
404 Not Found
```

Steps 9 and 13, where the "." is in the third part, open "u09a10 third"
and "u09a10 custom deep".

## Cause

The page router reads the first two parts of an address after the
context (and language) as the page and the operation, and cleans both
with `cleanFileVar()` (`lib/pkp/includes/functions.php`), which keeps
only letters, digits, "_" and "-": `Core::getPage()` and `Core::getOp()`
(`lib/pkp/classes/core/Core.php`), cached by
`PKPPageRouter::getRequestedPage()` and `getRequestedOp()`. The cleaning
is right for them, since the page names a handler file
(`pages/<page>/index.php`), and it has been there since 2008. The
arguments after them, from `getRequestedArgs()`, are not cleaned.

`PKPPageRouter::route()` hands these cleaned values to the `LoadHandler`
hook. Two callbacks on it look up content stored under a path of the
manager's choosing, and both build that path by joining the cleaned page,
the cleaned operation (unless it is "index") and the raw arguments with
"/":

- `StaticPagesPlugin::callbackHandleContent()`
  (`plugins/generic/staticPages/StaticPagesPlugin.php`), then
  `StaticPagesDAO::getByPath()`.
- `PKPNavigationMenuService::_callbackHandleCustomNavigationMenuItems()`
  (`lib/pkp/classes/services/PKPNavigationMenuService.php`), then
  `NavigationMenuItemDAO::getByPath()`.

So "u09a10.html" is looked up as "u09a10html" and "u09a10/fees.html" as
"u09a10/feeshtml", and neither is found. With no handler for the page
either, the router throws `NotFoundHttpException`, which
`PKPApplication::execute()` answers with `HTTP/1.0 404 Not Found` and
`<h1>404 Not Found</h1>`: the application's own answer, not the web
server's. The forms that save the paths, `StaticPageForm`
(`FormValidatorRegExp`, `/^[a-zA-Z0-9\/._-]+$/`) and
`PKPNavigationMenuItemsForm::validate()` (the same pattern), allow "."
anywhere. The static pages plugin introduced both the pattern and the
joined lookup in one commit (6f150db, "make paths more flexible"); the
custom page lookup copied the join in `pkp/pkp-lib#2899`.

The reach:

- Static pages (OJS, OMP) and custom pages (OJS, OMP, OPS): walked.
- URL settings: the router reads the page and operation from the path
  after `index.php` whether `restful_urls` is on or off (a rewrite rule
  passes the path to `index.php`), and `main` and 3.5 have no other
  mode. On 3.3, `disable_path_info = On` reads them from `?page=` and
  `?op=`, cleaned the same way (code).
- Web server: the walks ran on PHP's built-in server. Any server that
  hands the request to `index.php` gets the same answer; a server rule
  that answers ".html" or ".php" addresses itself, before PHP, was not
  checked.
- A menu link to such a custom page: `PKPNavigationMenuService` splits
  the path into page, operation and arguments for
  `PKPPageRouter::url()`, which keeps the "." (`rawurlencode()`), so the
  link leads to the same failing address (code).
- A site-level custom page (Administration) goes through the same
  callback (code).
- The other `LoadHandler` callbacks (Citation Style Language, JATS
  template) match fixed page names and are not affected (code).

## Proposed fix

Give the page router a way to read the requested path as it was
requested, and have both lookups use it.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-dot-path-not-found/fix.diff)
applies from the app root (OJS, OMP; for OPS, without the plugin's file,
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-dot-path-not-found/fix-ops.diff)).
In pkp-lib, `Core::getPathParts()` returns the parts after the context
and language uncleaned, beside `getPage()`, `getOp()` and `getArgs()`,
and `PKPPageRouter::getRequestedPath()` joins them, keeping the lookups'
rule that an "index" or empty operation is left out:

```php
public function getRequestedPath(PKPRequest $request): string
{
    $parts = $this->_getRequestedUrlParts(Core::getPathParts(...), $request);
    if (in_array($parts[1] ?? null, ['', 'index'], true)) {
        unset($parts[1]);
    }
    return implode('/', $parts);
}
```

The two callbacks then replace their own join with
`$path = $request->getRouter()->getRequestedPath($request);`. The page
and operation the router uses to find a handler stay cleaned, so nothing
changes for built-in pages, and the uncleaned path is only compared,
through a bound parameter, with stored paths. There is no
`PKPRequest::getRequestedPath()` proxy: the callbacks' current
`$request->getRequestedArgs()` goes through a `PKPRequest` proxy that is
marked deprecated in favour of the router's method, so a new one would
add to a list being retired.

Tried on `main` (OJS, OMP, OPS): steps 7, 8 and 12 open their pages,
and steps 9 and 13 still do. A second walk created a static page at
"u09a10plain" and a custom page at "u09a10-cplain" (no ".") and read
these addresses with the fix in and out:

- the same result both ways: "u09a10plain", "u09a10plain/index" and
  "u09a10-cplain" open their pages; "about", "about/editorialMasthead"
  and "ab.out" open the About pages (the last through the cleaned page,
  as before); "u09a10.nothing" answers 404.
- one change, as intended: "u09a10.plain" and "u09a10-c.plain" open
  the dot-less pages without the fix, because the "." is stripped before
  the lookup, and answer 404 with it. No screen links to such an
  address.

**Alternatives**:

- Refuse "." in the first two parts in both forms: it keeps the lookups
  as they are, but takes away paths the form's message allows, and
  pages already saved that way stay unreachable.
- Stop cleaning the page and operation in `Core`: the cleaning protects
  the handler file lookup and every page handler; not an option.
- Rebuild the path in each callback from `PATH_INFO`: works, but
  repeats the router's parsing (context, language segment) in two
  places, one of them a plugin.

**What goes with it**:

- The plugin half depends on the pkp-lib half. Static Pages ships inside
  OJS and OMP as a submodule, and its `main` branch follows pkp-lib
  `main`, so the recommendation is to merge the plugin change together
  with the pkp-lib change and move the apps' submodule pointers in the
  same app PRs, as other cross-repo changes do. A `method_exists()`
  guard is not needed then; it would only matter if one plugin branch
  had to run on pkp-lib versions both with and without the method.
- Left as they are: the lookups' other rules. A path whose second part
  is "index" ("info/index") is looked up without it, and a "/" at either
  end is trimmed, so such paths, which both forms accept, stay
  unreachable (code, not driven).
- No stored data to repair: pages saved with a "." open once the fix is
  in.
- Backport: 3.5 has the same code and takes the diff as it stands. On
  3.4 the router passes array callables (`[Core::class, 'getPage']`)
  and `Core::getPage()` takes an `$isPathInfo` argument that it no
  longer uses, so the helper is written in that style. On 3.3,
  `_getUrlComponents()` also reads page, operation and path from the
  GET variables when `disable_path_info` is on, so the helper needs
  that branch too, and there is no language segment to skip.
- Guard: a `testGetRequestedPath` in pkp-lib's
  `tests/classes/core/PKPPageRouterTest.php` beside
  `testGetRequestedPageWithPathinfo` ("u09a10.html",
  "u09a10/fees.html", "info/index", with and without a language).

Medium: two repos (pkp-lib and pkp/staticPages), a new router method
the plugin depends on, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js),
  on an install reset to PKP's default test dataset (pkp/datasets
  38ab955, 2026-09-30, PostgreSQL), signed in as `rvaca`:
  `node bin/probe.js all shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js`
  (with `neighbour` as its argument it takes the second walk above; OPS
  skips the static page steps).
- The fix was applied to the three `main` checkouts with
  `node bin/try-fix.js apply` (fix.diff on OJS and OMP, fix-ops.diff on
  OPS), both walks taken, then reverted; the second walk was taken again
  without it.
- Tips: `main` OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7, pkp-lib
  2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS; the files read are
  identical), staticPages 45d02c0; `stable-3_5_0` OJS 92b9a16b48, OMP
  3081c9b00, OPS cf4fce69bd, pkp-lib a9c76aed62, staticPages fb9b499.
- 3.4 and 3.3 read in the code: pkp-lib `stable-3_4_0` df13621c2d and
  `stable-3_3_0` d446601ebe (`Core::getPage()`/`getOp()` clean with
  `cleanFileVar()`, `/[^\w\-]/`; `PKPNavigationMenuService` joins the
  cleaned page and operation; `PKPNavigationMenuItemsForm` allows "."),
  pkp/staticPages `stable-3_4_0` 9568981 and `stable-3_3_0` 8c97bd0 (the
  same join in `callbackHandleContent()`, the same pattern in
  `StaticPageForm`); OJS `stable-3_4_0` 9571d8fde7, `stable-3_3_0`
  9fdb9bcf9a. The path info off mode was removed in pkp-lib 9bd3a0c3d8
  (`pkp/pkp-lib#8365`), which 3.5 and `main` contain.
- Introduced: in pkp/staticPages, `git log -S` on the join and on the
  path pattern both lead to 6f150db (2014-09-25), which replaced the
  alphanumeric check and the "pages/view/<path>" address with the joined
  lookup; no PR (the commits API lists none). `cleanFileVar()` already
  removed "." then (pkp-lib at 2014-09-25, `Core::cleanFileVar()`), and
  since pkp-lib's first commit (a82d22d38c, 2008). The custom page join:
  ecb3765224, PR `pkp/pkp-lib#3335`, reformatted since (e3f570bc37,
  PSR-12). The custom page path pattern dates from 84a9fdecef
  (2017-09-28, `pkp/pkp-lib#2178`).
- Upstream: pkp/pkp-lib and pkp/staticPages searched by the symptom
  (static page / custom page, path, dot, period, 404) and by
  `callbackHandleContent`, `_callbackHandleCustomNavigationMenuItems` and
  `cleanFileVar`; `pkp/pkp-lib#13004` (static pages reachable without a
  menu) and `#4314` (menu after an upgrade from 2.4) are other faults.
