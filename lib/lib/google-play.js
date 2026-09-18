/**
 * Google Play Developer API (androidpublisher v3) upload flow.
 *
 * HARD PREREQUISITES, not solvable by this code:
 *  1. The app must already exist in Play Console under this exact
 *     packageName. Google's API cannot create a new app listing — the
 *     first-ever release of any app must be uploaded through the Play
 *     Console UI manually, once. This function handles updates to an
 *     app that already exists, not initial publication.
 *  2. The service account (whose JSON key the user provides) must be
 *     invited under Play Console > Users and permissions, with at least
 *     "Release to testing tracks" permission on this specific app. A
 *     freshly created service account has no Play Console access by
 *     default — this is a manual one-time grant on the user's side.
 *  3. Defaults to the "internal" testing track, not "production". A
 *     brand-new personal Play developer account is required by Google
 *     to run a closed test with 12 testers for 14 days before it can
 *     publish to production at all — defaulting to internal avoids
 *     silently attempting something Google will reject anyway. Pass
 *     track: "production" explicitly once the account is past that gate.
 *  4. Screenshots are NOT generated anywhere in this codebase. If you
 *     pass `listing.screenshots`, they must already exist as image
 *     buffers from somewhere else — there's no image-generation step
 *     here to produce them.
 */

const { google } = require("googleapis");
const { Readable } = require("stream");

function getAuthClient(serviceAccountJson) {
  let credentials;
  try {
    credentials = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  } catch (err) {
    throw new Error("Invalid service account JSON.");
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"]
  });
}

async function uploadToPlayStore({
  packageName,
  serviceAccountJson,
  aabBase64,
  track = "internal",
  releaseNotes,
  listing // optional: { language, title, shortDescription, fullDescription }
}) {
  const auth = getAuthClient(serviceAccountJson);
  const androidpublisher = google.androidpublisher({ version: "v3", auth });

  const edit = await androidpublisher.edits.insert({ packageName });
  const editId = edit.data.id;

  try {
    const aabBuffer = Buffer.from(aabBase64, "base64");
    const bundleUpload = await androidpublisher.edits.bundles.upload({
      packageName,
      editId,
      media: { mimeType: "application/octet-stream", body: Readable.from(aabBuffer) }
    });
    const versionCode = bundleUpload.data.versionCode;

    await androidpublisher.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: {
        track,
        releases: [
          {
            versionCodes: [versionCode],
            status: "completed",
            releaseNotes: releaseNotes
              ? [{ language: "en-US", text: releaseNotes.slice(0, 500) }]
              : undefined
          }
        ]
      }
    });

    // Listing text must be set within this same edit, before commit —
    // there's no way to attach it to an edit that's already been
    // committed and closed.
    if (listing) {
      const language = listing.language || "en-US";
      await androidpublisher.edits.listings.update({
        packageName,
        editId,
        language,
        requestBody: {
          language,
          title: listing.title,
          shortDescription: listing.shortDescription,
          fullDescription: listing.fullDescription
        }
      });
    }

    await androidpublisher.edits.commit({ packageName, editId });

    return { editId, track, versionCode, status: "submitted" };
  } catch (err) {
    // Best-effort cleanup — an uncommitted edit left dangling blocks the
    // next attempt from inserting a new one until it expires on its own.
    await androidpublisher.edits.delete({ packageName, editId }).catch(() => {});
    throw new Error(`Google Play upload failed: ${err.message}`);
  }
}

module.exports = { uploadToPlayStore };
