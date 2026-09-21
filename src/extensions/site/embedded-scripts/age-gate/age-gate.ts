import { decodeConfig } from '../../../../settings/settings';
import { mountAgeGate } from '../../../../popup/gate';

// Wix fills {{config}} in age-gate.html with the settings saved from the dashboard.
function start() {
  const encoded = document.getElementById('age-gate-config')?.dataset.config;
  if (!encoded) return;

  // Adding ?age-gate-test to a page's address shows the gate again in this browser.
  const test = new URLSearchParams(window.location.search).has('age-gate-test');
  mountAgeGate(decodeConfig(encoded), { ignoreStoredVerification: test });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
