/**
 * Wraps a generated web app in Capacitor and produces a signed .aab.
 *
 * HARD PREREQUISITE, read before using this: this runs inside an E2B
 * sandbox created from a CUSTOM TEMPLATE with the Android SDK, a JDK,
 * and Gradle already installed. A stock E2B sandbox is a bare Linux VM
 * — installing the Android SDK fresh on every build (several GB, plus
 * license acceptance) would make every build take 10+ minutes and be
 * fragile. Build the template once with E2B's template CLI
 * (`e2b template build`, using a Dockerfile that installs
 * `cmdline-tools`, `platform-tools`, `build-tools;34.0.0`,
 * `platforms;android-34`, and a JDK 17), then set
 * E2B_ANDROID_TEMPLATE_ID to that template's ID. This module refuses to
 * run without it rather than silently falling back to a slow/incomplete
 * environment.
 *
 * Two input shapes are supported:
 *  - website-mode: a single `index.html` — no build step, wrapped as-is.
 *  - app-mode frontend: a full React project (package.json + source).
 *    This assumes it has a `build` script that outputs to `dist/`
 *    (Vite's default). app-bot.js's frontend system prompt doesn't
 *    currently guarantee this — if you change the frontend bot's output
 *    convention, update `webDir` below to match.
 */

const { Sandbox } = require("e2b");

function buildCapacitorConfig(appId, appName, webDir) {
  return JSON.stringify(
    { appId, appName, webDir, bundledWebRuntime: false },
    null,
    2
  );
}

async function buildAndroidBundle(files, { appId, appName = "Gurost App" }) {
  const templateId = process.env.E2B_ANDROID_TEMPLATE_ID;
  if (!templateId) {
    throw new Error(
      "E2B_ANDROID_TEMPLATE_ID not configured — Android builds require a custom E2B template with the Android SDK/JDK/Gradle preinstalled. See README's Android Build section."
    );
  }
  const keystoreB64 = process.env.ANDROID_KEYSTORE_BASE64;
  const keystorePass = process.env.ANDROID_KEYSTORE_PASSWORD;
  const keyAlias = process.env.ANDROID_KEY_ALIAS;
  const keyAliasPass = process.env.ANDROID_KEY_ALIAS_PASSWORD;
  if (!keystoreB64 || !keystorePass || !keyAlias || !keyAliasPass) {
    throw new Error(
      "Missing Android signing config — set ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_ALIAS_PASSWORD. This is your own keystore, generated and kept by you — there is no way to provide a working default."
    );
  }

  const isFullProject = files.some((f) => f.path.endsWith("package.json"));
  const webDir = isFullProject ? "dist" : "www";

  const sandbox = await Sandbox.create(templateId, { timeoutMs: 15 * 60 * 1000 });
  const logs = [];

  try {
    // Write source files
    for (const file of files) {
      await sandbox.files.write(`project/${isFullProject ? file.path : `www/${file.path}`}`, file.content);
    }

    // Website-mode has no package.json — synthesize a minimal one so
    // `npm install` and `npx cap` have something to work with.
    if (!isFullProject) {
      await sandbox.files.write(
        "project/package.json",
        JSON.stringify({ name: "gurost-wrapped-site", version: "1.0.0", private: true }, null, 2)
      );
    }

    await sandbox.files.write("project/capacitor.config.json", buildCapacitorConfig(appId, appName, webDir));
    await sandbox.files.write("project/keystore.b64", keystoreB64);

    const run = async (cmd, opts = {}) => {
      const result = await sandbox.commands.run(cmd, { cwd: "project", timeoutMs: 10 * 60 * 1000, ...opts });
      logs.push({ cmd, exitCode: result.exitCode, stderr: result.stderr?.slice(0, 800) });
      if (result.exitCode !== 0) {
        throw new Error(`Command failed: ${cmd}\n${result.stderr?.slice(0, 1500)}`);
      }
      return result;
    };

    if (isFullProject) {
      await run("npm install");
      await run("npm run build"); // must produce ./dist — see file header note
    }

    await run("base64 -d keystore.b64 > keystore.jks");
    await run("npm install --no-save @capacitor/core @capacitor/cli @capacitor/android");
    await run("npx cap add android");
    await run("npx cap sync android");
    await run(
      `npx cap build android --keystorepath ../keystore.jks --keystorepass "${keystorePass}" ` +
      `--keystorealias "${keyAlias}" --keystorealiaspass "${keyAliasPass}" --androidreleasetype AAB`
    );

    const aabPath = "project/android/app/build/outputs/bundle/release/app-release.aab";
    const aabContent = await sandbox.files.read(aabPath, { format: "base64" });

    return { aabBase64: aabContent, logs };
  } finally {
    await sandbox.kill().catch(() => {});
  }
}

module.exports = { buildAndroidBundle };
