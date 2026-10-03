---
name: search
status: verified
---

# Search

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Search is how a reader who does not know where an article lives finds it:
by a word from its title, its abstract or an author's name (the text of
the article's own files is not searched, Rule 3). The reader types
words into the Search page (reached from the "Search" link in the header
of every reader-facing page inside a journal), presses "Search", and gets a list of published
articles that match, each linking to its landing page, with the option to
narrow by publication date and to page through long lists. Behind the page
sits the **search index**: the site's own copy of the searchable text of
every published article, refreshed in the background when an article is
published or unpublished and rebuildable from the command line. This spec
owns the Search page and its forms in the three applications (a press's
is a different page with its own wording, [OMP2](#omp2)), the results
list, the refinements, the paging, the site-wide search across journals,
the index and what keeps it current, and the search box on a preprint
server's home and archive pages. It does not cover the editorial
dashboard's "Search submissions" box, which finds submissions in the
workflow rather than published content (see
[Submissions dashboard](U23-submissions-dashboard.md#search)); browsing
published content by category (*Categories*), by section or series
(*Sections*) or through a press's catalog (*Catalog browse*); or the
"Search engine indexing" settings that shape what outside search engines
see (*Search-engine metadata & analytics*).

## Actors & permissions

Search is a public reader surface. A **visitor** is anyone using the site
without signing in; a signed-in user of any role searches exactly as a
visitor does and gets the same results (Rule 15). "The Search page" is the
page headed "Search" inside a journal; "the site-wide Search page" is the
same page opened at the site level, outside any journal, on a site that
hosts several journals (Rule 10). A journal "publishes online" unless its
Distribution settings say otherwise (Rule 13). <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the Search page** | • Any visitor, and any signed-in user, while the journal publishes online<br>• On a journal that does not publish online {OJS}: a signed-in Site Administrator, Journal Manager, Journal Editor, Production Editor, Section Editor, Guest Editor, Subscription Manager, or a holder of an assistant-level role (Copyeditor, Layout Editor, Proofreader, Designer, Indexer, Funding Coordinator, Marketing and Sales Coordinator, Editorial Board Member) gets the page. A signed-in Reader, Author, Translator or Reviewer gets the sentence of Rule 13 instead. A visitor is sent to the Login page [OJS3](#ojs3)<br>• A press has no such gate. A preprint server's gate cannot be reached from its settings screen [OPS2](#ops2) (Rule 13) <sup>l</sup> |
| **Open the site-wide Search page** | • Any visitor, by typing its address (Rule 10 gives its form); no link on the site's pages leads there <sup>i</sup> |
| **Search, refine by date, page through results** | • Anyone who can open the page. There is nothing to sign in for and nothing a role adds <sup>a</sup> |
| **See an article that is not published in the results** | • Nobody, whatever their role: the results hold only articles that have a published version, and a decline alone does not unpublish (Rule 2) <sup>c</sup> |
| **Open a found article** | • Anyone, on an open-access article. On a journal whose content is behind subscriptions, the result is listed for everyone and the article page itself decides what the reader may open (Rule 16). On a press or server, a declined article's result opens "404 Not Found" for a visitor (Rule 2, [OMP3](#omp3) [OPS4](#ops4)) <sup>f</sup> |
| **Rebuild the search index** | • The site's system administrator, from the command line on the server, with the tool named in the Reference table at the end of this spec; no screen offers it (Side effects) <sup>o</sup> |
| **Change what search covers and how it runs** | • The system administrator, in the configuration file (Settings that modify behavior). The Journal Manager sets the results-per-page count and the publishing mode on the journal's own settings screens, described in their owning features (Settings that modify behavior) <sup>n</sup> |

## Fields & validation

Nothing on the Search page is required and nothing is validated: any text,
or none, is accepted, and a date filter is simply applied or not (Rule 9).
The form works with the page's address, so a search can be bookmarked and
shared. <sup>b</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Search box** (hidden label "Search articles for", "Search preprints for" on a server, heard through a screen reader or seen in the browser's accessibility inspector, not on screen; the box shows the placeholder "Search") | No | The words to look for. Left empty, or holding only spaces, the page behaves as Rule 5 says. Reloaded with results, the box still holds the words searched. |
| **Advanced filters › Published After** (three selects labelled "Year", "Month", "Day", each starting blank) | No | Keeps only articles published on or after the chosen day (Rule 9). The Year list runs from the earliest to the latest publication date entered on any of the journal's articles, published or not ⚠ [A15](#a15). All three parts must be chosen: a Year with one or no other part is ignored, and the selects then show a date the reader did not choose ⚠ [A1](#a1); a Month or Day without a Year is ignored and the selects go blank. The Day list offers 1 to 31 for every month; a day the month does not have is applied as the following month's date ⚠ [A14](#a14). {OJS OPS} |
| **Advanced filters › Published Before** (the same three selects) | No | Keeps only articles published before the chosen day; the chosen day itself is left out ⚠ [A2](#a2). Same Year list ⚠ [A15](#a15), same all-three-parts rule ⚠ [A1](#a1) and same handling of an impossible day ⚠ [A14](#a14). {OJS OPS} |
| **Advanced filters › By Journal** (a select, first entry blank) | No | On the site-wide Search page of a journal site only (Rule 10): limits the results to one journal, but only on the first page of results, and the select shows blank again after every search [OJS2](#ojs2). Inside a journal the select is absent, and a press or preprint server site never shows one ⚠ [A10](#a10). {OJS} |
| **"Search"** button | — | Runs the search with the box and filters as they stand. |
| Press: **search box** (read out as "Search Query" by a screen reader) and **"Search"** button, at the foot of the Search page | No | The press's Search page carries only these two controls, under the results, and no Advanced filters [OMP2](#omp2). |
| Preprint server: **search box** (read out as "Search Query" by a screen reader) and **"Search"** button in the archive header | No | On the server's home page and its Preprints page (Rule 17). Submitting it opens the Search page with the results for the typed words. {OPS} |

## Rules & state

1. **Where the Search page lives.** Every reader-facing page inside a
   journal (the home page, About, Login, Register, the archive or catalog,
   an article's landing page, Contact, Submissions) carries a "Search" link
   in its header, beside the navigation menu. The link is absent on the
   Search page itself and on the site's own pages outside any journal, and
   the Dashboard, My Submissions and the reviewer dashboard have their own
   header without it.
   The link opens the Search page: breadcrumb and heading "Search",
   the search box, the Advanced filters (on a journal or server) and the
   "Search" button, with the results below. The header link belongs to the
   site chrome (*Navigation menus & site chrome*); this spec owns the page it
   opens. <sup>a</sup>
2. **Only published articles are found.** An article is in the results only
   while it has a published version (the one its landing page shows; Rule
   12 for what happens when a newer version is unpublished). A submission still in the
   workflow, a version scheduled for a future issue, an unpublished article
   and a deleted one are never listed, for any user (Actors & permissions).
   A decline alone does not unpublish: a published article that is returned
   to the workflow and then declined keeps its published version and stays
   in the results on every application. On a journal its title still opens
   the landing page; on a press or a preprint server a visitor who presses
   the title gets the page "404 Not Found" instead, so the result is a dead
   link for readers ⚠ [OMP3](#omp3) ⚠ [OPS4](#ops4). The decline itself is
   described in [Submission stage](U25-submission-stage.md). <sup>c</sup>
3. **What text is searched.** The words are looked for in the article's
   title (with its prefix and subtitle), its abstract and the names of its
   contributors. The text of the article's galleys is not searched: the
   site is built to read plain-text and HTML galleys (and PDF, PostScript
   and Word galleys through a converter the system administrator
   configures, Settings that modify behavior), but as built no galley text
   reaches the index, so a word that appears only in a galley finds nothing
   ⚠ [A11](#a11). Every language the article carries metadata in is
   searched, whatever language the site is being read in. Keywords,
   subjects, section names and funders are not searched by the box (but
   see Rule 14). <sup>c</sup>
4. **How words match.** Matching is on words, not fragments: "publi" does
   not find "Publications" and "quarterl" does not find "quarterly". A word
   does find its regular other forms: "public", "publication" and
   "publications" find each other, as do "study", "studies" and "studied",
   and "note" and "notes"; an irregular form does not: "child" does not
   find "Children". Very common words ("the", "of", "and", "or") are
   dropped: typed alone they find nothing, although every title holds them,
   and typed beside another word they change nothing. Capitalisation does
   not matter. There is no phrase search, no wildcard and no AND/OR/NOT
   syntax: "AND" or "OR" typed between two words changes nothing (they are
   common words, dropped like any other). Quotation marks, commas, full
   stops, brackets, "!", "&" and an apostrophe-s are ignored, but a hyphen
   is not: a hyphenated pair such as "harbour-children" finds nothing even
   when both words are in the title, so type the words with a space.
   How several words combine depends on the
   database the site runs on: on a PostgreSQL site every typed word must be
   found (in any of the searched texts of the same article), on a MySQL or
   MariaDB site an article matching any of the words is listed
   ⚠ [A5](#a5). The test installs run on PostgreSQL, so on them every
   typed word must be found. <sup>d</sup>
5. **The bare Search page.** Opening the Search page, or pressing "Search"
   with the box empty (or holding only spaces) and no filter set, lists every published article of
   the journal, paged like any result list, on a journal or a preprint
   server; a press shows only the search box, with no count and no notice
   ⚠ [A6](#a6). With the box empty but a date filter set, a journal or
   server lists every published article in that date range. <sup>e</sup>
6. **What a result shows.** Each result is the article's summary as the
   journal's listings show it, without galley links: the title (with
   subtitle), the contributors, the published date, and where the journal
   shows them, the cover image and the article's page numbers; on a server
   the date line opens
   with the download count. The title opens the article's landing page
   (*Article landing page & reading*; on a press the catalog's book page,
   *Monograph landing page*). On the site-wide page of a journal site the
   journal's name appears under each title; a press or server site shows
   no such name (Rule 10). On a press the results are book summaries two to
   a row, each with its cover, title, contributors and date [OMP2](#omp2).
   <sup>f</sup>
7. **Counts and the empty result.** Above the results, a journal or server
   carries a status line that only a screen reader (or the browser's
   accessibility inspector) shows: "Found one item." when one
   article was found; with more than one, a journal reads out a raw code
   instead of the count ⚠ [OJS1](#ojs1) and a server still says "Found one
   item." ⚠ [OPS1](#ops1). Under the results sits the visible line "{from}
   - {to} of {total} items", whatever the count. When
   nothing matches, a notice reads "No Results". A press instead shows a
   visible "{N} Titles" count and the line "{N} titles were found which
   matched your search for "{words}"." (or "One title was found which
   matched your search for "{words}"."), each followed by a "Search again"
   link that jumps to the search box at the foot of the page; when nothing
   matches, "No titles were found which matched your search for "{words}"."
   with the same link [OMP2](#omp2). <sup>g</sup>
8. **Paging.** Results come 25 to a page, or whatever the journal's "Items
   per page" setting says (Settings that modify behavior). Under the list
   sit "{from} - {to} of {total} items" and the page links: "<<" and "<" to
   go back, the page numbers, ">" and ">>" to go forward; the current
   page's number is plain text among them. Moving between pages keeps the
   searched words, the date filters and the sort (Rule 14); the box and
   the filters show them still. The site-wide page's journal choice is not
   kept (Rule 10). Page links appear only when there is more than one page.
   A bookmarked or shared address whose page number is beyond the last
   page shows "No Results" with the searched words kept; one whose page
   number is not a number gives a completely empty page instead: no
   heading, no search form, no message of any kind ⚠ [A13](#a13).
   <sup>g</sup>
9. **The date filters** {OJS OPS}. "Published After" keeps articles
   published on the chosen day or later; "Published Before" keeps articles
   published strictly before the chosen day ⚠ [A2](#a2). Both go by the
   article's published date as shown in its summary. A filter counts only
   when its Year, Month and Day are all chosen. A Year with one or no other
   part is ignored, and after the search the selects show a date the reader
   did not choose ⚠ [A1](#a1); a Month, a Day or both without a Year are
   ignored and the selects go blank. The Day list offers 1 to 31 whatever
   the month; a day the month does not have is applied, and shown, as the
   following month's date: 31 September becomes 1 October ⚠ [A14](#a14). The
   Year lists run from the earliest to the latest publication date entered
   on any of the journal's articles, whether or not that article is
   published: an unpublished article backdated to an earlier year widens
   the lists ⚠ [A15](#a15). On a journal where no publication date has ever
   been entered, the lists offer only blank entries and the page still
   opens, reading "No Results". A press has no date filters [OMP2](#omp2).
   <sup>h</sup>
10. **Site-wide search.** On a site that hosts several journals, the Search
    page opened at the site level searches every enabled journal at once;
    whether a journal's own configuration should govern whether its content
    appears there is an open question ⚠ [A16](#a16). Each result opens in
    its own journal. On a journal site each result
    carries its journal's name under the title, and the Advanced filters
    gain a "By Journal" select listing the enabled journals; choosing one
    limits the results to it, but only for the first page: the page links
    drop the choice and list every journal again, and the select shows
    blank after every search, so the reader cannot tell it was applied
    ⚠ [OJS2](#ojs2). A press or preprint server site has the site-wide page
    too, but no such select and no press or server name under the results,
    so results from different presses cannot be told apart ⚠ [A10](#a10).
    Nothing links to the site-wide page: the header's
    "Search" link exists only inside a journal (Rule 1), so the page is
    reached by typing its address: the site's own address followed by
    /index.php/index/search, with no journal's path in between (for
    example https://example.org/index.php/index/search). Type it in full
    rather than extending the address the browser shows once the site's
    home page has opened, which ends in a language code (such as
    /index.php/index/en): adding /index/search after that gives a
    page-not-found error. <sup>i</sup>
11. **Order of results.** Results are not ranked by relevance and are not
    sorted by date or title; they come in the order the database happens
    to return them, which is neither newest-first nor alphabetical,
    though it is the same each time the same search is repeated
    ⚠ [A4](#a4). A sort by title or by published date can be asked for
    only through the page's address (Rule 14). <sup>j</sup>
12. **The index stays current, mostly.** Publishing an article (or a new
    version of it) queues a background refresh of its entry; the article
    becomes findable once that refresh has run: on a live site within
    moments, on a test install only after the site's background jobs have
    been run (the scenarios' footnote says how). Unpublishing an article removes it from the results at
    once; so does unpublishing the issue that holds it {OJS}, and so does
    deleting it (a published article is deleted only after being returned
    to the workflow and declined, [Submission stage](U25-submission-stage.md#delete)).
    Publishing an issue again {OJS} lists its articles only once the
    background job has run, like publishing an article. When an article
    has an older published version, unpublishing the newest version
    removes the article from the results at once, but the older version
    stays public on the landing page and, once the background job has run,
    the article is listed again under that version's title; the words of
    the unpublished newer version still find it ⚠ [A7](#a7).
    Changes made to an already-published article without republishing it
    (a corrected title or abstract, an added contributor, a changed
    published date) do not reach the index: the result shows the new title,
    contributors and date at once, but search keeps finding the old words and not the
    new ones until the article is unpublished and published again, a new
    version is published, or the administrator rebuilds the index
    ⚠ [A3](#a3). When an article has several versions, the words of every
    version, superseded ones included, find it ⚠ [A7](#a7). <sup>k</sup>
13. **A journal that does not publish online** {OJS}. When the journal's
    Distribution settings set the publishing mode to "OJS will not be used
    to publish the journal's contents online.", the Search page is gated. A
    visitor who opens it is sent to the Login page, with no word about why
    ⚠ [OJS3](#ojs3). A signed-in Reader, Author, Translator or Reviewer
    gets, instead of the page, the sentence "This journal does not publish
    its content online." The roles listed in Actors & permissions still get the page.
    The header's "Search" link is shown regardless. A press has no
    publishing mode and no such gate. A preprint server is built with the
    same gate for its posting mode "OPS will not be used to post the
    server's contents online.", but that choice cannot be stored from the
    server's settings screen, so the gate is never met ⚠ [OPS2](#ops2).
    <sup>l</sup>
14. **Refinements no control offers.** The page also honours refinements
    typed into its address that no control on the page offers: words to
    find in the title only, in the abstract only, in the contributors'
    names only, or in the galley text only; a keyword, a subject, a
    section, a category or a funder to match exactly; the name of a
    reviewer whose review of the article was open (not anonymous); and a
    sort by title, ascending or descending ⚠ [A8](#a8). The sort by
    published date the page is built to accept answers an error page
    instead of the results ⚠ [A12](#a12). Paging keeps
    the sort but drops the other address-only refinements. On a press an
    empty search box means the bare page (Rule 5), whatever refinements the
    address carries. These are documented here because a bookmarked or
    shared address can carry them; a reader working the page never meets
    them, and no scenario exercises them. <sup>m</sup>
15. **Signing in changes nothing.** A signed-in user, whatever their roles,
    sees the same Search page and the same results as a visitor: no extra
    filter, no unpublished content (Rule 2), no personal history. The only
    role-dependent behavior is the gate of Rule 13. <sup>a</sup>
16. **What a found article opens** {OJS}. On a journal that restricts
    content to subscribers, articles in restricted issues are listed like
    any other, with no lock or note in the result. Whether the reader may
    open the article is decided on the article page by the subscription
    rules (*Subscriptions & open access control*). <sup>f</sup>
17. **The archive header's search box** {OPS}. A preprint server's home
    page and its Preprints page open with an archive header: a search box
    and "Search" button on the left, the top-level category links on the
    right (the category links belong to *Sections*, which owns those two
    pages). The box is always empty when the page opens. Submitting it
    opens the Search page with the typed words in the box and their
    results below. The box is built to hide while the server's posting mode
    says it will not post online, a state the settings screen cannot store
    (Rule 13, [OPS2](#ops2)). <sup>p</sup>

## Side effects

- Searching writes nothing: no log entry, no notification, no email, and
  no record of what was searched. <sup>a</sup>
- Publishing or unpublishing a version of an article clears the article's
  index entry at once and queues a background job that rebuilds the entry
  from every version of the article: titles, abstracts and contributor
  names, per language (galley text is meant to join them and never does,
  [A11](#a11)). Until the job has run the article is absent from the
  results; when an older version of it is still published, the article
  comes back under that version once the job has run (Rule 12). The
  publishing flow itself is owned by
  [Publish, schedule & versions](U49-publish-schedule-and-versions.md).
  <sup>k</sup>
- Unpublishing an issue removes its articles from the results at once,
  and their landing pages answer a page-not-found error {OJS}; publishing
  the issue again lists them only once the background job has run (Rule
  12). The issue flow belongs to *Issues*. <sup>k</sup>
- Deleting a submission drops its index entries with it at once; nothing
  is queued. No screen deletes a single version of an article, and no
  screen deletes a published article directly: it is returned to the
  workflow, declined and then deleted
  ([Submission stage](U25-submission-stage.md#delete)). <sup>k</sup>
- Installing or upgrading the site rebuilds the whole index. The system
  administrator can rebuild it at any time from the command line (the tool
  is named in the Reference table at the end of this spec), for the
  whole site or for one journal named by its path; on a press or preprint
  server the path is accepted but ignored and the whole site is rebuilt
  ⚠ [OMP1](#omp1) ⚠ [OPS3](#ops3). A rebuild first empties the index, so
  searches return nothing for the articles not yet re-indexed while it
  runs. <sup>o</sup>

## Settings that modify behavior

All search settings are the system administrator's, in the site's
configuration file (config.inc.php), search section; no screen shows them.
<sup>n</sup>

- **The search driver.** The database driver (the default, and what every
  site gets without further setup) keeps the index inside the site's own
  database. The OpenSearch driver hands indexing and querying to an
  OpenSearch server named by the accompanying host, user name, password
  and certificate-check settings; with it, results are ranked by relevance, "Published Before"
  includes the chosen day, and the address-only funder and reviewer
  refinements (Rule 14) accept several values. Everything else in this
  spec describes the database driver, which is what the test installs use.
  <sup>n</sup>
- **The index name** used by an OpenSearch server ("submissions" unless
  changed). <sup>n</sup>
- **Converters for non-text galleys.** One line per file type names a
  program that turns the file into text (the file offers commented examples
  for PDF, PostScript and Word); a line set to an empty value switches off
  even the built-in reading of that type. As built, these lines have no
  reachable effect: no galley text reaches the index whatever they say
  (Rule 3, [A11](#a11)). <sup>n</sup>
- **Two settings with no effect.** "Minimum indexed word length" and "The
  maximum number of search results fetched per keyword" are still listed in
  the file with their explanations, but nothing reads them ⚠ [A9](#a9).
  <sup>n</sup>
- **"Items per page"** on the journal's Settings › Website › Setup › Lists
  screen (a required field, 25 unless changed) sets the results-per-page
  count (Rule 8); the setting belongs to *Appearance & theming*. <sup>g</sup>
- **The publishing mode** on the journal's Distribution settings gates the
  page (Rule 13); the setting belongs to *Subscriptions & open access
  control*. A preprint server's "Posting Mode" on the same screen says
  "Saved" and stores nothing ([OPS2](#ops2)). <sup>l</sup>
- **Requiring sign-in to view the site** (Users & Roles › Site Access
  Options) puts the Search page behind Login like every other reader page;
  that rule is site-wide and not this feature's. <sup>a</sup>

## Cross-feature interactions

- [Submissions dashboard](U23-submissions-dashboard.md#search) owns the
  editorial "Search submissions" box; it searches the workflow, not the
  index, and is unrelated to this page.
- [Publish, schedule & versions](U49-publish-schedule-and-versions.md)
  owns publishing and unpublishing; it keeps one side-effect line ("refreshes
  the search index") and points here for what that means (Rule 12).
- *Navigation menus & site chrome* owns the header's "Search" link
  (Rule 1).
- *Article landing page & reading* and *Monograph landing page* own the
  pages a result opens (Rule 6). *Galleys* owns the files whose text feeds
  the index (Rule 3).
- *Sections* owns the preprint server's home-page archive and Preprints
  pages, whose archive header carries this feature's search box (Rule 17),
  and the section browse pages. *Categories* owns category browse. *Catalog
  browse* owns the press's catalog pages. None of them searches.
- *Subscriptions & open access control* owns the publishing mode (Rule 13),
  the server's "Posting Mode" that does not save ([OPS2](#ops2)), and what
  a subscriber-only article shows when opened (Rule 16).
- [Submission stage](U25-submission-stage.md) owns Decline and Delete
  (Rules 2 and 12); [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#done)
  owns "Return to Workflow", the step before them on a published article.
  *Issues* owns publishing and unpublishing an issue (Rule 12).
- *Appearance & theming* owns "Items per page", on Settings › Website ›
  Setup › Lists (Rule 8).
- [Funding](U43-funding.md) records the funders the address-only funder
  refinement matches (Rule 14).
- *Search-engine metadata & analytics* owns the "Search engine indexing"
  settings tab, which concerns outside search engines, not this index.

## Canonical scenarios

Every scenario runs on a scratch journal holding the published articles it
names, each carrying a made-up word that appears nowhere else on the site;
scenarios 4, 5, 9 and 12 sign in with throwaway accounts on it. The site's
background jobs have run since the articles were published, so the index
holds them (Rule 12): a search that expects a hit is judged only once the
jobs have run. The tooling recipe, the mail catcher's address and how the
jobs are run are in the footnote. <sup>s</sup>

1. **Find an article by a word in its title**

   Given: a visitor, on a scratch journal holding two published articles,
   each with its own made-up word in its title.

   - **The header's "Search" link**: on the journal's home page press
     "Search" in the header: the page "Search" opens with an empty search
     box.
   - **A title word**: type the made-up word from one article's title and
     press "Search": the list holds exactly that article: its title, its
     contributors and its published date, and no galley links.
   - **Under the list**, on a journal or server: the line "1 - 1 of 1
     items" and no page links, the list being a single page (Rules 7, 8);
     a press shows its "1 Titles" count instead (scenario 11).
   - **The status line**, on a journal or server: above the results, a
     line that only a screen reader or the browser's accessibility
     inspector shows reads "Found one item." (Rule 7).
   - **The title**: pressing it opens the article's landing page.
   - **Back**: use the browser's Back button to return to the Search page:
     the box still holds the word.
   - **The mail catcher**: holds no email from the searches (Side effects).
   - **Control**: the other article is absent from the list. <sup>s1</sup>

2. **Abstract and contributor names are searched too**

   Given: a visitor, on a scratch journal holding two published articles,
   each with its own made-up word in its title; the first article is
   titled "The publications of children about {its made-up word}", its
   abstract holds a second made-up word that appears nowhere else, one of
   its contributors has a made-up family name, and its title in French
   carries a made-up word its English title lacks; the second article is
   titled "The {its made-up word} study".

   - **A word in the abstract**: type the first article's abstract word and
     press "Search": exactly that article is listed.
   - **A contributor's family name**: type the made-up family name and
     press "Search": exactly that article is listed.
   - **Capitals**: type the first article's title word all in capitals and
     press "Search": that article is listed.
   - **The French title**: with the site read in English, type the made-up
     word from the first article's French title and press "Search": that
     article is listed (Rule 3).
   - **Whole words**: type "publi" and press "Search": "No Results" (on a
     press, the "No titles were found…" line), although the first article's
     title holds "publications"; type "publication": the first article is
     listed; type "child": "No Results", although its title holds
     "children"; type "children": the first article is listed (Rule 4).
   - **Common words**: type "the" alone and press "Search": "No Results",
     although both titles hold it; type "the", a space and the first
     article's title word: the same one article as the word alone
     (Rule 4).
   - **Punctuation and syntax**: type the first article's title word
     between quotation marks and press "Search": the same one article; type
     the word and "children" with "AND" between them, spaces around it: the
     same one article; type the word and "children" joined by a hyphen, no
     spaces: "No Results", although both words are in the title (Rule 4).
   - **Control**: the second article, which carries none of the searched
     words, is absent from every list. <sup>s2</sup>

3. **Nothing found**

   Given: a visitor, on a scratch journal holding one published article
   with its own made-up word in its title.

   - **A word that appears nowhere**: type a made-up word that appears
     nowhere and press "Search": the list is empty and the page reads "No
     Results" (on a press: "No titles were found which matched your search
     for "{word}"." followed by "Search again", which jumps to the search
     box).
   - **Control**: the article's own title word, searched the same way,
     lists it. <sup>s3</sup>

4. **Only published articles are found**

   Given: a visitor, then the Journal Manager, on a scratch journal holding
   a published article with a made-up word in its title and a submission
   that carries the same word in its title but has never been published.

   - **A visitor**: type the word and press "Search": only the published
     article is listed.
   - **The Journal Manager, signed in**: search the word again: the same
     one article.
   - **Control**: the unpublished submission is listed for neither the
     visitor nor the Journal Manager. <sup>s4</sup>

5. **Unpublishing removes, republishing restores**

   Given: the Journal Manager, then a visitor, on a scratch journal holding
   one published article with its own made-up word in its title.

   - **Before**: the Journal Manager, signed in, searches the made-up word:
     the article is listed.
   - **"Unpublish"**: open the article's workflow, go to its Publication
     tab and press "Unpublish" ("Unpost" on a server) at the top right. A
     visitor searching the word now gets "No Results" (on a press, the "No
     titles were found…" line), without any wait.
   - **Published again**: publish it again, then run the site's background
     jobs: once they have run, the visitor's search lists the article
     again.
   - **Control**: until the jobs have run, the visitor's search still reads
     "No Results". <sup>s5</sup>

6. **Paging through a long list**

   Given: a visitor, on a scratch journal with 27 published articles that
   share one made-up word in their titles.

   - **Page 1**: type the word and press "Search": the page lists 25
     articles, reads "1 - 25 of 27 items", and offers the page links "2",
     ">" and ">>".
   - **Page 2**: press "2": the page lists the remaining 2, reads "26 - 27
     of 27 items", offers "<<", "<" and "1", and the search box still holds
     the word.
   - **Paging keeps the date filters** {OJS OPS}: under "Advanced filters",
     set "Published After" to the 1st of January of the current year (Year,
     Month and Day all chosen) and press "Search": the page still reads
     "1 - 25 of 27 items"; press "2": the three "Published After" selects
     still show that date (Rule 8).
   - **Control**: on each page the current page's number is plain text
     among the links, not a link: "1" on the first page, "2" on the second.
     <sup>s6</sup>

7. **Narrow by publication date** {OJS OPS}

   Given: a visitor, on a scratch journal with two articles sharing a
   made-up word in their titles, one published on the 1st of a month and
   one on the 15th, and a second scratch journal on which no publication
   date has ever been entered.

   - **Both listed**: type the word and press "Search": both are listed.
   - **"Published After"**: under "Advanced filters", set "Published After"
     to the 10th of that month (Year, Month and Day all chosen) and press
     "Search": only the article of the 15th is listed, and the three
     selects still show the 10th.
   - **"Published Before"**: set the three "Published After" selects back
     to their blank entries, set "Published Before" to the 10th (again all
     three parts) and press "Search": only the article of the 1st is
     listed.
   - **Empty box with a filter**: clear the search box, leave "Published
     Before" at the 10th and press "Search": only the article of the 1st is
     listed (Rule 5).
   - **Month and Day without a Year**: type the word again, set the three
     "Published Before" selects back to their blank entries, and under
     "Published After" choose that month in "Month" and 10 in "Day",
     leaving "Year" blank; press "Search": both articles are listed and
     the three selects go blank (Rule 9).
   - **A journal with nothing published**: on the second scratch journal
     open the Search page: the Year lists under both filters offer only
     blank entries and the page reads "No Results" (Rule 9).
   - **Control**: on a press this scenario does not run; check its absence
     instead: the press's Search page shows no "Advanced filters" and no
     date selects, only the search box and "Search" at its foot.
     <sup>s7</sup>

Journal-specific:

8. **Search the whole site** {OJS}

   Given: a visitor, on a site with two scratch journals each holding one
   published article with its own made-up word in its title.

   - **The home page's address**: open the site's home page; the address
     the browser then shows ends in a language code (such as
     /index.php/index/en). Adding /index/search after it gives a
     page-not-found error (Rule 10).
   - **The site-wide address**: open the site-wide Search page by typing
     its address in full, the site's own address followed by
     /index.php/index/search, for example
     https://example.org/index.php/index/search (no link leads there;
     Rule 10).
   - **The first word**: type it and press "Search": the first journal's
     article is listed with that journal's name under its title, and its
     title opens the article inside that journal.
   - **The second word**: search it: the second journal's article,
     likewise.
   - **Control**: under "Advanced filters", choose the first journal in
     "By Journal" and search the second word: "No Results", while the
     select shows blank again ([OJS2](#ojs2)). <sup>s8</sup>

9. **A journal that does not publish online** {OJS}

   Given: the Journal Manager, then a visitor and a Reader, on a scratch
   journal.

   - **Settings › Distribution › Access**: set "Publishing Mode" to "OJS
     will not be used to publish the journal's contents online." and save.
   - **A visitor**: pressing the header's "Search" link (still shown) lands
     on the Login page ([OJS3](#ojs3)).
   - **A signed-in Reader**: opening the journal's Search page gets "This
     journal does not publish its content online." instead of the page.
   - **Control**: the Journal Manager, signed in, opens the same address
     and gets the Search page; with "Publishing Mode" set back to "The
     journal will provide open access to its contents." and saved, the
     visitor gets the page again. <sup>s9</sup>

Preprint-server-specific:

10. **Search from the archive header** {OPS}

    Given: a visitor, on a scratch preprint server holding one posted
    preprint with its own made-up word in its title.

    - **The home page's archive header**: shows an empty search box and a
      "Search" button above the latest preprints. Type the preprint's
      made-up word and press "Search": the Search page opens with the word
      in its search box and that one preprint listed, its date line reading
      "Downloads: 0 - Submitted {date} - Posted {date}".
    - **The Preprints page**: the same box and button sit at its top and
      behave the same way.
    - **Control**: return to the home page: its archive box is empty again
      (Rule 17). <sup>s10</sup>

Press-specific:

11. **The press's Search page** {OMP}

    Given: a visitor, on a scratch press holding one published book with
    its own made-up word in its title.

    - **The header's "Search" link**: on the press's home page press
      "Search" in the header: the page "Search" shows the heading and, at
      its foot, a search box and a "Search" button.
    - **The word**: type the book's made-up word and press "Search": the
      page reads "1 Titles" and "One title was found which matched your
      search for "{word}"." with a "Search again" link, and lists the book
      with its cover, title, contributors and date.
    - **The title**: opens the book's catalog page.
    - **"Search again"**: press it: the page jumps to the search box, which
      still holds the word.
    - **Control**: the page as first opened, before any word was typed,
      showed no list; the Advanced filters of a journal's page are absent
      throughout. <sup>s11</sup>

Common to every application:

12. **Declined after publication, still listed; deleted, gone at once**

    Given: the Journal Manager and a visitor, on a scratch journal holding
    two published articles, each with its own made-up word in its title.

    - **Before**: the visitor types the first article's word and presses
      "Search": the article is listed.
    - **Returned to the workflow and declined**: the Journal Manager opens
      the first article's workflow, presses "Return to Workflow"
      ([Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#done))
      and then declines it with "Decline Submission"
      ([Submission stage](U25-submission-stage.md) describes the decline).
      The visitor's search for the word still lists the article on every
      application; its title opens the landing page on a journal, and on a
      press or preprint server the page "404 Not Found" [OMP3](#omp3)
      [OPS4](#ops4) (Rule 2).
    - **Deleted**: the Journal Manager deletes the declined submission with
      "Delete" ([Submission stage](U25-submission-stage.md#delete)). The
      visitor's search for the word reads "No Results" at once (on a press,
      the "No titles were found…" line), with no wait for the site's
      background jobs (Side effects).
    - **Control**: the second article, searched by its word, is listed
      after the decline and after the delete. <sup>s12</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a word that is only in a published HTML galley finds the article, book or preprint once the queue has run (Rule 3; A11)
  - a title corrected and a contributor added on a published article, book or preprint are found by their new words once the queue has run, and the old title word no longer finds it (Rule 12; A3)
  - a Year alone under "Published Before", and a Year and Month without a Day, limit the results and come back showing the date applied (Rule 9; A1)
  - on the site-wide Search page, a journal chosen under "By Journal" stays selected after the search and its page 2 lists that journal's articles only (Rule 10; OJS2)
  - on a press and a server, a published book or preprint returned to the workflow keeps its page, its place in the catalog or preprint list and its search result for a visitor (Rule 2; OMP3, OPS4)
  - a Search address asking for the sort by published date, newest or oldest first, lists the results in date order (Rule 14; A12)
  - a Search address whose page number is not a number, on a search that finds something, shows the first page of results (Rule 8; A13)
  - a search that finds several items gives the screen-reader status line "Found {N} items." with the count, on a journal and on a preprint server (Rule 7; OJS1, OPS1)
- **Rarely met**:
  - "Items per page" changed on Settings › Website › Setup › Lists, the
    results per page following it (Rule 8, Settings): the Journal Manager
    sets it once when the journal is set up, not in an ordinary week
- **Nothing new to test**:
  - keywords, subjects, section names and funders not searched by the box
    (Rule 3): no seeded article carries a keyword, subject or funder
  - a page number beyond the last page, "No Results" with the words kept
    (Rule 8): met only through a stale or edited address, never from the
    page's links
  - on a journal that does not publish online, the other managerial and
    assistant-level roles getting the page (Actors row 1): scenario 9's
    Journal Manager sees the same page
  - on that journal, an Author, Translator or Reviewer getting the sentence
    (Actors row 1): scenario 9's Reader sees the same sentence
  - a press having no publishing mode and no gate (Actors row 1, Rule 13):
    scenario 11's visitor gets the page as any visitor does
- **Register carries it**:
  - OPS2 (a server's gate and hidden archive box unreachable from its
    settings; Rules 13, 17, Settings)
  - OMP1 and OPS3 (the rebuild for one press or server by path rebuilding
    every one; Side effects)
  - A11 (galley text never searched, and the galley converters having no
    reachable effect; Rule 3, Settings)
  - A5 (several words all matching on PostgreSQL, any one on MySQL; Rule 4)
  - A6 (the bare Search page listing every article on a journal or server
    and nothing on a press; Rule 5)
  - OJS1 and OPS1 (the screen-reader count with several hits; Rule 7)
  - A2 ("Published Before" leaving out the chosen day; Rule 9)
  - A1 (a Year without Month and Day ignored, the selects showing an
    unchosen date; Rule 9)
  - A14 (a day the month lacks applied as the next month's date; Rule 9)
  - A15 (the Year lists following the dates on unpublished articles too;
    Rule 9)
  - A10 (a press or server site's site-wide page: no picker, no name under
    the results; Rule 10)
  - A16 (whether a journal's own configuration should govern its site-wide
    presence; Rule 10)
  - A4 (results in no particular order, stable on repeat; Rule 11)
  - A7 (a newer version unpublished: the older one listed again after the
    jobs, the newer one's words still finding it; Rule 12)
  - A3 (edits after publication never reaching the index; Rule 12)
  - A8 and A12 (the address-only refinements, paging keeping the sort
    alone, the date sort answering an error page; Rules 8, 14)
  - A13 (a page number that is not a number giving a completely empty page;
    Rule 8)
  - OMP3 and OPS4 (a declined book or preprint still listed, its title
    opening "404 Not Found" for a visitor; Rule 2)
  - A9 (two configuration settings nothing reads; Settings)
- **No seed**:
  - a subscription journal's restricted articles listed like any other,
    with no lock (Actors row 5, Rule 16): no scenario key seeds a
    subscription journal's access rules
  - unpublishing an issue removing its articles at once, and publishing it
    again listing them after the jobs (Rule 12, Side effects): no scenario
    key creates an issue on a scratch journal, so no seeded article sits in
    one
  - the system administrator's command-line rebuild, and the emptied index
    it starts from (Actors row 6, Side effects): the command-line tools are
    reference only, so the test tooling runs the site's background jobs and
    no other command-line tool
  - installing or upgrading the site rebuilding the whole index (Side
    effects): the test tooling neither installs nor upgrades
  - the OpenSearch driver's relevance ranking, inclusive "Published Before"
    and multi-value refinements, and the OpenSearch index name (Settings):
    no OpenSearch server on the test installs, and the test tooling does
    not change the configuration file
- **Owned by another feature**:
  - publishing a new version of an article, findable once the jobs have run
    (Rule 12; the version is created and published in *Publish, schedule &
    versions*, scenarios 4 and 5)
  - the "Search" link in every reader-page header, absent on the Search
    page, the site's pages and the dashboards, and no page linking to the
    site-wide page (Rule 1, Actors row 2, Rule 10; *Navigation menus & site
    chrome*)
  - requiring sign-in to view the site putting the page behind Login
    (Settings; *Users & Roles › Site Access Options*, site-wide)
  - the editorial "Search submissions" box (Cross-feature; *Submissions
    dashboard*)
  - the publishing flow, issues, Return to Workflow, Decline and Delete,
    the landing pages and the subscription rules (Cross-feature; *Publish,
    schedule & versions*, *Issues*, *Workflow screen & stage access*,
    *Submission stage*, *Article landing page & reading*, *Monograph
    landing page*, *Subscriptions & open access control*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-02), unreviewed unless
an entry notes otherwise; the team settles them on spec review. The summary
is sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact
and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A Search date filter chosen without its Month or Day is ignored and comes back showing another date | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A3](#a3) | Search never finds the corrected title, abstract or added contributor of an already published article | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A9](#a9) | Two search settings in the configuration file still promise an effect but change nothing | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A11](#a11) | A reader's search never finds a word that appears only in an article's or book's full text | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A12](#a12) | A Search link that sorts the results by published date shows an empty error page | 🐞 | low · crash: server | issues (claude), 2026-10-03 — re-verified |
| [A13](#a13) | A Search results address whose page number is not a number opens a completely blank page | 🐞 | low · crash: server | issues (claude), 2026-10-03 — re-verified |
| [OJS1](#ojs1) | Screen readers hear a raw code, or "Found one item.", when a search finds several items | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [OJS2](#ojs2) | On the site-wide Search page, "By Journal" limits the first page only and never shows as chosen | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [OMP1](#omp1) | The index-rebuild tool ignores the press path it is given and rebuilds every press | 🐞 | invisible | — |
| [OMP3](#omp3) | Returning a published book or preprint to the workflow takes its page offline for readers, while Search still links to it | 🐞 | high | issues (claude), 2026-10-03 — re-verified |
| [OPS1](#ops1) | On a preprint server the screen-reader result count always says "Found one item." | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [OPS3](#ops3) | The index-rebuild tool ignores the server path it is given and rebuilds every server | 🐞 | invisible | — |
| [OPS4](#ops4) | Returning a posted preprint to the workflow takes its page offline for readers, while Search still links to it | 🐞 | high | issues (claude), 2026-10-03 — re-verified |
| [A2](#a2) | "Published Before" leaves out the chosen day itself | ❓ | minor | — |
| [A4](#a4) | Results come in no particular order | ❓ | user-visible | — |
| [A5](#a5) | Whether several words must all match or any one may depends on the site's database | ❓ | user-visible | — |
| [A6](#a6) | The bare Search page lists every published article on a journal or server, and nothing on a press | ❓ | user-visible | — |
| [A7](#a7) | Words from an article's superseded versions still find it | ❓ | latent | — |
| [A8](#a8) | The page honours refinements that no control on it offers | ❓ | latent | — |
| [A10](#a10) | The site-wide Search page of a press or server site has no journal picker and names no press or server under its results | ❓ | minor | — |
| [A14](#a14) | A day the month does not have is offered, and applied as the next month's date | ❓ | minor | — |
| [A15](#a15) | The Year lists follow the dates entered on unpublished articles too | ❓ | minor | — |
| [A16](#a16) | Whether a journal's own configuration should govern its presence on the site-wide Search page | ❓ | latent | — |
| [OJS3](#ojs3) | On a journal that does not publish online, a visitor is sent to Login instead of being told | ❓ | minor | — |
| [OPS2](#ops2) | A server's does-not-post gate cannot be reached from its settings, and would show a raw code if it were | ❓ | minor | — |
| [OMP2](#omp2) | The press's Search page is a different page: one box at the foot, no filters, its own wording | ✅ | user-visible | — |

### All apps

<a id="a1"></a>
**A1 — A Search date filter chosen without its Month or Day is ignored and comes back showing another date** · 🐞 · medium.
A reader on the Search page who sets "Published After" or "Published
Before" to a Year alone, or to a Year and Month without a Day, and
presses "Search" gets every result, as if no date had been chosen. The
selects then show a date the reader never chose: a Year alone comes back
as 30 November of the year before, a Year and Month as the last day of
the month before. When the year before is not in the "Year" list, the
Year select comes back blank. Pressing "Search" again from that form
searches by the date shown, or with no date at all when the Year is
blank.

Choosing all three parts works, but the selects start blank and
nothing asks for all three. The ignored filter is on `main` only, the
coming 3.6. On 3.5 the first search is filtered correctly, and the
wrong date in the selects is what a repeated search uses. A press's
Search page has no date filters.
Basis: probe, 2026-10-03. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Published Before" excludes the chosen day** · ❓ · minor.
An article published on the very day chosen under "Published Before" is
left out, while one published on the day chosen under "Published After" is
kept. The two filters are not symmetric, and a reader picking the same day
in both gets nothing.
Question: should "Published Before" include the chosen day, as the
OpenSearch driver's version of the same filter does?
Lean: include it; "before" a day is a natural reading either way, but the
two drivers should agree.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Search never finds the corrected title, abstract or added contributor of an already published article** · 🐞 · medium.
An editor who corrects the title or abstract of an article that is
already published, or adds a contributor to it, sees the change on the
article page, but the Search page never finds the article by the new
words. It still finds it by the old ones, and then lists it under the
new title.

Nothing tells the editor: the save says "Saved". The new words become
searchable only when the version is unpublished and published again, a
new version is published, or the administrator rebuilds the search
index from the command line.
Since: 2025-08 (about a year). Basis: probe, 2026-10-03. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — Results come in no particular order** · ❓ · user-visible.
A search that finds several articles lists them in whatever order the
database returns them: not by relevance, not by date, not by title (three
articles dated 2024, 2023 and 2025 came back in that order, and the same
order on every repeat). A reader has no way to ask for a sort from the
page (a sort exists only through the address, [A8](#a8)).
Question: what order should results have, and should the page offer a
sort?
Lean: newest first by default, as the journal's other listings do, with a
relevance order once a ranking driver is in use.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — Several words mean different things on different databases** · ❓ · user-visible.
On a PostgreSQL site, typing two words finds only articles containing both;
on a MySQL or MariaDB site it finds articles containing either. The page
gives no hint which applies, and the old search-syntax help is gone.
Question: which combination is intended, and should the page say so?
Lean: "all words" is the more useful default and the one to document;
either way the behavior should not depend on the database.
Basis: probe for the PostgreSQL side, judgment for MySQL and MariaDB.
<sup>f-a5</sup>

<a id="a6"></a>
**A6 — The bare Search page lists everything, except on a press** · ❓ · user-visible.
Opening the Search page with nothing typed lists every published article
of the journal (or server), 25 to a page, before the reader has searched
for anything. On a press the same page shows only the search box, with no
count and no notice. Earlier versions showed only the form everywhere.
Question: is the full listing intended as a browse-everything view, or
should the page wait for a query as the press's does?
Lean: intended enough to keep; it is harmless and gives an empty journal a
clear "No Results". But the three applications should agree.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Superseded versions still find the article** · ❓ · latent.
An article whose second version replaced a word in the title is still
found by the old word, because the index keeps the text of every version,
published or not. A reader who follows the result sees the current version
and no trace of the word they searched.
Question: should only the current published version feed the index?
Lean: yes; a reader cannot see the older text, so finding the article by it
is confusing.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Refinements that no control offers** · ❓ · latent.
The Search page applies refinements carried in its address (title-only,
abstract-only, contributor-only and galley-only words; keyword, subject,
section, category, funder and reviewer matches; a sort by title) for which
the page has no control, and drops all but the sort again when the reader
moves to the next page. The sort by published date it is built to accept
answers an error page ([A12](#a12)).
Question: are these the seeds of a coming advanced-search form, or should
they be documented as an integration surface?
Lean: they are unfinished; until controls exist they should at least
survive paging.
Basis: probe for the title-only, abstract-only, contributor-only and
galley-only words and the sort by title; judgment for the keyword,
subject, section, category, funder and reviewer matches. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — Two search settings in the configuration file still promise an effect but change nothing** · 🐞 · low.
The search section of the configuration file still lists "Minimum
indexed word length" (`min_word_length = 3`) and "The maximum number of
search results fetched per keyword" (`results_per_keyword = 500`), each
with a note on what it does. The application no longer reads either
value. An administrator who changes them to tune the site's search
changes nothing, and nothing tells them so.

The search rewrite dropped both settings on purpose. Search now leaves
word length to the database's full-text search (or to OpenSearch), and
it pages all matches with no cap per word. Only the two lines and their
notes are left behind, and Administration › "System Information" lists
them with the rest of the search section, as if they were in force.
Since: 2025-08 (about a year). Basis: judgment, 2026-10-03. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — No journal picker and no journal name on a press or server site** · ❓ · minor.
On a site hosting several presses (or servers), the site-wide Search page
searches all of them but offers no "By Journal" select to narrow to one, as
a journal site's page does, and its results carry no press or server name,
so two books from different presses look alike until opened. A journal
site names the journal under each title.
Question: should the press and server pages carry the same select and name
the press or server under each result?
Lean: yes; the machinery behind the select is shared, and both the select
and the name are missing only from the two page templates.
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — A reader's search never finds a word that appears only in an article's or book's full text** · 🐞 · medium.
A reader who searches for a word that appears only in the text of an
article's galley gets "No Results", however long after the article was
published, while a word from the same article's title finds it. The
same happens with a book's publication format on a press and a
preprint's galley on a preprint server.

The site is built to search the text of plain-text, HTML and XML
galleys. On this code none of that text reaches the search index, so
search covers only titles, abstracts and contributor names, and the
empty result looks like an honest "no match".

`main` is the coming 3.6 release. A site that upgrades to it from 3.5,
where full-text search works, loses it, because the upgrade rebuilds the
index without the galley text.
Since: 2025-08 (about a year). Basis: probe, 2026-10-03. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A Search link that sorts the results by published date shows an empty error page** · 🐞 · low · crash: server.
A reader who opens a Search results link that asks for the results
sorted by published date (`orderBy=datePublished`, newest or oldest
first) gets an empty page instead of the results: the server fails. The
sort by title, asked for the same way, works.

No control on the page offers either sort, so only a typed, bookmarked
or shared link reaches it. Without the sort, the link lists the results.

It happens only on sites whose database is PostgreSQL; MySQL accepts the
query. No release has it: only `main`, the coming 3.6.
Basis: probe, 2026-10-03. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A Search results address whose page number is not a number opens a completely blank page** · 🐞 · low · crash: server.
A reader who opens a bookmarked or hand-edited Search results address
whose page number is not a number (`searchPage=abc`) gets a completely
blank page: no heading, no search form, no message of any kind. The
server fails on the request because it uses the page number without
checking that it is a number. OJS's site-wide Search page fails the
same way as a journal's. On `main` it takes a search that finds
something; on 3.5 every search fails.

Nothing is lost, and the reader gets back with the browser's back button
or the journal's address. No link on any page gives such an address, so
only a typed, mangled or shared one reaches it.
Basis: probe, 2026-10-03. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — An impossible day is offered and rolled into the next month** · ❓ · minor.
The Day list under "Published After" and "Published Before" offers 1 to 31
whatever the Month chosen. A reader who chooses 31 September and presses
"Search" gets the filter applied as 1 October, and the selects then read
that date; 31 February becomes 3 March in a year whose February has 28
days. The reader is not told, and the date shown is not the one chosen.
Question: should the Day list follow the chosen month, or an impossible
date be refused rather than silently moved?
Lean: refuse or follow the month; a silently changed date is the same
surprise as [A1](#a1).
Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — The Year lists follow unpublished articles' dates too** · ❓ · minor.
The Year lists under both date filters run from the earliest to the latest
publication date entered on any of the journal's articles, published or
not: a submission that has never been published but carries a publication
date two years back adds those years to the lists, while it stays out of
the results. A reader who chooses one of those years finds nothing.
Question: should the Year lists be built from published articles only?
Lean: yes; a year in which the journal published nothing is a dead
choice.
Basis: probe. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — Whether a journal's own configuration governs its presence on the site-wide page** · ❓ · latent.
The site-wide Search page lists the content of every journal on the site
(Rule 10). Whether a journal's own configuration should decide whether
its content appears there is open.
Question: should a journal's own configuration govern whether its content
appears on the site-wide Search page?
Lean: it should; a journal's own settings ought to hold wherever its
content is listed.
Basis: judgment. <sup>f-a16</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — Screen readers hear a raw code, or "Found one item.", when a search finds several items** · 🐞 · low.
A reader who searches a journal or a preprint server, and finds more
than one item, hears a status line before the results. It should say
how many items were found ("Found 2 items."). Instead it reads out the
raw code "##search.searchResults.foundPlural##"; on a preprint server
on `main` it says "Found one item." whatever the count.

The results and the visible line under them ("1 - 2 of 2 items") are
right. The status line is hidden from sighted readers, so nobody else
notices it.

The raw code is already reported to pkp (see Upstream). The preprint
server's "Found one item." on `main` is a second fault on the same
line, which a fix for the raw code alone would not cure.
Basis: probe, 2026-10-03. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — On the site-wide Search page, "By Journal" limits the first page only and never shows as chosen** · 🐞 · medium.
On a site that hosts several journals, a reader on the site-wide Search
page chooses a journal under "By Journal" and presses "Search". The first
page of results is limited to that journal, but the select shows its
blank entry again, so nothing on the page says a journal is in force.

The page links below the results drop the choice. Page 2 and every page
after it list the whole site, and the count jumps from the journal's
total to the site's, with nothing telling the reader that the filter is
gone. A second search from the same form, with the select now blank,
searches the whole site from page 1.

No release has it: it is on `main`, the coming 3.6, and 3.5 keeps the
chosen journal.
Basis: probe, 2026-10-03. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — A visitor is asked to sign in instead of being told** · ❓ · minor.
On a journal that does not publish online, a visitor who presses the
header's "Search" link lands on the Login page, with no word that the
journal does not publish; the sentence "This journal does not publish its
content online." is shown only after signing in, to a Reader, Author,
Translator or Reviewer.
Question: should a visitor see the sentence directly?
Lean: yes; a Login page suggests the content is there for members, which
is not what the setting means.
Basis: probe. <sup>f-ojs3</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The rebuild tool ignores the press path** · 🐞 · invisible.
The command-line index rebuild accepts a press path, refuses an unknown
one with "The given press path "{path}" could not be resolved to a press.",
and then rebuilds the index for every press on the site regardless of the
path given.
Basis: judgment. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — The press's Search page is its own page** · ✅ · user-visible.
The press's Search page has one search box and "Search" button at its
foot, no Advanced filters, a visible "{N} Titles" count, its own found /
not-found sentences quoting the searched words, a "Search again" link, and
results shown as book summaries two to a row. The machinery behind it is
the same. The page has been the press's own since the press application
was built, so it reads as a design choice rather than drift.
Basis: probe. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — Returning a published book or preprint to the workflow takes its page offline for readers, while Search still links to it** · 🐞 · high.
An editor presses "Return to Workflow" on a published book or a posted
preprint to keep working on it after publication. The published version
should stay public while that work goes on, as a journal's article does.

Instead, readers lose it at once. Its page shows only "404 Not Found",
and it disappears from the catalog (on a server, the preprint list). The
workflow still reads "Published", and nobody is told. The Search page
keeps listing the item, so a reader who finds it there lands on the dead
page. If the preprint is then declined, readers still get the dead page
and the search result.

This lasts until the editor presses "Return to Done", which stops the
work the return was for. The action is new in the coming 3.6, and no
release has it.
Basis: test run, 2026-10-03. <sup>f-omp3</sup>

### OPS

<a id="ops1"></a>
**OPS1 — On a preprint server the screen-reader result count always says "Found one item."** · 🐞 · low.
As [OJS1](#ojs1), on a preprint server: on `main` the status line read
to screen readers above the results says "Found one item." whatever the
count (seen with 7 results), because the server's page never takes its
plural branch; with that branch reached, as on 3.5, it reads out the
raw code "##search.searchResults.foundPlural##" as a journal's does.
Basis: probe, 2026-10-03. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — A server's does-not-post gate cannot be reached, and would show a raw code** · ❓ · minor.
A preprint server is built to gate its Search page, and to hide the archive
header's search box, while its posting mode says "OPS will not be used to
post the server's contents online.", and to show a signed-in Reader a
sentence that exists in no language, so a raw code would appear in its
place. But the "Posting Mode" choice on Settings › Distribution › Access
says "Saved" and stores nothing (a defect of *Subscriptions & open access
control*, cited here), so the gated state cannot be reached: with the mode
"set", every visitor and every role still got the Search page and the
archive box.
Question: should a server have this gate at all, and if so, a working
setting and a sentence for it?
Lean: as built the gate is dead code and the sentence missing; either
remove the gate or make the setting store and add the sentence.
Basis: judgment. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — The rebuild tool ignores the server path** · 🐞 · invisible.
As [OMP1](#omp1): the command-line rebuild accepts and checks a server
path, then rebuilds every server on the site.
Basis: judgment. <sup>f-ops3</sup>

<a id="ops4"></a>
**OPS4 — Returning a posted preprint to the workflow takes its page offline for readers, while Search still links to it** · 🐞 · high.
As [OMP3](#omp3), on a preprint server: after "Return to Workflow" on a
posted preprint, a visitor gets "404 Not Found" on its page, and it
leaves the preprint list, while Search keeps listing it
and the workflow still reads "Published". Declining it afterwards
changes nothing for the visitor. The server's OAI-PMH interface also
reports the preprint as deleted to harvesters.
Basis: probe, 2026-10-03. <sup>f-ops4</sup>

### Seen on the way, owned elsewhere

- The workflow's header shows the raw code "##common.help##" where the help
  button's label belongs, on all three applications:
  [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md).
- On a journal, a Publication Stage chosen in "Review Publishing Details"
  is saved even when the publish is then refused, and only a new version
  recovers: [Publish, schedule & versions](U49-publish-schedule-and-versions.md).
- A preprint server's "Posting Mode" on Settings › Distribution › Access
  says "Saved" and stores nothing: *Subscriptions & open access control*
  (cited in [OPS2](#ops2)).
- On a journal, a Subscription Manager who signs in lands on an
  access-denied page instead of a dashboard:
  [Login & sessions](U01-login-and-sessions.md).

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — the page and its handler chain.** `PKP\pages\search\SearchHandler`
(`lib/pkp/pages/search/SearchHandler.php`), ops `index` and `search`, both
running `search()`; dispatched by each app's `pages/search/index.php`.
**Chain check** (multi-app rule 8): OJS `APP\pages\search\SearchHandler`
and OPS's add only `authorize()` with `OjsJournalMustPublishPolicy` /
`OpsServerMustPublishPolicy` (fn-l); OMP's subclass is empty. OJS and OPS
`index.php` also route an op `similarDocuments` that no handler implements
(dead; any address using it errors). `setupTemplate()` marks the page
publicly cacheable unless the context has `restrictSiteAccess`; the
sign-in-to-view gate itself is `RestrictedSiteAccessPolicy`, site-wide.
Header link: `lib/pkp/templates/frontend/components/header.tpl`,
`.pkp_navigation_search_wrapper`, rendered `{if $currentContext &&
$requestedPage !== 'search'}`, string `common.search` "Search"; no app or
default theme overrides `header.tpl`. No user-dependent branch exists in
the handler or the result builder (fn-c), and the handler and engine only
read. Live-probed 2026-09-02 on scratch contexts of all three apps: the
header of a context's home and About pages holds exactly one "Search" link
(OJS header texts in order: the journal name, "Current", "Archives",
"About", "Search", "Register", "Login"; OMP "Catalog" in place of the first
two; OPS "Archives"); the Search page's own header holds none, and the site
home's header holds only "Register" and "Login". The link opens a page
titled "Search | {journal}", heading "Search", breadcrumb "Home / Search".
Signed-in Journal Manager, Section Editor and Reader saw, field by field,
the same page, controls, status line, paging and results as a visitor.
Re-checked 2026-09-02 on all three apps as a visitor: the header "Search"
link (`href` `…/<context>/search`) was present on the context's home,
About, Login, Register, Archives (OMP "Catalog"; OPS `preprints`),
article / book / preprint landing, Contact and Submissions pages; absent
on the Search page and on the site home, site Search and site Login pages
(header "Register | Login"). Signed in as every default role: the page a
role lands on after login (`/dashboard/editorial…`; Author and Translator
`/dashboard/mySubmissions`; Reviewer `/dashboard/reviewAssignments`; the
Reader lands on the journal home) has no "Search" link in its header and
no link ending in `/search` anywhere on it.

<a id="fn-b"></a>
**b — the forms.** OJS and OPS: `<app>/templates/frontend/pages/search.tpl`
(app-side copies; diff 2026-09-02: identical except OPS omits the
`searchContext` select block, sets no `role="form"`, and reads
`$results->count` as a property, fn-g). Form `form.cmp_form method="get"`
posting to the page's own address; box `input#query name="query"` with
sr-only label `search.searchFor` and placeholder `common.search`; fieldset
legend `search.advancedFilters`; `{html_select_date_a11y}` twice
(`PKPTemplateManager::smartyHtmlSelectDateA11y()`, each select with a
leading blank option, years `start_year..end_year`); OJS-only
`select#searchContext` `{if $searchableContexts}`; `button.submit`. Hook
points `Templates::Search::SearchResults::AdditionalFilters` and
`::PreResults`: no bundled plugin registers either (grep 2026-09-02). OMP:
`omp/templates/frontend/pages/search.tpl` includes
`components/searchForm_simple.tpl` after the results. OPS archive form:
fn-p. Live-probed 2026-09-02, verbatim: hidden label "Search articles for"
(OPS "Search preprints for"), placeholder "Search", legends "Advanced
filters", "Published After", "Published Before", select labels "Year",
"Month", "Day"; Year offers a blank entry then the published years ("2026"
alone on a context published only this year; "2024", "2025", "2026" on one
whose articles span 2024 and 2026), Month a blank then "Jan" … "Dec", Day a
blank then "1" … "31"; button "Search". "By Journal" appears only on the
site-wide page of the journal site (blank entry, then every enabled
journal by name). OMP: a form read out as "Book Search" holding one box
read out as "Search Query" (no placeholder, no visible label) and a
"Search" button, under the results when there are any and directly under
the heading otherwise.

<a id="fn-c"></a>
**c — what is indexed and what is returned.**
`PKP\search\SubmissionSearchResult::builderFromRequest()` builds a Laravel
Scout `Builder` (query = `query`, wheres `contextId`, `publishedFrom/To`,
`title`, `abstract`, `author`, `body`; whereIns `reviewers`, `categoryIds`,
`sectionIds`, `keywords`, `subjects`, `funders`; `orderBy`/`orderDir`).
`DatabaseEngine::buildQuery()` (`lib/pkp/classes/search/engines/`) selects
from `submissions_fulltext` joined to `submissions`, restricted to
submissions having a publication with `status = STATUS_PUBLISHED`;
`SubmissionSearchResult::newCollection()` then drops any hit whose
*current* publication is not published. Chain: OJS
`APP\search\SubmissionSearchResult::newCollection()` adds `issue` and
`issueAvailable` to each row (subscription check via `IssueAction`), but
no template reads `issueAvailable` (grep 2026-09-02), hence Rule 16; OMP
and OPS subclasses are empty. Index content:
`PKP\jobs\submissions\UpdateSubmissionSearchJob::handle()` upserts one
`submissions_fulltext` row per (submission, publication, locale) with
`title` = `getFullTitles()`, `abstract`, `authors` = concatenated
`getFullNames()`, and `body` meant to hold galley text (never filled,
f-a11). No locale filter in the query, so every language row matches.
Keywords/subjects/sections/categories/funders are filters (`whereIn`), not
searched text. Live-probed 2026-09-02, all three apps: a word placed only
in the abstract, a family name placed only on a contributor, the title word
typed in capitals, and a word placed only in the French title (site read in
English, no language switcher shown) each listed exactly the one article; a
never-published submission carrying the same title word as a published one
was never listed, for a visitor, a Journal Manager, a Section Editor or a
Reader. A published article returned to the workflow ("Return to
Workflow" → "Confirm") and declined ("Decline Submission" → "Record
Decision"; stage bubble "Declined") stayed listed and its result opened the
live landing page, on all three apps; the probe did not record whether the
page was read signed out. Suite runs of 2026-09-13, the page read as a
visitor after the same decline: OJS `article/view/{id}` answered the
landing page; OMP `catalog/book/{id}` and OPS `preprint/view/{id}`
answered status 404 with the page "404 Not Found" (f-omp3, f-ops4). OJS
subscription case: an article in
an issue whose Access tab reads "Subscription" (the journal's Publishing
Mode set to "The journal will require subscriptions to access some or all
of its contents.") was listed with exactly the same markup as an open one
(title, contributors, date; no icon, label or note) and its landing page
opened for the visitor; the article carried no galley, so what the page
does with a file was not observed.

<a id="fn-d"></a>
**d — word matching.** `DatabaseEngine::buildQuery()` applies
`whereFullText(['title','abstract','body','authors'], $query)`. Laravel's
grammar renders that as `MATCH (…) AGAINST (? IN NATURAL LANGUAGE MODE)` on
MySQL/MariaDB (any-word, ranked but the ranking is discarded by the
`GROUP BY` + `pluck`) and as `to_tsvector('english', …) @@
plainto_tsquery('english', ?)` on PostgreSQL (all words, English stemming,
stop words dropped, punctuation ignored). The fleets are PostgreSQL
(harness.md), so live evidence covers the all-words side only. No syntax
layer exists anymore (the `searchSyntaxInstructions` template block is
empty). Live-probed 2026-09-02, identical on OJS, OMP and OPS, against
"Publications quarterly of brenthollow", "The vintrofal study" and three
"Notes on …" titles: "publication", "publications" and "public" each
listed the quarterly; "publi" and "quarterl" listed nothing ("No Results";
press: "No titles were found which matched your search for
"quarterl"."); "quarter" and "quarterly" one hit; "study", "studies" and
"studied" one hit; "note" and "notes" three hits; "AND" alone nothing.
With "Notes on tarnoble", "Notes on belquist" and "Notes on tarnoble and
belquist" published, `tarnoble belquist`, `"tarnoble belquist"`,
`tarnoble AND belquist` and `tarnoble OR belquist` each listed only the
third; the box echoed the text as typed, quotation marks included.
Re-checked 2026-09-02, identical on OJS, OMP and OPS, against "Children
of the uckaharbour" (abstract "…children who ran the uckaharbour and kept
running it.") and "Uckasubtok study" (abstract "…the uckasubtok
measurement."): "Children" and "children" one hit; "child", "childs" and
"CHILD" "No Results"; "ran", "run", "running", "runs" one hit;
"uckaharbour" and "uckaharbours" one hit, "ucka" and "harbour" none;
"study" and "studies" two hits, "stud" none; "measurement", "measure",
"measuring" one hit; "the", "of" and "the of" "No Results" although every
title holds them; "the uckaharbour" and "uckaharbour the study" one hit;
`uckaharbour,` `(uckaharbour)` `uckaharbour!` `"uckaharbour"`
`uckaharbour.` `uckaharbour's` and `uckaharbour & children` one hit;
`ucka-harbour` and `uckaharbour-children` "No Results" (both words of the
second are in the title); `uckaharbour uckasubtok` and `uckaharbour OR
uckasubtok` "No Results"; `???` "No Results". Mechanism: PostgreSQL's
`plainto_tsquery('english', …)` drops English stop words, and parses a
hyphenated pair into the whole plus its two parts, all of which must
match, so it finds only text that was hyphenated the same way.

<a id="fn-e"></a>
**e — the bare page.** `SearchHandler::search()` always runs the builder;
with an empty `query` the `->when($builder->query, …)` clause is skipped
and the SQL returns every published submission of the context. OJS/OPS
templates render whatever comes back; OMP's `search.tpl` opens with `{if
$query == ''}` and renders nothing but the form. Live-probed 2026-09-02:
on a scratch journal and server with five published articles, the bare
page and an empty "Search" both listed all five, "1 - 5 of 5 items"; the
press's bare page and empty search showed the heading, breadcrumb, box and
button only, with no count, no status text and no notice. Re-checked
2026-09-02 on all three apps: a box holding three spaces behaved exactly
as an empty box (the bare listing with the box shown empty; the press's
box-only page); a 600-character string, `<b>uckaharbour</b>` (shown
literally) and `???` were accepted without any error.

<a id="fn-f"></a>
**f — result summaries.** OJS: `frontend/objects/article_summary.tpl` with
`showDatePublished=true hideGalleys=true heading="h3"` and `journal=
$result.context` (outside a context the journal name is the subtitle span;
inside, title + subtitle); authors via `getAuthorString()`, `pages`, date
`date_format:$dateFormatShort`. OPS: `preprint_summary.tpl` with the same
flags; its `.details` line renders `publication.galley.downloads` then
`submission.dates`. OMP: `monograph_summary.tpl` (cover, `seriesPosition`,
full title, `getAuthorString(true)`, `datePublished`
`date_format:$dateFormatLong`), wrapped two per `.row` by `search.tpl`.
Landing links: `article/view/{id}` · `catalog/book/{id}` ·
`preprint/view/{id}`, prefixed with the result's own context path.
Live-probed 2026-09-02, verbatim: OJS "The vintrofal study" / "Zelda
Zorvakilen (Author)" / "2026-09-02"; OPS the same title and contributor
line, then "Downloads: 0" - "Submitted 2026-09-02 - Posted 2026-09-02";
OMP the default cover image (empty alternative text, linking to the book),
"The vintrofal study", "Zelda Zorvakilen (Author)", "September 2, 2026",
two summaries side by side when two were found. No galley links anywhere;
the title landed on the article page, the catalog book page and the
preprint page respectively, each headed "The vintrofal study"; the box
still held the word afterwards. The press's series position was not
observed (no seeded book had a series), so the body does not claim it.

<a id="fn-g"></a>
**g — counts and paging.** `PKPHandler::getRangeInfo($request, 'search')`:
page from `searchPage`, size from the context's `itemsPerPage` (schema
default 25; `lib/pkp/schemas/context.json`) or `[interface]
items_per_page` at site level; `$builder->paginate($count, 'submissions',
$page)` → `LengthAwarePaginator`. OJS `search.tpl`: sr-only `div[role=
status]` with `search.searchResults.foundSingle` / `foundPlural` passed a
`count`; the `en` locale entry for `foundPlural` carries no plural form, so
`LocaleBundle::translatePlural()` yields null and `Locale::translate()`
prints the key wrapped in `##` (OJS1). OPS: the same block reads
`$results->count` (a property the paginator lacks → null), so the plural
branch never fires (OPS1). OMP: `catalog.browseTitles` with
`$results->total()`, `catalog.foundTitlesSearch` / `foundTitleSearch` /
`noTitlesSearch`, `search.searchAgain` → a named anchor `search-form` on
the form. Pagination: `{page_info}` → `navigation.items`; `{page_links
name="search" …}` → `smartyPageLinks()` carrying `query`, `searchContext`,
`dateFrom*`, `dateTo*`, `orderBy`, `orderDir` only. Live-probed
2026-09-02, verbatim: OJS status "Found one item." with one result and
"##search.searchResults.foundPlural##" with 2, 3, 5, 7 and 25 (every
page, and the bare page); OPS "Found one item." with 1, 3, 7 and 25; OMP
"1 Titles" / "2 Titles" / "27 Titles" above "One title was found which
matched your search for "upcsoloq"." / "2 titles were found which matched
your search for "upebrindle"." / "27 titles were found which matched your
search for "upcpagetok"." and, with nothing found, no count and "No titles
were found which matched your search for "nowhereqix"."; each sentence is
followed by "Search again", which adds the anchor to the address and
scrolls the page to the form (the box keeps the word; focus does not move).
OJS/OPS with nothing found: "No Results". Paging with 27 hits, all three
apps: "1 - 25 of 27 items" with links "2", ">", ">>" and a plain-text "1";
after "2": "26 - 27 of 27 items" with links "<<", "<", "1" and a plain-text
"2"; the box kept the word, and Published After set to 2026 / Jan / 1
before searching was still selected on page 2. "Items per page":
re-checked 2026-09-02 on OJS at Settings › Website › Setup › Lists, field
"Items per page * Required", hint "Limit the number of items (for example,
submissions, users, or editing assignments) to show in a list before
showing subsequent items in another page.", value 25 (the same field and
hint on OMP and OPS; the Website page's tabs are Appearance, Setup,
Plugins, and Lists sits under Setup); set to 2 and saved, a five-hit
search read "1 - 2 of 5 items" with links "1 2 3 > >>"; restored to 25.
Stale paging, 2026-09-02, all three apps: `searchPage=1` and `=0` page 1;
`searchPage=9` beyond the last page → "No Results" (press: "No titles were
found which matched your search for "uckaharbour"."), the box holding the
word, no paging line; a non-numeric value is f-a13.

<a id="fn-h"></a>
**h — date filters.** Two parsers disagree. Display:
`SearchHandler::_assignDateFromTo()` builds `dateFrom`/`dateTo` for the
selects from the `date{From,To}{Year,Month,Day}` user vars, defaulting a
missing month/day, and the resulting date is then re-split for the selects
one day early. Query: `SubmissionSearchResult::builderFromRequest()` calls
`$request->getUserDateVar('dateFrom')` with **no defaults**, and
`PKPRequest::getUserDateVar()` returns `null` when month or day fails
`FILTER_VALIDATE_INT` in range 1..12 / 1..31, so a year-only or
year-month choice yields no filter (A1). `DatabaseEngine`:
`whereDate('p.date_published', '>=', $publishedFrom)` and
`whereDate('p.date_published', '<', $publishedTo)` (A2; `OpenSearchEngine`
uses `gte`/`lte`), inside a `whereExists` over any published publication of
the submission. Year range: `Repo::publication()->getDateBoundaries()`
(MIN/MAX `date_published` over the context's publications) →
`yearStart`/`yearEnd`; with no dates both are "" and the year loop yields a
single blank entry. Live-probed 2026-09-02 on OJS and OPS with two
articles published 2024-06-01 and 2024-06-15 (dates set through
"Publication Date" / "Date Posted" before publishing): Published After
2024 / Jun / 10 listed the 15th only, and the selects still read "2024",
"Jun", "10"; Published Before 2024 / Jun / 10 listed the 1st only;
Published After Jun 15 listed the 15th; Published Before Jun 15 listed the
1st only; Published Before Jun 1 gave "No Results"; Published Before Jun 16
listed both. Year 2025 alone under either filter listed both articles and
the selects then read "2024", "Nov", "30"; 2025 + Jun listed both and read
"2025", "May", "31"; 2024 alone read a blank Year, "Nov", "30". The Year
lists read blank, "2024", "2025", "2026" (the third article was published
2026-09-02). A journal with nothing published opened its Search page with
two blank Year entries in each list, full Month and Day lists, and "No
Results".

<a id="fn-i"></a>
**i — site-wide search.** With no context, `contextId` falls back to
`(int) $request->getUserVar('searchContext')` (0 = all), the SQL `where
context_id` clause is skipped, and `searchableContexts` =
`app()->get('context')->getManySummary(['isEnabled' => true])` is assigned
for the select. Address: `index/search` (`index.php/index/search` without
URL rewriting). OJS's `index.php` adds the must-publish policy only `if
($request->getContext())`, so the site-level page is never gated by it.
Live-probed 2026-09-02 on all three apps: the page opened with heading
"Search" and breadcrumb "Home / Search" and no header "Search" link; a
token from each of two scratch contexts listed that context's one article
and the title opened it inside its own context; the OJS page carried "By
Journal" with a blank entry and ten journals by name, and each OJS result
showed the journal's name ("Upe Alpha Scratch") under the title; the OMP
and OPS pages had no select and their results carried no press or server
name. No link or form on the site home, the site About page (a visitor is
sent to Login there), a context's home, Search or About page targets the
site-wide page; every "Search" link and box targets the context's own page.
Address forms, re-checked 2026-09-02 as a visitor on all three apps:
`<host>/index/search` and `<host>/index.php/index/search` open the page
(it lands on `/index.php/index/en/search`, heading "Search"), as does
`index/search/search?query=…`; `<host>/index.php/index/index/search` (the
home page's shown address plus `/index/search`) and `<host>/index.php/search`
give "404 Not Found".

<a id="fn-j"></a>
**j — order.** `DatabaseEngine::buildQuery()` adds `ORDER BY` only when
the builder carries one (`orderBy=title|datePublished`, and `featured` on
OMP); otherwise the query ends in `GROUP BY s.submission_id` with no
ordering, so PostgreSQL returns rows in an implementation-defined order.
`OpenSearchEngine` returns hits by score. Live-probed 2026-09-02, all three
apps: three articles sharing a word, dated 2024-03-10, 2023-11-05 and
2025-07-20 through the workflow's date field, came back in that order
(neither date order) in six searches; the bare page of the same context
listed seven articles in an order that followed neither their numbers nor
their titles, identically on repeated loads.

<a id="fn-k"></a>
**k — index currency.** Listener
`PKP\observers\listeners\UpdateSubmissionInSearchIndex` subscribes to
`PublicationPublished` and `PublicationUnpublished` (dispatched from
`PKP\publication\Repository::publish()` / `unpublish()`; OJS's overrides
call the parent) and calls `engine()->update([submission])`.
`DatabaseEngine::update()` deletes the submission's `submissions_fulltext`
rows synchronously, then `dispatch(new UpdateSubmissionSearchJob($id))`
(`timeout` 180 s; the job iterates **all** `publications` of the
submission, whatever their status, A7). On the test installs `[queues]
job_runner = Off`, so the job runs only when the harness drains the queue
(`shared/playwright/support/jobs.js`, serial project only); on a live site
the queue worker picks it up. Unpublish is immediate twice over: the rows
are deleted synchronously and the SQL requires a published publication.
Deletion: `submissions_fulltext.submission_id` and `.publication_id`
carry `ON DELETE CASCADE` (`SubmissionSearchMigration`). No other
dispatcher exists (grep 2026-09-02 for `EngineManager`,
`UpdateSubmissionSearchJob` and `submissions_fulltext` across
`lib/pkp/classes`, `lib/pkp/api`, `lib/pkp/controllers` and the apps'
`classes/`): nothing on `Repo::publication()->edit()`, galley or author
changes (A3). Archaeology: the engine replacement is pkp/pkp-lib#8920
(`b44cf277`, 2025-08-01) with follow-ups through 2026-07-16; the dropped
edit-time refresh was the pre-replacement
`SubmissionSearchIndex::submissionMetadataChanged()` path. Live-probed
2026-09-02, all three apps: "Unpublish" (OPS "Unpost") → the visitor's next
search read "No Results" with no queue run; publishing again → still "No
Results" until the queue ran, then listed. Editing the title of a published
version and pressing "Save" (banner "Warning: This version has been
published. Editing it may impact the published content.") → the result
showed the new title at once, the old word found it and the new word did
not, before and after a queue run; "Create New Version" and publishing 1.1
→ both words found it once the queue ran. A published date changed through
the workflow's date field showed in the result at once. OJS: "Unpublish
Issue" on the issue holding a found article → "No Results" at once, the
control article still found. Delete path: "Return to Workflow" → "Decline
Submission" → "Delete" ("Are you sure you want to permanently delete this
submission?") → "No Results" at once, no queue run; no screen offered
"Delete" while the article was published.
Re-checked 2026-09-02, all three apps. Versions: with 1.0 and 1.1 both
published, "Unpublish" (OPS "Unpost") on 1.1 ("Unpublish Are you sure you
don't want this to be published? Unpublish Cancel") → the entry read
"Status: Unpublished" with "Preview" and "Publish"; the visitor's search
found neither version's word at once, the landing page still answered with
the 1.0 title, and after a queue run both words found the article, listed
under the 1.0 title (`UpdateSubmissionSearchJob` indexes every
publication, A7; `Repository::unpublish()` reverts the current
publication to 1.0). The unpublished 1.1 offered only "Preview" and
"Publish" / "Post" and no delete, so the version-deletion cascade
(`ON DELETE CASCADE`) has no screen behind it. Contributors: "Add
Contributor" on a published article, saved → the result line read the new
name at once ("… Uckb Authorson (Author); Nova Uckbnewcontrib (Author)
…"), while searching the new family name gave "No Results" before and
after a queue run. Issue (OJS): "Unpublish Issue" ("Are you sure you want
to unpublish this published issue?") → the article's word "No Results" at
once and its landing page "404 Not Found"; "Publish Issue" again → still
"No Results" until the queue ran, then listed (`Repo::issue()->publish()`
republishes its publications through the same listener).

<a id="fn-l"></a>
**l — the must-publish gate.** OJS
`APP\security\authorization\OjsJournalMustPublishPolicy` (message key
`user.authorization.journalDoesNotPublish`): permits `ROLE_ID_MANAGER`,
`ROLE_ID_SITE_ADMIN`, `ROLE_ID_ASSISTANT`, `ROLE_ID_SUB_EDITOR`,
`ROLE_ID_SUBSCRIPTION_MANAGER` holders in the context; otherwise denies
when `publishingMode == PUBLISHING_MODE_NONE`. A denied policy sends an
anonymous user to Login and a signed-in one to `user/authorizationDenied`
with the message. Default group names per level (`registry/userGroups.xml`,
OJS): manager = Journal Manager, Journal Editor, Production Editor;
sub-editor = Section Editor, Guest Editor; assistant = Copyeditor, Designer,
Funding Coordinator, Indexer, Layout Editor, Marketing and Sales
Coordinator, Proofreader, Editorial Board Member. OPS
`OpsServerMustPublishPolicy`: same minus the subscription manager; its
message key `user.authorization.serverDoesNotPublish` is defined in **no**
locale file of OPS or lib/pkp (grep 2026-09-02), and `ops/schemas/context.json`
has no `publishingMode` entry at all, so the setting form's value is
discarded on save. OMP has no `publishingMode` and no such policy. The
header link has no such check. Live-probed 2026-09-02, OJS: Settings ›
Distribution › Access, "Publishing Mode" radios "The journal will provide
open access to its contents.", "The journal will require subscriptions to
access some or all of its contents.", "OJS will not be used to publish the
journal's contents online." (none checked on a fresh journal); with the
third chosen and "Saved": the header still showed "Search" for everyone; a
visitor pressing it landed on the Login page; a Reader, an Author and a
Reviewer got a page reading "This journal does not publish its content
online."; Journal Manager, Section Editor, Copyeditor, Subscription Manager
and Site Administrator got the Search page. Restoring open access gave the
visitor the page again. Re-checked 2026-09-02 with every default OJS group
plus the Site Administrator, twice on two scratch journals: Journal
Manager, Journal Editor, Production Editor, Section Editor, Guest Editor,
Subscription Manager, the eight assistant-level groups and the Site
Administrator got the Search page; Reader, Author, Reviewer, a user holding
Reader and Author, and Translator (an author-level default group,
`ROLE_ID_AUTHOR`, hence outside the policy's permitted list) got the page
`user/authorizationDenied?message=user.authorization.journalDoesNotPublish`
reading "This journal does not publish its content online."; the visitor
got `login?source=…/search`. The header showed "Search" for every actor. OPS: "Posting Mode" radios "The server will
provide open access to its contents.", "OPS will not be used to post the
server's contents online."; choosing the second and "Save" showed "Saved",
but after reload neither radio was checked and the save's response carried
no posting mode; visitor, Preprint Server Manager, Moderator, Editorial
Board Member, Reader, Author and Site Administrator all got the Search
page and no raw code appeared anywhere. OMP: Distribution offers the tabs
"License", "DOIs", "Search Indexing", "Payments", "Statistics", no Access
tab and no publishing mode; a visitor got the Search page.

<a id="fn-m"></a>
**m — address-only refinements.** Builder parameters with no form control
(fn-c): `title`, `abstract`, `author`, `body` (each a full-text match on
one column), `keywords[]`, `subjects[]` (exact match on the controlled
vocabulary's `name`/`identifier`), `sectionIds[]`, `categoryIds[]`,
`funders[]` (first value only on the database driver; ROR or lower-cased
name, via `Collector::filterByFunder`), `reviewers[]` (first value only;
LIKE on the reviewer's names/affiliation, open + public + confirmed
reviews, context-scoped), `orderBy=title|datePublished` +
`orderDir=asc|desc`. `page_links` forwards only `query`, `searchContext`,
the date parts, `orderBy` and `orderDir`. Live-probed 2026-09-02 by typing
addresses, all three apps: `author=` with a contributor's family name kept
the 27 hits and an unknown name gave nothing; `title=` with an
abstract-only word gave nothing while `abstract=` with it found all 27;
`orderBy=title&orderDir=asc` listed a, aa, b … and `desc` the reverse, and
the "2" link carried the sort; the "2" link carried no `author`, `title`
or `abstract` (the total went from 27 to 28 on page 2 after `abstract=`).
On the press, an empty `query` with any refinement showed the bare page.
Re-checked 2026-09-02 by address: `title=`, `abstract=`, `author=`
(either case), `body=` (nothing, A11) and `orderBy=title` with `asc` /
`desc` held on OJS, OMP (bare page with an empty `query`) and OPS;
`orderBy=datePublished` with either `orderDir` answered "HTTP 500" on OJS
and OPS (not tried on OMP; the engine passes `datePublished` to an SQL
`orderBy` that has no such column). `keywords[]`, `subjects[]`,
`sectionIds[]`, `categoryIds[]`, `funders[]` and `reviewers[]` were not
exercised (no article carried such metadata), so those remain judgment.

<a id="fn-n"></a>
**n — configuration.** `config.TEMPLATE.inc.php` `[search]` (identical in
OJS, OMP, OPS, diff 2026-09-02): `driver = database` (engines registered
in `PKPContainer` as `database` → `DatabaseEngine`, `opensearch` →
`OpenSearchEngine`), `search_index_name = "submissions"`,
`opensearch_hosts/username/password/ssl_verification/debug`,
`min_word_length = 3`, `results_per_keyword = 500`, `index[<mime>]`
helper lines. `min_word_length` and `results_per_keyword` are read by no
PHP file (grep 2026-09-02 outside the config templates), A9. The test
config (`config.test.inc.php`) keeps `driver = database` and no
`index[…]` lines. Not live-probed (no screen).

<a id="fn-o"></a>
**o — the rebuild tool and install.** `tools/rebuildSearchIndex.php`
(per app; atlas CLI-029): optional switches, optional context path
(OJS `JournalDAO::getByPath`, exit with
`search.cli.rebuildIndex.unknownJournal`; OMP/OPS likewise with
`unknownPress`/`unknownServer`), then `flush()`, `deleteIndex()`,
`createIndex()` and `update()` in chunks of 100 over
`filterByContextIds([$journal?->getId() ?? SITE_CONTEXT_ID_ALL])`. OMP
and OPS assign the resolved context to `$press` / `$server` but filter on
the never-set `$journal` → always all contexts (OMP1, OPS3; the OJS copy
is correct). `DatabaseEngine::flush()` truncates `submissions_fulltext`;
`createIndex()`/`deleteIndex()` are no-ops on the database driver and
create/drop the mapping on OpenSearch. `Installer::rebuildSearchIndex()`
flushes and re-updates everything at install/upgrade. Not run (no screen).

<a id="fn-p"></a>
**p — the OPS archive header.**
`ops/templates/frontend/components/archiveHeader.tpl` (included by
`pages/indexServer.tpl` and `pages/preprints.tpl`; atlas AFFR-078,
owned by *Sections*, search portion cited here) includes
`components/searchForm_archive.tpl`: `{if !$currentServer ||
$currentServer->getData('publishingMode') != PUBLISHING_MODE_NONE}` →
`form.pkp_search role="search" aria-label="Preprint Search"` posting GET
to `search/search`, `input name="query" value="{$searchQuery}"` (the
variable is never assigned, so the box is always empty), button
`common.search`. Live-probed 2026-09-02: the server's home page and its
Preprints page (heading "Archives") each carried a form read out as
"Preprint Search" with an empty box read out as "Search Query" (no
placeholder) and a "Search" button; typing a word and pressing "Search"
opened the Search page with the word in the box and its two results,
"1 - 2 of 2 items". The hiding clause could not be observed (fn-l: the
posting mode does not store).

<a id="fn-s"></a>
**s — seeding for the scenarios.** Scratch contexts and published
submissions come from the scenario API (`docs/process/scenarios.md`):
`POST scenarios/context` with the throwaway `users[]` a scenario signs in
with (a manager, an author as submitter, a reader), then `POST
scenarios/submission` with `submitted: true`, `published: true`, a chosen
`title`, `abstract` and the submitter's contributor names (OJS accepts a
published seed without an `issue`). `metadata.datePublished` is not built
(scenarios.md "Field shapes not built yet"), so scenario 7's two dates are
set through the workflow's "Publication Date" / "Date Posted" field before
publishing, as the suites do. Publishing through the API dispatches the
index job exactly as the UI does, so every scenario that expects a hit
must run in the serial project and call `runJobs()` after seeding and
after any republish (fn-k). Use one made-up token per article
(whitespace-free, letters only, e.g. `zq{tag}title`, all of one length so
none is a stem or prefix of another), since PostgreSQL full-text drops
digits-only tokens and stems words. On shared fleets another session's
drain may run this session's jobs first; count results, not jobs. No key
seeds a decline or a delete after publishing, so scenario 12 drives them
on screen (fn-s12).

<a id="fn-s1"></a>
**s1** — Two published articles in a scratch journal, each with its own
token in the title; header link `a.pkp_search` → `search`; expect one
`li` in `ul.search_results` (OMP: one `.obj_monograph_summary`).
Live-probed 2026-09-02 on all three apps (fn-a, fn-f). The count line is
`{page_info}` (`navigation.items`) and the page links `{page_links}`,
absent with one page; the status line is the sr-only `div[role=status]`
with `search.searchResults.foundSingle` (OJS/OPS only; OMP renders
`catalog.browseTitles`, fn-g). The mail read: `pkpMail` scoped to the
scratch context's throwaway addresses (`<username>@mail.test`), zero
messages after the searches; the Mailpit inbox is shared, so scope the
read (scenarios.md "Mailpit").

<a id="fn-s2"></a>
**s2** — Tokens placed in `abstract` and in a contributor's `familyName`
only; the capitals step relies on the database's case folding
(PostgreSQL `to_tsvector` lower-cases). Live-probed 2026-09-02 on all
three apps (fn-c). The French title: `title` as a locale map `{en: "The
publications of children about {token}", fr_CA: "… {frToken}"}` on a
context created with `supportedLocales` and `supportedSubmissionLocales`
both holding `fr_CA` beside `en` (scenarios.md "Multilingual fields" and
`POST scenarios/context`; the metadata locales follow
`supportedSubmissionLocales`), the visitor reading in English; the index
holds one row per locale and the query has no locale filter (fn-c, the
French-title probe of 2026-09-02). The real words "The", "publications",
"of", "children" in the first title and "The … study" in the second carry
the whole-word, common-word and punctuation steps, each of which fn-d
probed on 2026-09-02 ("publi", "publication", "child", "children", "the",
quotation marks, "AND", the hyphen). Strings as fn-s3.

<a id="fn-s3"></a>
**s3** — Strings: `search.noResults` "No Results" (OJS/OPS);
`catalog.noTitlesSearch` and `search.searchAgain` (OMP). Live-probed
2026-09-02 (fn-g). One published article with its own token is seeded as
the positive control (the suites already do so).

<a id="fn-s4"></a>
**s4** — The unpublished sibling: `createSubmission` with `submitted:
true`, `published: false`, the same token in its title; sign in as the
scratch journal's manager. Live-probed 2026-09-02 on all three apps
(fn-c).

<a id="fn-s5"></a>
**s5** — Unpublish through the workflow's publication area ("Unpublish";
OPS "Unpost"; *Publish, schedule & versions*); the removal needs no queue
drain (fn-k); the republish needs `runJobs()` before the visitor's second
search. Live-probed 2026-09-02 on all three apps (fn-k).

<a id="fn-s6"></a>
**s6** — 27 published articles sharing one token; page size is the
scratch context's `itemsPerPage` default 25. Strings `navigation.items`;
links from `smartyPageLinks()`. Live-probed 2026-09-02 on all three apps
(fn-g). The date-filter step (OJS/OPS): the articles are published on the
seed day, so the Year list holds that year alone; `dateFromYear` = the
current year, `dateFromMonth` = 1, `dateFromDay` = 1 chosen on the
selects; `smartyPageLinks()` forwards `dateFrom*`, and the "2" link kept
the selection in the 2026-09-02 probe (fn-g).

<a id="fn-s7"></a>
**s7** — The 1st and 15th of a past month, set through the workflow's
"Publication Settings" ("Publication Date" / OPS "Date Posted") before
"Publish" / "Post" by the scratch context's manager (`metadata.datePublished`
is not built, fn-s); choose all three parts of each filter (A1). The
"before the 10th" step is unaffected by A2. Live-probed 2026-09-02 on OJS
and OPS with 2024-06-01 and 2024-06-15 (fn-h). The empty-box step keeps
`dateTo*` set: the `->when($builder->query, …)` clause is skipped and the
`whereDate` stays (fn-e, fn-h). Month and Day without a Year:
`getUserDateVar()` returns null and the selects re-render blank (fn-h,
f-a1: "Sep + 2 … (no Year) → unfiltered, all three selects blank"). The
journal with nothing published: a second `POST scenarios/context` with no
submission at all, so `getDateBoundaries()` is empty and each Year list
yields a single blank entry (fn-h, the empty-journal probe of 2026-09-02).

<a id="fn-s8"></a>
**s8** — Two scratch journals, one article each; site-level address
`<host>/index/search` (or `<host>/index.php/index/search`; appending
`/index/search` to the home page's shown `…/index.php/index/en` gives
"404 Not Found", fn-i); `select#searchContext` "By Journal". Live-probed
2026-09-02 (fn-i, f-ojs2). The language-code step opens `<host>/` (which
lands on `…/index.php/index/en`) and then requests
`<host>/index.php/index/index/search`: "404 Not Found" (fn-i, re-checked
2026-09-02).

<a id="fn-s9"></a>
**s9** — Settings › Distribution › Access, publishing mode radio
`manager.distribution.publishingMode.none`; message
`user.authorization.journalDoesNotPublish`; a fresh scratch journal has no
radio checked, so "restore" means choosing open access. Live-probed
2026-09-02 (fn-l).

<a id="fn-s10"></a>
**s10** — `section.archiveHeader_search form.pkp_search` on `index` and
`preprints`; `submission.dates` string preceded by the download count.
Live-probed 2026-09-02 (fn-p).

<a id="fn-s11"></a>
**s11** — `catalog.browseTitles` renders "1 Titles" (no singular form);
`catalog.foundTitleSearch`; named anchor `search-form`. Live-probed
2026-09-02 (fn-g).

<a id="fn-s12"></a>
**s12** — Two published articles seeded as fn-s, the manager from the
context's `users[]`. On screen, as the manager: the workflow header's
"Return to Workflow" → "Confirm" (U24 #done), then "Decline Submission" →
"Record Decision" on the stage the article was published from (OPS:
Production; stage bubble "Declined"), then "Delete" ("Are you sure you
want to permanently delete this submission?"). The decline leaves the
publication `status = STATUS_PUBLISHED`, so the SQL still lists it on every
app; `article/view/{id}` still answers on OJS, while `catalog/book/{id}`
and `preprint/view/{id}` answered a visitor 404 in the suite runs of
2026-09-13 (fn-c, f-omp3, f-ops4), so the press and server expectations
end at the listing and the title's address; the delete cascades the
`submissions_fulltext` rows (`ON DELETE CASCADE`, fn-k), so the visitor's
"No Results" is read with no `runJobs()` in between. Live-probed
2026-09-02 on all three apps (fn-c, fn-k).

<a id="fn-f-a1"></a>
**f-a1** — fn-h: `getUserDateVar()` returns null when a part is missing,
and the display path re-selects the parts from a date one day earlier than
the chosen period. Live-probed 2026-09-02 on OJS and OPS: Year 2025 alone
→ unfiltered results, selects "2024" / "Nov" / "30"; 2025 + Jun → "2025" /
"May" / "31"; 2024 alone → blank Year / "Nov" / "30". Re-checked
2026-09-02 on OJS and OPS under both filters: 2026 + Day 2 with no Month →
unfiltered, selects blank Year / "Dec" / "2"; Sep + 2, Sep alone and Day 2
alone (no Year) → unfiltered, all three selects blank; 2026 + Sep →
"2026" / "Aug" / "31"; 2026 + Dec → "2026" / "Nov" / "30".
Issue report: [docs/issues/U15-A1-partial-date-filter-ignored.md](../issues/U15-A1-partial-date-filter-ignored.md), filed as [pkp-e2e#707](https://github.com/jardakotesovec/pkp-e2e/issues/707).

<a id="fn-f-a2"></a>
**f-a2** — fn-h: `whereDate(…, '<', $publishedTo)` versus the OpenSearch
`lte` range. Live-probed 2026-09-02: Published Before 2024 / Jun / 15 left
out the article published 2024-06-15; Published After the same day kept it.

<a id="fn-f-a3"></a>
**f-a3** — fn-k: the only dispatchers are the publish/unpublish listener,
the installer and the CLI; the pre-2025 `submissionMetadataChanged()` hook
on `Repo::publication()->edit()` has no successor. Multi-app rule 6: broke
in a modernization window (pkp/pkp-lib#8920, 2025-08) → decay, not choice.
Live-probed 2026-09-02 on all three apps: a title edited and saved on the
published version was shown in the result at once, but only the old word
found it, before and after a queue run.
Issue report: [docs/issues/U15-A3-published-edits-never-reach-search.md](../issues/U15-A3-published-edits-never-reach-search.md), filed as [pkp-e2e#704](https://github.com/jardakotesovec/pkp-e2e/issues/704).

<a id="fn-f-a4"></a>
**f-a4** — fn-j. Live-probed 2026-09-02: the order was neither date order,
and it was the same on every repetition, so the earlier "not necessarily
the same twice" wording was dropped.

<a id="fn-f-a5"></a>
**f-a5** — fn-d. The PostgreSQL side live-probed 2026-09-02 (all words
required; quotes, AND and OR change nothing); the MySQL/MariaDB side is
judgment from Laravel's `whereFullText` grammar.

<a id="fn-f-a6"></a>
**f-a6** — fn-e. Live-probed 2026-09-02 on all three apps.

<a id="fn-f-a7"></a>
**f-a7** — fn-k: `UpdateSubmissionSearchJob::handle()` loops
`$submission->getData('publications')` without a status filter; the
`newCollection()` status check is on the current publication only.
Live-probed 2026-09-02 on all three apps: after version 1.1 with a new
title word was published and the queue ran, the old title word still found
the article.

<a id="fn-f-a8"></a>
**f-a8** — fn-m. Live-probed 2026-09-02 by address on all three apps
(`author`, `title`, `abstract`, `body`, `orderBy=title` with
`orderDir`); the sort survived "2", `abstract` did not. The keyword,
subject, section, category, funder and reviewer parameters were not
exercised (fn-m); `orderBy=datePublished` is f-a12.

<a id="fn-f-a9"></a>
**f-a9** — fn-n. Judgment from a repository-wide grep; no screen to probe.
Issue report: [docs/issues/U15-A9-search-config-settings-do-nothing.md](../issues/U15-A9-search-config-settings-do-nothing.md), filed as [pkp-e2e#726](https://github.com/jardakotesovec/pkp-e2e/issues/726).

<a id="fn-f-a10"></a>
**f-a10** — fn-b, fn-f, fn-i: the OPS `search.tpl` copy lacks the
`searchContext` block and OMP's `searchForm_simple.tpl` has no select,
while `searchableContexts` is assigned by the shared handler on all three;
OMP's `monograph_summary.tpl` and OPS's `preprint_summary.tpl` render no
context name, while OJS's `article_summary.tpl` prints `journal` as the
subtitle outside a context. Live-probed 2026-09-02 on the site-wide page
of each app.

<a id="fn-f-a11"></a>
**f-a11** — `UpdateSubmissionSearchJob::handle()` collects galley files
with `Repo::submissionFile()->getCollector()->filterByAssoc(ASSOC_TYPE_REPRESENTATION,
[$publication->getId()])->filterByFileStages([SUBMISSION_FILE_PROOF])`,
i.e. by the publication's id, whereas a galley file's `assoc_id` is the
galley's own id; the two only coincide by accident, so `$bodies` stays
empty and `body` is never written. `SearchFileParser::fromFileType()` does
accept `text/plain` and `text/html`, so the parsers are not the cause.
Same job in all three checkouts, last touched by pkp/pkp-lib#8920
(2025-08-14); before the replacement `SubmissionSearchIndex` read galleys
by their own ids. Live-probed 2026-09-02 on all three apps: a plain-text
galley and an HTML galley each carrying a unique word were uploaded through
the workflow ("Add galley" → "Create New Galley" → the upload wizard; OMP:
a publication format with approved, available files), the article was
published and the queue run; both words gave "No Results" while the title
word found the article; on OJS and OPS the galleys were served to the
visitor from the landing page with the words inside.
Issue report: [docs/issues/U15-A11-galley-text-never-searched.md](../issues/U15-A11-galley-text-never-searched.md), filed as [pkp-e2e#703](https://github.com/jardakotesovec/pkp-e2e/issues/703).

<a id="fn-f-a12"></a>
**f-a12** — fn-m: `SubmissionSearchResult::builderFromRequest()` accepts
`orderBy=datePublished`, and `DatabaseEngine::buildQuery()` then joins
`publications AS cp` and orders by the bare `cp.date_published` inside a
grouped query, without the aggregate the title sort uses
(`MIN(title_current.setting_value)`); PostgreSQL rejects the statement.
Live-probed 2026-09-02 as a visitor: `…/search/search?query=&orderBy=datePublished&orderDir=desc`
and `…&orderDir=asc` answered "HTTP 500" on a journal (OJS) and a server
(OPS); `orderBy=title` with either direction listed the results sorted.
Not tried on a press.
Issue report: [docs/issues/U15-A12-search-sort-by-date-error-page.md](../issues/U15-A12-search-sort-by-date-error-page.md), filed as [pkp-e2e#718](https://github.com/jardakotesovec/pkp-e2e/issues/718).

<a id="fn-f-a13"></a>
**f-a13** — fn-g: `PKPHandler::getRangeInfo()` passes the raw
`searchPage` value into the page range (`new DBResultRange($count,
$pageNum)`), so a non-numeric value reaches the paginator unchecked. Live-probed 2026-09-02 as a visitor
on OJS, OMP and OPS: `…/search/search?query=uckaharbour&searchPage=abc`
answered status 500 with an empty body (a blank page, no text);
`searchPage=9` on a one-hit search answered "No Results" with the box
holding the word.
Issue report: [docs/issues/U15-A13-search-text-page-number-blank-page.md](../issues/U15-A13-search-text-page-number-blank-page.md), filed as [pkp-e2e#721](https://github.com/jardakotesovec/pkp-e2e/issues/721).

<a id="fn-f-a14"></a>
**f-a14** — fn-h: `SearchHandler::_assignDateFromTo()` builds the date
with `mktime()`, which rolls an out-of-range day forward, and
`PKPRequest::getUserDateVar()` accepts any day 1..31; the Day list is
`smartyHtmlSelectDateA11y()`'s fixed 1..31. Live-probed 2026-09-02 on OJS
and OPS with three articles published 2026-09-02, empty box: Published
After 2026 / Feb / 31 listed all three and the selects then read "2026",
"Mar", "3"; Published Before 2026 / Feb / 31 → "No Results", selects "2026",
"Mar", "3"; Published After 2026 / Sep / 31 → "No Results", selects "2026",
"Oct", "1"; Published Before 2026 / Sep / 31 listed all three, selects
"2026", "Oct", "1". Re-probed 2026-09-03 on OJS and OPS as a visitor,
empty box: "31 September" under either Published After or Published
Before re-rendered the selects as "2026", "Oct", "1" (OJS) and "2024",
"Oct", "1" (OPS), and "31 February" (a 28-day February) as "2026", "Mar",
"3" (OJS) and "2023", "Mar", "3" (OPS). The address kept the raw values
each time (`dateFromMonth=9&dateFromDay=31`, `dateToMonth=9&dateToDay=31`,
`dateFromMonth=2&dateFromDay=31`, `dateToMonth=2&dateToDay=31`) and no
validation message appeared on the page.

<a id="fn-f-a15"></a>
**f-a15** — fn-h: `Repo::publication()->getDateBoundaries()` takes MIN and
MAX `date_published` over the context's publications with no status
filter. Live-probed 2026-09-02 on OJS and OPS: on a journal whose Year
lists read blank, "2026", the Journal Manager set "Publication Date" (OPS
"Date Posted") of a never-published submission to 2024-03-15 and saved
("Saved"); the visitor's Year lists then read blank, "2024", "2025",
"2026" under both filters, while the results still listed the same three
published articles and the dated submission stayed unlisted. Whether a
formerly published article keeps its year after being unpublished was
not observed; the same query, with `unpublish()` leaving `date_published`
in place, points to yes.

<a id="fn-f-a16"></a>
**f-a16** — fn-i. The question was raised on 2026-09-02.

<a id="fn-f-ojs1"></a>
**f-ojs1** — fn-g: `templates/frontend/pages/search.tpl` passes `count`
to `search.searchResults.foundPlural`, whose `en` entry ("Found {$count}
items.") has no plural forms, so `translatePlural()` returns null and the
key prints as `##search.searchResults.foundPlural##`. Live-probed
2026-09-02 with 2, 3, 5, 7 and 25 results, on every page and on the bare
page; "Found one item." with one result.
Issue report: [docs/issues/U15-OJS1-OPS1-search-result-count-screen-reader.md](../issues/U15-OJS1-OPS1-search-result-count-screen-reader.md), filed as [pkp-e2e#725](https://github.com/jardakotesovec/pkp-e2e/issues/725).

<a id="fn-f-ojs2"></a>
**f-ojs2** — fn-g, fn-i: `smartyPageLinks()` forwards `searchContext`
but the value is read from the request only when a context is absent,
and the template does not re-select the chosen option. Live-probed
2026-09-02 on the OJS site-wide page: with "Scratch upcpage" chosen and an
empty box, page 1 read "1 - 25 of 28 items"; every page link carried an
empty journal choice; "2" read "26 - 43 of 43 items" and listed articles
from three journals; after every search (including one that gave "No
Results" for the other journal's word) the select showed its blank entry
while the address still carried the chosen journal. Re-checked 2026-09-02
on a fuller site (60 journals in the select): page 1 with "Scratch
upcpage" chosen read "1 - 25 of 28 items 1 2 > >>", the address carried
`searchContext=3`, every page link carried `searchContext=` empty, and "2"
read "26 - 50 of 175 items << < 1 2 3 4 5 6 7 > >>": the whole site's
listing.
Issue report: [docs/issues/U15-OJS2-by-journal-choice-lost-after-search.md](../issues/U15-OJS2-by-journal-choice-lost-after-search.md), filed as [pkp-e2e#708](https://github.com/jardakotesovec/pkp-e2e/issues/708).

<a id="fn-f-ojs3"></a>
**f-ojs3** — fn-l: a denied authorization policy redirects an anonymous
request to `login?source=…`, so the "does not publish" message is reached
only by signed-in users. Live-probed 2026-09-02: the visitor's address
became the Login page with the Search page as its source; Reader, Author,
Translator and Reviewer saw "This journal does not publish its content
online." (fn-l).

<a id="fn-f-omp1"></a>
**f-omp1** — fn-o: `$press` assigned, `$journal` filtered. Judgment from
the tool's source; not run.

<a id="fn-f-omp2"></a>
**f-omp2** — fn-b, fn-f, fn-g: `omp/templates/frontend/pages/search.tpl`
and `components/searchForm_simple.tpl`; OMP's handler and result classes
are empty subclasses, so the difference is entirely in the templates.
Live-probed 2026-09-02: count line, the three sentences, "Search again",
two-per-row summaries and the catalog link, as fn-g and fn-f record.

<a id="fn-f-omp3"></a>
**f-omp3** — fn-c, fn-s12. Suite run of 2026-09-13 on a scratch press,
and a hand probe the same day: after "Return to Workflow" → "Confirm",
"Decline Submission" → "Record Decision", the visitor's search still
listed the book with its title linking to `catalog/book/{id}`; that
address answered status 404 with the page "404 Not Found" (the run's page
snapshot holds the level-1 heading "404 Not Found" and nothing else). The
same address had answered 200 with the book's title before the decline,
and answered 200 to the signed-in Press Manager after it. Mechanism not
traced; the decline leaves the publication's status published (fn-s12),
so the catalog page's own gate, not the index, refuses the visitor.
Issue report: [docs/issues/U15-OMP3-OPS4-returned-item-gone-search-still-lists.md](../issues/U15-OMP3-OPS4-returned-item-gone-search-still-lists.md), filed as [pkp-e2e#709](https://github.com/jardakotesovec/pkp-e2e/issues/709).

<a id="fn-f-ops1"></a>
**f-ops1** — fn-g: `{if $results->count > 1}` reads a property the
paginator does not have. Live-probed 2026-09-02: "Found one item." with 1,
3, 7 and 25 results.
Issue report: [docs/issues/U15-OJS1-OPS1-search-result-count-screen-reader.md](../issues/U15-OJS1-OPS1-search-result-count-screen-reader.md), filed as [pkp-e2e#725](https://github.com/jardakotesovec/pkp-e2e/issues/725).

<a id="fn-f-ops2"></a>
**f-ops2** — fn-l: the policy's message key exists in no `.po` file of the
OPS checkout (grep 2026-09-02, `locale/` and `lib/pkp/locale/`), and
`ops/schemas/context.json` has no `publishingMode`, so
`OpsServerMustPublishPolicy` and the archive form's `{if}` compare against
a value that is never stored. Live-probed 2026-09-02: "Posting Mode" set to
"OPS will not be used to post the server's contents online." and saved
("Saved"); after reload neither radio checked, the save response without
the setting; every actor got the Search page and the archive box, no
`##…##` text anywhere. The gated state was not reached.

<a id="fn-f-ops3"></a>
**f-ops3** — fn-o: `$server` assigned, `$journal` filtered. Judgment from
the tool's source; not run.

<a id="fn-f-ops4"></a>
**f-ops4** — fn-c, fn-s12. Suite run of 2026-09-13 on a scratch server,
seen once: after "Return to Workflow" → "Confirm" and, on the Production
stage, "Decline Submission" → "Record Decision" (stage bubble "Declined"),
the visitor's search still listed the preprint with its title linking to
`preprint/view/{id}`; that address answered 404 with the page "404 Not
Found" (the run's page snapshot holds the level-1 heading "404 Not Found"
and nothing else), where an undeclined preprint's `preprint/view/{id}` had
answered 200 earlier in the same run. Not read as the signed-in Preprint
Server Manager. Mechanism not traced (f-omp3).
Issue report: [docs/issues/U15-OMP3-OPS4-returned-item-gone-search-still-lists.md](../issues/U15-OMP3-OPS4-returned-item-gone-search-still-lists.md), filed as [pkp-e2e#709](https://github.com/jardakotesovec/pkp-e2e/issues/709).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Search page (in a journal) | `{journal}/search` · `{journal}/search/search` (the form posts to the page's own address) | ROUTE-024 · ROUTE-048 (OJS) · ROUTE-067 (OMP) · ROUTE-083 (OPS) · AFFR-083, 084 (OJS/OPS form and results) · AFFR-085 (OMP page) |
| Site-wide Search page | `index/search` (`index.php/index/search` without URL rewriting; the page lands on `index.php/index/{locale}/search`) | ROUTE-024 |
| Header "Search" link | every context page, `header.tpl` (owned by *Navigation menus & site chrome*) | AFFR-007 (cited) |
| Preprint-server archive header search box | server home · `preprints` (archive header owned by *Sections*; search-form portion cited here) | AFFR-078 (rider) · AFFR-027 (home-page include, owned by *Appearance & theming*) |
| Address-only refinements | query parameters listed in fn-m | ROUTE-024 |
| Dead op | `search/similarDocuments` (OJS, OPS): routed, not implemented | ROUTE-048 · ROUTE-083 |
| Config | `config.inc.php` `[search]` | SET-054 |
| Index refresh job | `UpdateSubmissionSearchJob`, queued by publish/unpublish | JOB-027 |
| Index rebuild | `php tools/rebuildSearchIndex.php [journal_path]` | CLI-029 (reference only, per the CLI ruling) |

## Reference — code anchors

- `lib/pkp/pages/search/SearchHandler.php` — the page; `<app>/pages/search/SearchHandler.php` (OJS/OPS: must-publish policy; OMP: empty), `<app>/pages/search/index.php`
- `lib/pkp/classes/search/SubmissionSearchResult.php` — request → builder → result rows; `<app>/classes/search/SubmissionSearchResult.php` (OJS: issue availability; OMP/OPS: empty)
- `lib/pkp/classes/search/engines/DatabaseEngine.php` · `OpenSearchEngine.php` — the two drivers
- `lib/pkp/classes/search/parsers/SearchFileParser.php` · `SearchHTMLParser.php` · `SearchHelperParser.php` — galley text extraction
- `lib/pkp/jobs/submissions/UpdateSubmissionSearchJob.php` · `lib/pkp/classes/observers/listeners/UpdateSubmissionInSearchIndex.php` — the refresh
- `lib/pkp/classes/migration/install/SubmissionSearchMigration.php` · `upgrade/v3_6_0/I8920_ReplaceSearchEngine.php` — the `submissions_fulltext` table
- `<app>/tools/rebuildSearchIndex.php` · `lib/pkp/classes/install/Installer.php::rebuildSearchIndex()`
- Templates: `ojs/templates/frontend/pages/search.tpl`, `ops/templates/frontend/pages/search.tpl` (copies), `omp/templates/frontend/pages/search.tpl` + `components/searchForm_simple.tpl`, `ops/templates/frontend/components/archiveHeader.tpl` + `searchForm_archive.tpl`, `lib/pkp/templates/frontend/components/header.tpl`; `PKPTemplateManager::smartyHtmlSelectDateA11y()`, `smartyPageInfo()`, `smartyPageLinks()`
- `<app>/classes/security/authorization/OjsJournalMustPublishPolicy.php` · `OpsServerMustPublishPolicy.php`
- `config.TEMPLATE.inc.php` `[search]` (identical in the three apps)
