import { decodeConfig, resolveLocalizedSettings } from '../../../../settings/settings';
import { mountAgeGate } from '../../../../popup/gate';

// Wix fills {{config}} in age-gate.html with the settings saved from the dashboard.
function start() {
  const encoded = document.getElementById('age-gate-config')?.dataset.config;
  if (!encoded) return;

  let settings = decodeConfig(encoded);

  // The page's own lang attribute reflects whatever language the visitor is viewing it
  // in — set by Wix whether the site uses full Multilingual or just a single site
  // language — so it works without depending on Wix's Multilingual API being available.
  if (settings.translations.length > 0) {
    settings = resolveLocalizedSettings(settings, document.documentElement.lang);
  }

  // Adding ?age-gate-test to a page's address shows the gate again in this browser.
  const test = new URLSearchParams(window.location.search).has('age-gate-test');
  mountAgeGate(settings, { ignoreStoredVerification: test });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
