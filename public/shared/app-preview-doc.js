/**
 * Builds the HTML document that runs a generated React app (its own files
 * plus React, no bundler). One source for two uses: the App Builder's live
 * preview (loaded by the page) and the preview.html in the downloaded zip
 * (required by wrapper.js).
 */
(function (root) {
function findEntryFile(frontendFiles) {
  return (
    frontendFiles.find((f) => /(^|\/)App\.(jsx|js)$/i.test(f.path)) ||
    frontendFiles.find((f) => /app/i.test(f.path)) ||
    frontendFiles[0]
  );
}

// A file with nothing in it, or only "line 0 / line 1 / ..." filler or a bare "...", is not a screen.
// Same rule as lib/file-blocks.js (this file runs in the browser, so it keeps its own copy).
function isFillerFile(file) {
  const content = file && file.content;
  const lines = String(content == null ? '' : content).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return !lines.length || lines.every((l) => /^(line\s*\d+\s*:?|\.{3}|…)$/i.test(l));
}

const EMPTY_PREVIEW = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:Inter,system-ui,sans-serif;background:#FAFAF9;color:#1A1A2E">'
  + '<div data-gurost-empty="true" style="padding:40px 24px;max-width:520px;margin:auto;text-align:center">'
  + '<h2 style="font-size:18px;margin:0 0 8px">This app has no screens to show yet</h2>'
  + '<p style="font-size:14px;color:#6B7280;margin:0">The build did not produce a usable app screen. Try building it again.</p></div></body></html>';

function buildPreviewDocument(frontendFiles, options) {
  // Filler files can never be the app: drop them before the entry is chosen, and say so
  // plainly when nothing real is left, rather than showing a blank or broken screen.
  const dropped = (Array.isArray(frontendFiles) ? frontendFiles : []).filter(isFillerFile);
  if (dropped.length && typeof console !== 'undefined') console.warn('[app-preview] Ignored ' + dropped.length + ' empty or placeholder file(s): ' + dropped.map((f) => f && f.path).join(', '));
  frontendFiles = (Array.isArray(frontendFiles) ? frontendFiles : []).filter((f) => !isFillerFile(f));
  if (!frontendFiles.length) return EMPTY_PREVIEW;
  // standalone: the copy that ships in the downloaded zip, opened from a file.
  const noBackend = JSON.stringify(options && options.standalone
    ? 'This page shows the app\'s interface only. Start the backend (see README.md) and serve the frontend from it to connect real data.'
    : 'No live backend in this preview — deploy the app to connect real data.').replace(/</g, '\\u003c');
  const entry = findEntryFile(frontendFiles);
  // Embedded in a script tag: "<" as <, so a generated file holding a
  // closing script tag (an index.html, say) can't end the script early and
  // spill the preview's own code onto the page (seen 2026-10-05).
  const filesJson = JSON.stringify(frontendFiles).replace(/</g, '\\u003c');
  const entryPath = JSON.stringify(entry ? entry.path : '').replace(/</g, '\\u003c');

  // Everything below runs INSIDE the iframe, isolated from this page.
  // Tailwind CDN is used here deliberately, not as an oversight — the
  // generated JSX uses arbitrary, unpredictable Tailwind classes each
  // time (app-bot.js's prompt tells Claude to use Tailwind), so there's
  // no fixed class list to pre-build a static stylesheet from the way
  // every OTHER page in this project does. Guarded so a failed CDN load
  // degrades to unstyled-but-functional rather than a crash, same
  // lesson as everywhere else this was an issue.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<script>window.addEventListener('error', function(){}, true);<\/script>
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
<div id="root" style="font-family: Inter, sans-serif; padding: 8px;"></div>
<!-- Real API Key Collection Modal - hidden by default -->
<div class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" id="apiKeyModal">
<div class="bg-white rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
<h2 class="font-headline-lg text-headline-lg text-on-surface mb-2">Real API Keys Needed</h2>
<p class="font-body-md text-on-surface-variant text-sm mb-6">Your app uses these real services — add your own keys so it actually works once deployed.</p>
<div id="apiKeyFields"></div>
<p class="hidden text-red-600 text-sm mb-4" id="apiKeyModalError"></p>
<div class="flex gap-3 mt-6">
<button class="flex-1 border border-outline-variant rounded-full py-2 font-label-sm text-label-sm" id="apiKeyModalCancel" type="button">Cancel</button>
<button class="flex-1 bg-gradient-to-r from-gold-gradient-start to-gold-gradient-end text-on-secondary rounded-full py-2 font-label-sm text-label-sm font-semibold" id="apiKeyModalSubmit" type="button">Save &amp; Deploy</button>
</div>
</div>
</div>
<script>
(function () {
  var FILES = ${filesJson};
  var ENTRY_PATH = ${entryPath};

  function renderError(message) {
    document.getElementById('root').innerHTML =
      '<div style="padding:24px;color:#ba1a1a;font-family:monospace;font-size:13px;white-space:pre-wrap;">' +
      'Preview could not render this app:\\n\\n' + message +
      '\\n\\nThe generated source itself is still real and correct — check the Code tab to see it directly.' +
      '</div>';
  }

  if (typeof Babel === 'undefined' || typeof React === 'undefined') {
    renderError('A required script (React or Babel) failed to load, likely a network issue in this preview environment.');
    return;
  }

  // Intercept relative fetches — there is no live backend during
  // preview (see this page's own script for the full explanation).
  var realFetch = window.fetch;
  window.fetch = function (url, opts) {
    var isRelative = typeof url === 'string' && !(new RegExp('^https?://', 'i')).test(url);
    if (isRelative) {
      return Promise.resolve({
        ok: false,
        status: 503,
        json: function () { return Promise.resolve({ error: ${noBackend} }); },
        text: function () { return Promise.resolve(${noBackend}); }
      });
    }
    return realFetch(url, opts);
  };

  function normalizePath(fromDir, importPath) {
    var parts = (fromDir + '/' + importPath).split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '' || p === '.') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    return stack.join('/');
  }

  function dirname(path) {
    var i = path.lastIndexOf('/');
    return i === -1 ? '' : path.substring(0, i);
  }

  var registry = {}; // normalized path (no extension) -> raw source
  FILES.forEach(function (f) {
    var noExt = f.path.replace(/\\.(jsx|js)$/i, '');
    registry[noExt] = f.content;
  });

  var cache = {};

  // Stylesheets the app ships (src/styles/main.css and the like) apply to the preview.
  FILES.forEach(function (f) {
    if (/\\.css$/i.test(f.path)) {
      var st = document.createElement('style');
      st.setAttribute('data-from', f.path);
      st.textContent = f.content;
      document.head.appendChild(st);
    }
  });

  function requireModule(path) {
    if (cache[path]) return cache[path].exports;

    var source = registry[path];
    if (source === undefined) {
      throw new Error('Cannot resolve import "' + path + '" — no generated file matches it.');
    }

    // A stylesheet imported from JS: already applied above, nothing to run.
    if (/\\.css$/i.test(path)) { cache[path] = { exports: {} }; return {}; }

    var transpiled;
    try {
      transpiled = Babel.transform(source, {
        presets: [['env', { modules: 'commonjs' }], 'react'],
        filename: path
      }).code;
    } catch (err) {
      throw new Error('Failed to compile ' + path + ': ' + err.message);
    }

    var module = { exports: {} };
    cache[path] = module;

    var localRequire = function (importPath) {
      // React comes from the page itself.
      if (importPath === 'react') return window.React;
      if (importPath === 'react-dom' || importPath === 'react-dom/client') return window.ReactDOM;
      var isRelative = importPath.charAt(0) === '.' || importPath.charAt(0) === '/';
      if (!isRelative) {
        throw new Error('This app imports "' + importPath + '", a package the preview cannot load. Apps here can use only React and their own files - rebuild it, or remove that import.');
      }
      var resolved = normalizePath(dirname(path), importPath);
      return requireModule(resolved);
    };

    var fn = new Function('require', 'module', 'exports', 'React', transpiled);
    fn(localRequire, module, module.exports, window.React);

    return module.exports;
  }

  try {
    var entryNoExt = ENTRY_PATH.replace(/\\.(jsx|js)$/i, '');
    var entryModule = requireModule(entryNoExt);
    var Component = entryModule.default || entryModule;
    if (typeof Component !== 'function') {
      throw new Error('The entry file (' + ENTRY_PATH + ') did not export a React component as its default export.');
    }
    var root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(Component));
  } catch (err) {
    renderError(err.message);
  }
})();
<\/script>
</body></html>`;
}

  var api = { buildPreviewDocument: buildPreviewDocument, findEntryFile: findEntryFile, isFillerFile: isFillerFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.buildPreviewDocument = buildPreviewDocument; root.findEntryFile = findEntryFile; root.isFillerFile = isFillerFile; }
})(typeof window !== 'undefined' ? window : globalThis);
