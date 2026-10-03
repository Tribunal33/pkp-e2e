# In a narrow window the public header's menu button is named "Open Menu" in every language

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#4992` for `pkp/pkp-lib#4684` · [3e642aa456](https://github.com/pkp/pkp-lib/commit/3e642aa456841ba8132546ddee3d6bdacdd2800d) · 2019-07-16 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

In a narrow browser window, as on a phone, the public header's menus
fold behind a button drawn as three lines. That button's name, the
words a screen reader speaks for it, is "Open Menu" in every interface
language, French included. On the same French page the search link
reads "Rechercher", and the skip links and the menu entries are in
French too.

The button still opens and closes the menus. A screen-reader user
reading the site in another language hears one English button among
translated controls, at the top of the page.

It shows on the journal's, press's, server's and site's pages in the
default theme and in any theme that keeps the default header, whenever the
window is narrow enough to fold the menus.

## Impact

- **Lost.** Nothing.
- **Who.** Screen-reader users and voice-control users (who say a
  button's name to press it) reading a non-English interface on a phone
  or in a narrow window.
- **Way round.** A screen-reader user meets the button at the top of
  the page, right after the skip links, and pressing it shows the menus
  in their own language, so its job is clear whatever its name. A
  voice-control user can say the English name, "Open Menu", or ask for
  the numbered overlay (iOS and macOS Voice Control, Windows Voice
  Access) and say the button's number.

Low: the task gets done and only a label is wrong. The team may rate
every control whose name is not in the page's language (WCAG 3.1.2
Language of Parts) as medium; under that rule this one would be medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`, which offers English and French (Canada). No
  sign-in is needed.

Steps:

1. Open the home page in French: `/index.php/publicknowledge/fr_CA`.
2. Make the browser window narrow, about 375 pixels wide, as on a
   phone. The header's menus fold away and a button with three lines
   appears at the top left.
3. Read the button's name: with VoiceOver or NVDA on, move to it (it
   follows the skip links), or select it in the browser's developer
   tools, "Accessibility" pane.
4. Press the button. The menus open under the header.

**Expected.** The button's name is in French, as the rest of the
header is.

**Observed.** The button is named "Open Menu" before and after the
press. Its text is moved off screen and the three lines are drawn in its
place, so only assistive technology, such as a screen reader, reads it. The header around it, in the browser's accessibility
tree (OJS, abridged; OMP and OPS read the same apart from their menu
entries and skip links):

```
- banner:
  - navigation "Aller directement aux liens de contenu":
    - link "Aller directement au contenu principal"
    - link "Aller directement au menu principal"
    - link "Aller directement au numéro courant"
    - link "Aller au pied de page"
  - button "Open Menu"
  - heading "Journal de la connaissance du public" [level=1]
  - navigation "Navigation dans le site":
    - link "Numéro courant"
    - link "Archives"
    - link "À propos"
    - link "Rechercher"
    - link "S'inscrire"
    - link "Se connecter"
```

## Cause

The button's text is written into the template as English text rather
than taken from the locale files. In
`lib/pkp/templates/frontend/components/header.tpl`, line 38 on `main`:

```smarty
					<button class="pkp_site_nav_toggle">
						<span>Open Menu</span>
					</button>
```

Every other text in the header goes through `{translate}`: the `nav`
beside it is labelled with `common.navigation.site`, "Search" is
`common.search`, the skip links are `navigation.skip.*`. The default
theme's stylesheet (`plugins/themes/default/styles/components/nav-toggle.less`)
moves the span's text out of sight (`text-indent: -9999px`) and draws
the three lines in its place, so the text serves only as the button's
accessible name.

The text came with the mobile menu itself: 3e642aa456 (`pkp/pkp-lib#4684`,
"HTML adjustments for default theme mobile nav menu") gave the
previously empty toggle button the literal "Open Menu". It has not
changed since; ae6e6a3374 only renamed the button's class.

Reach:

- The pages that use the theme's header: the journal's, press's or
  server's public pages and the site's own pages, in the default theme
  and in any theme that keeps the default `header.tpl`. None of the three apps
  overrides the template (checked in the code on `main` and the three
  stable branches). Walked on the French home pages. The PDF viewer of
  the PDF.js plugin (`plugins/generic/pdfJsViewer/templates/display.tpl`
  in each app) has a header of its own, without this button.
- Other themes, checked in their `main` branches on GitHub: Health
  Sciences, Bootstrap 3 and Classic have headers of their own with a
  translated toggle. Pragma and Immersion have headers of their own
  whose toggle has the same fault in another form, a hard-coded
  `aria-label="Menu"`; this fix does not reach them. Manuscript and
  other themes not checked.
