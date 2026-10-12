# Mobile app roadmap (Phase 2 and later)

Written 2026-10-12 (Web Claude), approved by Irfan the same evening. Plain English. **Nothing in this file is built for customers yet**,
except a first, never-run Android path in the code (section 2). Do not promise any of it before the stage that delivers it is marked proven.

## 0. The decision

- **Accepted:** web app first, then a wrapper that puts that web app in a mobile shell (Capacitor), in this order:
  **installable web app (PWA), then Android, then iPhone**.
- **Accepted:** React Native (Expo) only if customers ask.
- **Rejected for now:** separate Flutter, native iOS (Swift) and native Android (Kotlin) pipelines. Each is months of work (its own build
  tools, no live preview, a compile-and-fix loop our current checks cannot do), and the quality would be unproven.
- **When:** Phase 2, after the Website Builder and the web App Builder have launched. The priority rule in `CLAUDE.md` stands.

## 1. What we say today, and what we do not

| We can say | We must not say |
|---|---|
| "Gurost builds web apps." | "Gurost builds native iPhone or Android apps." |
| "Your app can be installed from the browser." (only after stage 1 below is built and tested) | "Your app will be on the App Store." |
| "We are working on putting your web app in the stores." (only if true on the day) | "McDonald's-level animation." Smooth, professional animation is the claim; hand-crafted, studio-grade motion is custom engineering, not a prompt result. |

## 2. What exists in the code today

- `lib/android-build.js`: wraps a generated web app in Capacitor and builds a signed Android bundle (.aab) inside an E2B sandbox
  from a custom template (Android SDK, JDK, Gradle). Route: `POST /api/mobile/android/build`.
- `lib/google-play.js`: uploads to Google Play (internal testing track by default).
- **Never run for real.** Needs `E2B_ANDROID_TEMPLATE_ID`, the signing key settings, and the app listing created by hand in Play Console once
  (Google's API cannot create a new listing). The app front end must have a `build` script that outputs to `dist/`; the App Builder does not
  guarantee that yet.
- Nothing for iPhone. No icons or screenshots are generated anywhere.

## 3. The stages

Effort is working days of Web Claude, excluding waiting for stores and for Irfan's accounts. These are estimates, not promises.

### Stage 1: Installable web app (PWA). 1 to 2 days
What it is: a web manifest, an icon set and a small service worker so the published site or app can be added to the home screen and open full-screen.
Works best on Android; on iPhone it is "Add to Home Screen" from Safari, with fewer features.
Done when: a built site passes the installability checks in a real browser and installs on a real phone (screenshot).
Honest limit: it is not "on the App Store".

### Stage 2: Android through Capacitor. 2 to 4 days to prove, once accounts exist
Work: build the E2B Android template once; make the App Builder frontend output a `build` script to `dist/`; run the existing path on one test app;
fix what breaks; add the plain-words steps for the customer (their Google Play account, their signing key, first upload by hand).
Needs from Irfan: a Google Play developer account (one-time fee), a keystore he keeps backups of, the E2B template ID.
Done when: a signed bundle from a real build installs on a real Android phone and is accepted on Play's internal testing track.
Principle check: **the customer's own store account and their own signing key** ("the user gets all keys").

### Stage 3: iPhone through Capacitor. 1 to 2 weeks, plus Apple's waiting times
Work: iPhone builds need a Mac in the loop (a rented cloud Mac or a hosted build service); signing with the customer's Apple certificates;
the same wrapper plus the native features Apple expects (section 4); fastlane-style automation for icons, screenshots and upload.
Needs: an Apple developer account for the customer (and for Gurost if we ever publish our own app).
Done when: a real build is accepted by TestFlight, then by App Review, with the native features in place.
Risk: Apple rule 4.2 (section 4). A wrapper that is just a website is rejected. This stage can fail review even when the build works.

### Stage 4: React Native with Expo. Only if customers ask. 4 to 8 weeks
It is a second App Builder, not a switch: our generated React web code cannot be reused as React Native screens. Expo's cloud build service can build
iPhone apps without owning a Mac. Decide with data (how many customers ask, what they would pay).

### Never (for now)
Separate Flutter, Swift and Kotlin pipelines. Revisit only after Stage 3 has paying customers and a clear reason a wrapper cannot do the job.

## 4. Facts for sales copy (store the wording; verify the numbers on the day you publish)

Fees and timings change. These were read on 2026-10-12 from vendor guides ([store submission guide](https://abratabia.com/native-wrappers/app-store-submission.php),
[VP0 on Lovable](https://vp0.com/blogs/can-lovable-publish-to-app-store.md)), not from Apple or Google directly. Re-check on apple.com/developer and
play.google.com/console before putting a number in public copy.

| Fact | Detail |
|---|---|
| Apple developer programme | $99 per year |
| Google Play developer account | $25, one time |
| Apple App Review time | Usually 1 to 3 days (Irfan noted 1 to 2); longer when an app is flagged |
| Apple company (organisation) account | Identity check, up to about 2 weeks. An individual account is usually 1 to 3 days. |
| Google review | Usually a few hours to a day; a new personal Play account may have to run a closed test with testers for a period before it can publish publicly (see `lib/google-play.js` notes) |
| **Apple rule 4.2** | Apps must not simply be repackaged websites. A bare wrapper is a classic rejection. |
| Native features Apple expects | At minimum a few real ones: **push notifications, camera, files stored on the phone (offline use), a settings screen**; also share, deep links |
| Other rejection causes | missing privacy policy, wrong content rating or privacy answers, crashes during review, payment rules for digital goods |
| Store assets | 1024x1024 icon, screenshots in the required sizes, description, privacy policy URL |
| **Whose accounts** | **The store accounts and signing keys must be the customer's own.** This is what keeps "you own your app" true. |

Honest sales wording suggestion: "We build your web app and prepare it for the stores. You own the store accounts, the signing keys and the code.
Apple decides whether to approve it; we cannot promise approval or a date."

## 5. What Gurost still has to build for the stages above

- Plain-words store checklist per customer (accounts, fees, privacy policy, assets), shown in the admin Guide style.
- Generated icons and screenshots (none exist today).
- A "native features" option in the App Builder so a wrapped app clears rule 4.2 (push, camera, offline, settings).
- Per-user GitHub or zip export (Phase 2 "Gap 2" in `CLAUDE.md`) so the customer holds the code before any store step.
- Honest error messages for each failed step (a failed Apple signing step must say what the customer does next).

## 6. Open-source tools worth using (check each licence before depending on it)

Capacitor (the wrapper, already in the code), Expo with EAS Build (React Native cloud builds), fastlane (signing, screenshots, upload to both stores),
PWABuilder and Bubblewrap (Android packaging of a PWA), Codemagic or GitHub's Mac runners (iPhone builds without owning a Mac), Fastlane match or similar for
certificates. Flutter is free but is a separate pipeline, so it is out of scope.

## 7. What others do (so we do not oversell)

Bolt generates React Native (Expo) code but cannot build or publish; the customer runs the cloud build and the store steps themselves. Lovable builds web
apps; guides describe wrapping them or rebuilding in React Native. v0 is, as far as I know, web only (not confirmed). None ships a store-ready app by itself,
so a guided, honest path is a real advantage if we deliver it.
