# A site with Norwegian (Bokmål) installed gets server errors on its settings pages after a code update, and new sites cannot add the language

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS (walked on OJS; OMP, OPS by code)
  - 3.5: OJS, OMP, OPS (walked on OJS; OMP, OPS by code), every install whose `composer install` ran on or after 2026-09-30; the released 3.5.0-5 package (2026-06-30) carries the old list
  - 3.4: none (code; 3.4 has no Weblate language list)
  - 3.3: none (code; 3.3 has no Weblate language list)
- **Introduced** not a PKP change: WeblateOrg/language-data [1d5b84f67d](https://github.com/WeblateOrg/language-data/commit/1d5b84f67d) · 2026-09-30 ("fix: prefer nb for Norwegian Bokmål", first released in its tag 2026.11), read by pkp-lib's `ComposerScript::weblateFilesDownload()`, which downloads the file from language-data's `main` at every `composer install`
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U57 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a14) · ci-triage "Open regressions" · Temporary: delete once acted on
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Since 2026-09-30 every OJS, OMP and OPS build, on `main` and on 3.5,
treats Norwegian Bokmål as an unknown language. The apps ship it as
"nb_NO", but the list of world languages they download while being
installed (Weblate's) now names it "nb". So "Install Locale" no longer
offers it, and on a site that already uses it, Administration › "Site
Settings" and every journal's Settings › Website end in a server error,
and the journal's Norwegian pages answer "Not Found". Nothing in PKP's
code changed: any install or update of the code from now on, and the
next 3.5 release package, is affected.

## Impact

- **Lost**: on a site using Norwegian Bokmål, the Site Administrator
  cannot open "Site Settings" (no languages, no site setup) and managers
  cannot open their journal's website settings; readers lose the
  Norwegian pages. The journal's pages in its other languages still
  open. Nothing is deleted: the settings come back with a correct list.
  A new site cannot add Norwegian Bokmål at all.
- **Who**: every journal, press and preprint server that offers
  Norwegian Bokmål, from the moment its code is installed or updated
  with `composer install` (a git deployment, or a release package built
  after 2026-09-30, such as the next 3.5.0); every new install that wants
  the language.
- **Way round**: none on screen. A server administrator can copy an
  older `lib/pkp/lib/weblateLanguages/languages.json` into place.
- High: a secondary task (the site's and the journal's settings) fails
  for everyone in an ordinary setup that is not the default (a second
  language), with no way round on screen, and readers lose a whole
  language of the journal's pages.

## Steps to reproduce

On PKP's default dataset (OJS `main`), with the code installed before
2026-09-30, or with an older `languages.json` (one that lists `nb_NO`)
copied into `lib/pkp/lib/weblateLanguages/`:

1. Sign in as `admin` / `admin`. Open Administration › "Site Settings" ›
   "Languages" and press "Install Locale". Tick "Norwegian
   Bokmål/norsk bokmål (nb_NO)" and press "Save".
   The list shows "Norwegian Bokmål/norsk bokmål * nb_NO".
2. Tick "Enable" on that row; on Settings › Website › "Setup" ›
   "Languages" of "Journal of Public Knowledge", tick "UI" for it.
   `http://<site>/index.php/publicknowledge/nb_NO` opens the journal in
   Norwegian ("Gå til hovedinnholdet").
3. Update the code as usual (`composer install` in `lib/pkp`, which
   downloads today's language list), or put today's `languages.json` in
   place.
4. Open Administration › "Site Settings".
   - **Expected**: the page, with Norwegian Bokmål on the "Languages"
     list.
   - **Observed**: a server error page; the error log has `PHP Fatal
     error: Uncaught DomainException: Invalid locale "nb_NO" in
     lib/pkp/classes/i18n/LocaleMetadata.php:245` (`:241` on 3.5).
5. Open the journal's Settings › Website.
   - **Expected**: the page.
   - **Observed**: the same server error.
6. Open `http://<site>/index.php/publicknowledge/nb_NO`.
   - **Expected**: the journal's home page in Norwegian.
   - **Observed**: "Not Found" (404); `/publicknowledge/en` still opens.

On a fresh install of today's code, step 1's window lists "Norwegian
Nynorsk/norsk nynorsk (nn)" and no Norwegian Bokmål.

## Cause

`lib/pkp/composer.json` runs `ComposerScript::weblateFilesDownload()`
after every `composer install`. It downloads
`https://raw.githubusercontent.com/WeblateOrg/language-data/main/languages.csv`,
the moving `main` branch, and writes the language codes and names to
`lib/pkp/lib/weblateLanguages/languages.json`. The apps treat that file
as the list of valid languages: `Locale::isLocaleValid()` looks a code
up in it, `Locale::getLocales()` keeps a locale folder only if its name
is valid, and `LocaleMetadata::_parse()` throws `DomainException`
for an installed language that is not.

On 2026-09-30 Weblate renamed Norwegian Bokmål from `nb_NO` to `nb`
(language-data `1d5b84f67d`). The apps' folders are `locale/nb_NO`
(3.5's upgrade `I9707_WeblateUILocales` renamed `nb` to `nb_NO`
precisely to match Weblate then). So the shipped language is no longer
valid: it drops out of "Install Locale", and the site's installed
`nb_NO` throws on every page that lists the installed languages with
their names (the site's "Languages" grid, `Site::getInstalledLocaleNames()`,
the journal's website settings). The journal's `nb_NO` pages answer 404
because the address's language segment is no longer a valid language.

Because the download follows `main`, any later rename on Weblate's side
breaks installs the same way, without a PKP commit.

## Proposed fix

Read a fixed release of Weblate's list, not `main`, so a build is the
same whenever it runs, and move to a newer release deliberately, with
the folder renames and the upgrade migration it needs. Tried in
`lib/pkp/classes/dev/ComposerScript.php` (small effort; the same line
on `main` and `stable-3_5_0`):

```diff
-            $urlCsv = 'https://raw.githubusercontent.com/WeblateOrg/language-data/main/languages.csv';
+            $urlCsv = 'https://raw.githubusercontent.com/WeblateOrg/language-data/2026.10/languages.csv';
```

Tag 2026.10 is the last release before the rename and lists `nb_NO`.
With it, `composer run-script weblateFilesDownload` writes a list with
`nb_NO`, and the install of step 3 opens "Site Settings" and Settings ›
Website again (200) and serves `/publicknowledge/nb_NO` in Norwegian.

Whether to follow Weblate to `nb` later (renaming the folders in the
apps and plugins, the stored settings and the translation project, as
`I9707_WeblateUILocales` did the other way) is the team's call. Either
way, an installed language the list does not know could be shown under
its code instead of making the page fail, so that a future rename
cannot take the settings pages down.

## Evidence

- Kept script: `shared/playwright/checks/sync/weblate-nb/norwegian.js`
  on a dataset fleet (PKP's default dataset, pkp/datasets `384e28b`,
  freshly loaded). `DATA=old STEP=install` writes today's list with
  `nb` named `nb_NO` again (the file as built before 2026-09-30), the
  administrator installs Norwegian Bokmål through "Install Locale", and
  SQL enables it for the site and the journal (`site.supported_locales`,
  the journal's `supportedLocales`, `supportedFormLocales`,
  `supportedSubmissionLocales`); `DATA=new STEP=read` reads the same
  install with today's file. The script restores the file it changes.
  - `main`, OJS (`.reports/sync-nb/s1013/`): before, "Install Locale"
    offered 80 languages including "Norwegian Bokmål/norsk bokmål
    (nb_NO)"; after the install the grid read "… Norwegian
    Bokmål/norsk bokmål * nb_NO …", `/publicknowledge/nb_NO` 200 with
    `lang="nb-NO"`. After: `admin/settings` 500 and
    `management/settings/website` 500 (`Uncaught DomainException:
    Invalid locale "nb_NO"` in `LocaleMetadata.php:245`, preceded by
    `Undefined array key "nb_NO"` warnings at `LocaleMetadata.php:108`),
    `/publicknowledge/nb_NO` 404, `/publicknowledge/en` 200.
  - `stable-3_5_0`, OJS (`.reports/sync-nb-3_5/s1013/`): the same
    before and after (`LocaleMetadata.php:241`).
  - A journal with `nb_NO` as its primary language (set in SQL on the
    `main` fleet, today's file): its home, `/en` pages and login page
    answered 200; not read further.
  - Fix tried (`shared/playwright/checks/sync/weblate-nb/fix.diff` in
    the OJS checkout's lib/pkp, then `composer run-script
    weblateFilesDownload`): the list held `nb_NO` again and
    `DATA=new STEP=read` (`.reports/sync-nb/s1013fix/`) read both
    settings pages 200 and `/publicknowledge/nb_NO` 200 with
    `lang="nb-NO"`; reverted.
- The lists in the checkouts: OJS, OMP and OPS `main` (built
  2026-10-12) and 3.5 OJS (built 2026-10-08) all name `nb` and `nn`, no
  `nb_NO`. language-data tags: 2026.9 and 2026.10 (2026-07-29) list
  `nb_NO`; 2026.11 (2026-09-30) lists `nb`.
- Tips: ojs `7c6fba2064`, lib/pkp `f4c2578c94`; stable-3_5_0 ojs
  `5fc74d6213`, lib/pkp `f4f8fcdbc0`. 3.4 and 3.3: `lib/pkp/classes/i18n`
  of the stable-3_4_0 checkout has no Weblate list; 3.3 neither.
- First seen by the housekeeping session's U56 claim check on
  2026-10-13 (Norwegian missing from "Install Locale" on all three
  apps).