- Other English text written into the public templates: a search of
  the frontend templates of pkp-lib and the three apps found one other,
  the reCAPTCHA field's "Recaptcha response" label in `userLogin.tpl`
  and `userRegister.tpl`, which is hidden from every reader
  (`display:none` and `hidden`), so it reaches no one.

## Proposed fix

Name the button with the key the header already uses for the menus it
opens. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-menu-button-always-english/fix.diff),
one line in pkp-lib that covers the three apps.

```diff
 					<button class="pkp_site_nav_toggle">
-						<span>Open Menu</span>
+						<span>{translate key="common.navigation.site"}</span>
 					</button>
```

`common.navigation.site` ("Site Navigation", "Navigation dans le
site") labels the `nav` element this button shows and hides, further down
the same template. It is translated in 54 of the 71
languages pkp-lib ships, so the button is named in most languages at
once, with no new string. Naming a menu button after what it controls
is also what a toggle needs once it reports its state: "Site
Navigation, collapsed" reads right both ways, where "Open Menu" is
wrong while the menu is open.

Tried on `main`, OJS, OMP and OPS: the French home page's button reads
"Navigation dans le site" before and after the press, and the English
one "Site Navigation". The button still opens the menus in both
languages, stays hidden in a wide window, and its text stays out of
sight; with the fix out, both languages read "Open Menu" again.

The fix has a cost in the 17 of pkp-lib's 71 languages that have no
translation of `common.navigation.site` (10 of them have no
`common.po` at all): there the button's name turns from "Open Menu"
into the raw key `##common.navigation.site##`. It is still the better
choice. In each of those 17 languages the header already reads that
same raw key as the label of the menus beside the button, and raw keys
for the skip links too (checked in their `common.po` files), so the button
joins a header that is untranslated there anyway, and one translation
fixes both. A new key instead (first alternative) would put a raw key
on the button in every language but the ones it ships with.

**Alternatives**

- A new key that keeps the English "Open Menu" (such as
  `common.navigation.openMenu`): also tried, with a French string
  added, and the French button read "Ouvrir le menu". But pkp-lib's
  `Locale::translate()` does not fall back to English, so every
  language without the new string, nearly all of them at first, would
  name the button `##common.navigation.openMenu##` until translators
  add it.
- An `aria-label` on the button instead of the hidden span: it changes
  how the name is attached, not which string it is, and the span is
  what the stylesheet already hides behind the icon.

**What goes with it**

- `pkp/pkp-lib#12694` (open) asks for the same button to report
  whether the menus are open (`aria-expanded`), a separate fault in the
  default theme's `js/main.js` of each app. The name proposed here is
  the one that fix needs.
- Backport: the diff applies as it stands to `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, where the line reads the same (dry
  run), and the key exists there with its French string.
- Guard: a Planned item in spec U08 (Rule 15b) that reads the button's
  name on a French page in a narrow window.

Small: one line in one shared template, using a key that is already
translated, tried on all three apps, with no stored data involved.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-menu-button-always-english/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/open-menu-button-always-english/walk.js`.
  It records the page's language, the skip links, "Search", the
  button's accessible name (Playwright's aria snapshot), its
  `aria-expanded`, where its text sits on screen and whether the menus
  open; `neighbour` as its argument runs the fix's neighbour checks.
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/open-menu-button-always-english/fix.diff ojs omp ops`,
  then walk.js and walk.js `neighbour`. The new-key alternative
  (a template line and `common.navigation.openMenu` in pkp-lib's `en`
  and `fr_CA` `common.po`) was tried the same way.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each): "Open Menu" on the three apps' French
    home pages, from the same template line.
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f,
  OPS at acd8ae704b, pkp-lib 9e41f10273: `header.tpl` line 38 holds the
  same literal, and no app overrides the template.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836,
  OPS at c5532e2161, pkp-lib ac3fa73402: the same line 38, and 3e642aa456
  is on the branch.
- Introduced: `git blame` on line 38 gives 3e642aa456 (2019-07-16), and
  `git log -S'Open Menu'` on the template finds no other commit. The commit belongs to `pkp/pkp-lib#4992`, "Add mobile nav menu to
  default theme" (merged 2019-10-28).
- Not driven: interface languages other than French; a real screen
  reader or voice-control tool (the name was read from the browser's
  accessibility tree, and the numbered overlay is the tools' general
  feature, not tried on this button); the site's own pages, which
  render the same template.
- Upstream search 2026-10-03, pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by "Open Menu" and the button's class among
  others. `pkp/pkp-lib#12694` (open) is about the same button's
  touch handling and missing state, not its language;
  `pkp/ojs#5887` (open, for `pkp/pkp-lib#12654`) changes the menus'
  dropdown toggles, not this button; `pkp/pkp-lib#4922` (closed
  without merging) is an earlier PR for the mobile menu.
