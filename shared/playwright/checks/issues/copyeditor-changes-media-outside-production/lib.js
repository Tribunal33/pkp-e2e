// Helpers of walk.js (issue report docs/issues/U47-A8-copyeditor-changes-media-outside-production.md).
// Requiring this file runs nothing. The "Media" page offers its changes only to a role on the
// submission's Production stage, so a Copyeditor working in Copyediting is offered no control for
// them (a journal: no "Media" in the side menu; a press: the list with no buttons). These helpers
// send, as the signed-in role, exactly the write requests the "Media" page sends for a role it does
// offer (the API-not-on-any-screen exception, REPORT.md "Steps"): add, edit, link, delete.
const fs = require('fs');

const flat = (s, n = 300) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The signed-in session's CSRF token, read from the page the UI reads it from. */
async function csrf(page) {
    const token = await page.evaluate(() => {
        const pkp = window.pkp || ((window.$ || {}).pkp);
        return (pkp && pkp.currentUser && pkp.currentUser.csrfToken) || null;
    });
    if (!token) throw new Error('no CSRF token on the page — is it signed in on a back-office page?');
    return token;
}

/** The context's REST base for the signed-in session. */
function apiBase(app, submissionId, publicationId) {
    return `${app.baseURL}/index.php/${app.contextPath}/api/v1/submissions/${submissionId}/publications/${publicationId}/mediaFiles`;
}

/** The body and status of a response, body parsed when it is JSON. */
async function answer(response) {
    const status = response.status();
    const text = await response.text().catch(() => '');
    let json = null;
    try {
        json = JSON.parse(text);
    } catch (e) {
        // not JSON
    }
    const error = json && (json.error || json.errorMessage) ? json.error || json.errorMessage : null;
    return {status, error, head: json ? null : flat(text, 200)};
}

/** Upload a file to the temporary-files endpoint in the signed-in session; returns its id. */
async function uploadTemp(page, app, filePath) {
    const token = await csrf(page);
    const url = `${app.baseURL}/index.php/${app.contextPath}/api/v1/temporaryFiles`;
    const response = await page.request.post(url, {
        headers: {'X-Csrf-Token': token},
        multipart: {file: {name: require('path').basename(filePath), mimeType: 'image/png', buffer: fs.readFileSync(filePath)}},
    });
    const a = await answer(response);
    if (response.status() !== 200) throw new Error(`temporaryFiles upload answered ${a.status}: ${JSON.stringify(a)}`);
    const body = JSON.parse(await response.text());
    return body.id;
}

/** The media files listed by the GET endpoint for the signed-in session (id -> name). */
async function listMedia(page, app, submissionId, publicationId) {
    const token = await csrf(page);
    const response = await page.request.get(apiBase(app, submissionId, publicationId) + `?csrfToken=${encodeURIComponent(token)}`);
    if (response.status() !== 200) return {status: response.status(), items: null};
    const body = JSON.parse(await response.text());
    const items = (Array.isArray(body) ? body : body.items || []).map((f) => ({
        id: f.id,
        name: f.name && typeof f.name === 'object' ? Object.values(f.name)[0] : f.name,
        variantType: f.variantType,
        variantGroupId: f.variantGroupId,
    }));
    return {status: 200, items};
}

/** POST add: upload a temp file, then post it with the genre/variant the UI uses. */
async function mediaAdd(page, app, {submissionId, publicationId, filePath, genreId, name, locale, variantType = 'web'}) {
    const temporaryFileId = await uploadTemp(page, app, filePath);
    const token = await csrf(page);
    const entry = {temporaryFileId, variantType, name: {[locale]: name}};
    if (genreId != null) entry.genreId = genreId;
    const response = await page.request.post(apiBase(app, submissionId, publicationId), {
        headers: {'X-Csrf-Token': token},
        data: {files: [entry]},
    });
    const a = await answer(response);
    if (a.status === 200) {
        const body = JSON.parse(await response.text());
        a.createdId = Array.isArray(body) && body[0] ? body[0].id : null;
    }
    return a;
}

/** PUT edit: a new "Name of the file". */
async function mediaEdit(page, app, {submissionId, publicationId, fileId, name, locale}) {
    const token = await csrf(page);
    const response = await page.request.put(apiBase(app, submissionId, publicationId) + `/${fileId}`, {
        headers: {'X-Csrf-Token': token},
        data: {name: {[locale]: name}},
    });
    return answer(response);
}

/** PUT /{id}/link: pair a web file with a high-resolution one (a real relink), as "Manually Link
 * Media" does. Source and target must be media files of different resolutions. */
async function mediaLinkReal(page, app, {submissionId, publicationId, fileId, targetFileId}) {
    const token = await csrf(page);
    const response = await page.request.put(apiBase(app, submissionId, publicationId) + `/${fileId}/link`, {
        headers: {'X-Csrf-Token': token},
        data: {targetSubmissionFileId: targetFileId},
    });
    return answer(response);
}

/** DELETE a media file. */
async function mediaDelete(page, app, {submissionId, publicationId, fileId}) {
    const token = await csrf(page);
    const response = await page.request.delete(apiBase(app, submissionId, publicationId) + `/${fileId}`, {
        headers: {'X-Csrf-Token': token},
    });
    return answer(response);
}

/** PUT a publication's title (the metadata gate the Copyeditor legitimately holds at Copyediting). */
async function publicationEdit(page, app, {submissionId, publicationId, title, locale}) {
    const token = await csrf(page);
    const url = `${app.baseURL}/index.php/${app.contextPath}/api/v1/submissions/${submissionId}/publications/${publicationId}`;
    const response = await page.request.put(url, {
        headers: {'X-Csrf-Token': token},
        data: {title: {[locale]: title}},
    });
    return answer(response);
}

module.exports = {flat, csrf, listMedia, uploadTemp, mediaAdd, mediaEdit, mediaLinkReal, mediaDelete, publicationEdit};
