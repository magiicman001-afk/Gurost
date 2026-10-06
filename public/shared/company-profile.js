// Company profile on the Business Assistant page: load the saved profile into
// the form, validate on the server, save. Everything from the server is put on
// the page with textContent / .value, never as HTML.
(function () {
  var root = document.getElementById('companyProfile');
  if (!root || !window.GurostAPI) return;
  var $ = function (id) { return document.getElementById(id); };
  var socialFields = [];

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function msg(text, isErr) { $('cpMsg').textContent = text || ''; $('cpMsg').style.color = isErr ? '#b91c1c' : (text ? '#15803d' : ''); }
  function fill(select, items) { items.forEach(function (i) { var o = el('option', null, i.label); o.value = i.id; select.appendChild(o); }); }
  var LABELS = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', facebook: 'Facebook' };
  function socialLabel(k) { return LABELS[k] || k; }

  function show(p) {
    $('cpName').value = p.name || '';
    $('cpWebsite').value = p.website || '';
    $('cpIndustry').value = p.industry || '';
    $('cpType').value = p.type || '';
    $('cpTarget').value = p.target || '';
    socialFields.forEach(function (k) { $('cpSocial_' + k).value = (p.socials && p.socials[k]) || ''; });
  }

  async function load() {
    try {
      var data = await GurostAPI.call('/api/company-profile');
      fill($('cpIndustry'), data.industries);
      fill($('cpType'), data.types);
      socialFields = data.socialFields;
      socialFields.forEach(function (k) {
        var label = el('label', 'text-xs font-semibold', socialLabel(k));
        var input = el('input', 'field-input mt-1');
        input.id = 'cpSocial_' + k; input.maxLength = 60; input.placeholder = '@yourname'; input.autocapitalize = 'off';
        label.appendChild(input);
        $('cpSocials').appendChild(label);
      });
      if (data.profile) show(data.profile);
    } catch (err) { msg("Couldn't load your company profile: " + err.message, true); }
  }

  $('cpSave').addEventListener('click', async function () {
    var btn = this;
    var socials = {};
    socialFields.forEach(function (k) { socials[k] = $('cpSocial_' + k).value; });
    var body = { name: $('cpName').value, website: $('cpWebsite').value, industry: $('cpIndustry').value, type: $('cpType').value, target: $('cpTarget').value, socials: socials };
    btn.disabled = true; msg('Saving...');
    try {
      var r = await GurostAPI.call('/api/company-profile', { method: 'PUT', body: body });
      show(r.profile); // shows the cleaned values the server kept
      msg('Saved.');
    } catch (err) { msg(err.message, true); }
    btn.disabled = false;
  });

  load();
})();
