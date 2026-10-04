// Helpers for the comments-page-tab-no-page-name walk. Requiring this file
// runs nothing.

/**
 * The app's reader-comments page objects, with the one call whose name
 * differs between the apps (the side menu's Content › Comments) behind a
 * common `openCommentsFromMenu(page)`. Required inside forEachApp's fn
 * (base-test reads PKP_APP_ROOT).
 *
 * @param {object} app the probe bag
 */
function commentsPages(app) {
    const po = require(`../../../../../apps/${app.name}/playwright/pages/ReaderCommentsPages.js`);
    const openCommentsFromMenu = async (page) => {
        if (po.SideMenu) {
            await new po.SideMenu(page).openComments();
        } else {
            await new po.EditorialSideMenu(page).pressContentComments();
        }
    };
    return {
        settings: (page) => new po.CommentsSettingsTab(page, app.contextPath),
        comments: (page) => new po.CommentsPage(page, app.contextPath),
        openCommentsFromMenu,
    };
}

module.exports = {commentsPages};
