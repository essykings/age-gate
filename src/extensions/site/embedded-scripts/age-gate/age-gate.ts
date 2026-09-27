import { decodeConfig, resolveLocalizedSettings } from '../../../../settings/settings';
import { mountAgeGate } from '../../../../popup/gate';

// Wix fills {{config}} in age-gate.html with the settings saved from the dashboard.
function start() {
  const encoded = document.getElementById('age-gate-config')?.dataset.config;
  if (!encoded) return;

  // The page's own lang attribute reflects whatever language the visitor is viewing it
  // in — set by Wix whether the site uses full Multilingual or just a single site
  // language — so it works without depending on Wix's Multilingual API being available.
  // It picks the owner's translation (if any) and the built-in wording for everything else.
  const language = document.documentElement.lang;
  const settings = resolveLocalizedSettings(decodeConfig(encoded), language);

  // Adding ?age-gate-test to a page's address shows the gate again in this browser.
  const test = new URLSearchParams(window.location.search).has('age-gate-test');
  mountAgeGate(settings, { ignoreStoredVerification: test, language });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
