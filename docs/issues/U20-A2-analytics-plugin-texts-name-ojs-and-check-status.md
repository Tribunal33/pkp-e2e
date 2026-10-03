# "Google Analytics Plugin" tells a press and a preprint server it integrates OJS, and points every manager to a "Check Status" function that does not exist

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS (the window's sentence only), OMP, OPS
  - 3.5: OJS (the window's sentence only), OMP, OPS
  - 3.4: OJS (the window's sentence only), OMP, OPS (code)
  - 3.3: OJS (the window's sentence only), OMP, OPS (code)
- **Introduced** `pkp/googleAnalytics` [a3b3527ee0](https://github.com/pkp/googleAnalytics/commit/a3b3527ee065ea21495b1095a497aaa18c61a93f), committed without a PR, for `pkp/pkp-lib#1525` · 2016-06-29 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press and a preprint server, the description of "Google Analytics
Plugin" in the Plugins list reads "Integrate OJS with Google Analytics,
…", naming the journal software.

On all three apps, the plugin's "Settings" window warns that "the 'Check
Status' function may not accurately report whether it has detected the
required tracking code". No screen of the app has such a function. The
sentence was written for OJS 2 in 2008, about a link in Google
Analytics' own interface of that time, and carried into the shared
plugin in 2016.

The plugin ships with all three apps and is listed under "Generic
Plugins" on every install, disabled by default, so every manager who
sets it up reads both texts. Most translations repeat them: 33 of the
38 name OJS in the description.

## Impact

- **Lost.** Nothing: the plugin works. The press or server manager
  reads the wrong application's name, and every manager looks for a
  function they cannot find.
- **Who.** A manager who reads the Plugins list or opens the plugin's
  "Settings" window, once, while setting up Google Analytics.
- **Way round.** None needed: the "Account number" box works as it
  should.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`. "Google Analytics Plugin" is disabled there.

Steps:

1. Sign in as `rvaca` (the journal's, press's or server's manager).
2. Open Settings › Website, tab "Plugins", "Installed Plugins"
   (`/index.php/publicknowledge/en/management/settings/website`).
3. Under "Generic Plugins", read the description beside "Google
   Analytics Plugin".
4. Tick "Google Analytics Plugin". "The plugin "Google Analytics
   Plugin" has been enabled." shows.
5. Press the arrow beside the plugin's row, then "Settings". The
   window "Google Analytics Plugin" opens.
6. Read the two paragraphs above "Account number".

**Expected.** In step 3, a press and a preprint server get a
description that names no other application. In step 6, no sentence
speaks of a function the window does not have.

**Observed.** Step 3, on all three apps:

```
Google Analytics Plugin
Integrate OJS with Google Analytics, Google's web site traffic analysis application. Requires that you have already setup a Google Analytics account. Please see the Google Analytics site for more information.
```

Step 6, on all three apps, the second paragraph:

```
Please note that Google Analytics may require up to 24 hours before statistics are collected and reported. During this period, the 'Check Status' function may not accurately report whether it has detected the required tracking code.
```

On a journal, the description's "OJS" is correct.

## Cause

Both sentences are the English texts of the shared plugin
`pkp/googleAnalytics`, which OJS, OMP and OPS all ship as the submodule
`plugins/generic/googleAnalytics`, at the same commit. The file is
`locale/en/locale.po`:

- `plugins.generic.googleAnalytics.description` (lines 21–26), which
  `GoogleAnalyticsPlugin::getDescription()` returns for the Plugins
  list, starts "Integrate OJS with Google Analytics".
- `plugins.generic.googleAnalytics.manager.settings.description`
  (lines 28–38), which `templates/settingsForm.tpl` prints at the top
  of the window, ends with the "'Check Status' function" sentence.

Both texts come from the OJS 2 plugin, which was written for journals
only. Its 2007 instructions told the manager: "Within Google Analytics,
click on Check Status to view the tracking code for your site"
(`pkp/ojs` c95a243c6c). The 24-hour sentence followed in 2008, when
Google Analytics' own interface had that link (`pkp/ojs` c5067d04b0,
"Update Google Analytics tracking code"). The plugin's code never
offered a "Check Status" action.

In 2016 the plugin was rewritten as a separate repository, shared by
OMP 1.2+ and OJS 3.0+ (its README says so). That rewrite, a3b3527ee0,
for `pkp/pkp-lib#1525` ("Google Analytics plugin"), carried both texts
over. The next commit the same day, 5082e9ea6c ("Remove
journal-specific language from general plugin"), took "for this
journal" out of the window's text. It left the description's "OJS" and
the "Check Status" sentence. OPS later shipped the same plugin.

The code on `main` shows how far this reaches:

- These are the only two texts concerned. No other plugin's English
  texts in OMP or OPS name OJS (`plugins/*/*/locale/en/locale.po`), and
  no app or pkp-lib text mentions "Check Status".
- Translations: 33 of the plugin's 38 translations name OJS in the
  description. French (Canada) was walked: "Intégrer OJS à Google
  Analytics, …" in the list, and the window speaks of "la fonction
  « Vérifier l'état »".
- Dead texts that nothing shows: three
  `plugins.generic.googleAnalytics.authorAccount*` texts in English and
  the translations (per-author account numbers, from OJS 2), and
  `plugins.generic.googleAnalytics.manager.settings.googleAnalyticsSiteIdInstructions`
  in 16 translations (not in English), which still holds the 2007 "click
  on Check Status" instructions. No code or template reads either.

## Proposed fix

Reword the two English texts in `pkp/googleAnalytics`. The description
says what the plugin does, in the style of the other shared plugins
("This plugin enables indexing of published content in Google
Scholar."). The window keeps its 24-hour sentence, which tells the
manager not to expect figures at once, and loses only the clause about
the missing function. Then bump the submodule in the three apps. This
is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/fix.diff),
written against the app root. In a clone of `pkp/googleAnalytics`,
where the file is `locale/en/locale.po`, it applies with `git apply -p4`.

```diff
 msgid "plugins.generic.googleAnalytics.description"
 msgstr ""
-"Integrate OJS with Google Analytics, Google's web site traffic analysis "
-"application. Requires that you have already setup a Google Analytics "
+"This plugin adds Google Analytics tracking to the public pages, so that "
+"their visits are reported to Google Analytics, Google's web site traffic "
+"analysis application. Requires that you have already setup a Google Analytics "
 "account. Please see the <a href=\"https://www.google.com/analytics/\" title="
@@
 "<p>Please note that Google Analytics may require up to 24 hours before "
-"statistics are collected and reported. During this period, the 'Check "
-"Status' function may not accurately report whether it has detected the "
-"required tracking code.</p>"
+"statistics are collected and reported.</p>"
```

"The public pages" is what the plugin covers: it adds its script
through `TemplateManager::addJavaScript()`, whose default context is
`frontend`, so the editorial pages carry none.

Tried on `main`, all three apps: steps 3 and 6 show the new texts, with
no "OJS" and no "Check Status". A control check with the fix in and out
showed the French (Canada) description and window, the English row name
and the "Account number" label unchanged.

**Alternatives**

- Insert the application's name into the description (a `{$app}`
  parameter): no other shared plugin names its application, and an
  app-neutral sentence needs no code change.
- Rewrite the 24-hour sentence for today's Google Analytics: that
  needs a check against Google's current interface, and the fix does
  not depend on it.

**What goes with it**

- Translations: the message keys stay, so each language keeps its old
  text until it is translated again on Weblate.
- Optional, same files: drop the unused `authorAccount*` and
  `googleAnalyticsSiteIdInstructions` texts.
- Backport: `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` of the
  plugin hold the same two texts. The diff applies to 3.5 and 3.4 as it
  stands. 3.3 keeps them in `locale/en_US/locale.po`, each on one line,
  so the change there is the same but written by hand.
- Guard: a Planned item in spec U20, scenario 8, reading the
  description on a press and a preprint server and the window's
  paragraphs.

Small: two texts in one locale file of the shared plugin, plus the
usual submodule bump in the three apps; tried on all three.

## Evidence

- The Steps as a Playwright script, run on installs loaded from PKP's
  default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/walk.js),
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/walk.js`.
  The control check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/neighbour.js)
  beside it.
- The fix, tried 2026-10-03 on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/analytics-plugin-texts-name-ojs-and-check-status/fix.diff ojs omp ops`.
  `git apply --check` passed on the 3.4 plugin's `locale/en/locale.po`
  (1903a57390), and with `-p4` on the `main` plugin file.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7; the plugin
    at [48b24c26f2](https://github.com/pkp/googleAnalytics/commit/48b24c26f282ec20d4e5433c77deff4eef840691)
    in each (the tip of its `main`).
  - stable-3_5_0: OJS c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3; the
    plugin at [436a57d45e](https://github.com/pkp/googleAnalytics/commit/436a57d45e6ead8c47e5b7be9bf21d9389a2e797)
    in each (the tip of its `stable-3_5_0`), with the same English file
    as `main`'s.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441f, OPS
  at acd8ae704b, each pointing at the plugin's
  [1903a57390](https://github.com/pkp/googleAnalytics/commit/1903a57390e0c5899085e81e502fa2b101a5d6ac);
  read its `locale/en/locale.po` (both texts as on `main`),
  `templates/settingsForm.tpl` and `GoogleAnalyticsPlugin.php`
  (`getDescription()`).
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, each pointing at the plugin's
  [a21d94f1bf](https://github.com/pkp/googleAnalytics/commit/a21d94f1bff6173b9b7411f8f675e28e52cc1ee3);
  read its `locale/en_US/locale.po` (both texts as on `main`) and
  `templates/settingsForm.tpl`.
- Introduced: `git blame` on both lines reaches 147db706 (a 2022
  Weblate update that only reflowed the text and made its links https);
  `git log -S` finds the texts first in a3b3527ee0, and in `pkp/ojs`
  before that (c95a243c6c, 2007; c5067d04b0, 2008). The GitHub API
  names no PR for a3b3527ee0 or 5082e9ea6c.
- Not driven: the translations other than French (Canada), and the Site
  Administrator's way to the same window through the Settings Wizard.
  Google Analytics' current interface was not checked for a function of
  that name.
- Upstream search 2026-10-03, in pkp/pkp-lib, pkp/googleAnalytics,
  pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library ("Google Analytics",
  "Check Status", "Integrate OJS", description): nothing about these
  texts.
