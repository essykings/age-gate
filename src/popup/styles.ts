// Popup styles. Rendered inside a shadow root, so these can't clash with the site's CSS.
export const POPUP_CSS = `
:host {
  all: initial;
}

*, *::before, *::after {
  box-sizing: border-box;
}

button, input {
  font-family: inherit;
}

.container {
  max-width: 420px;
  margin: 0 auto;
  padding: 40px 32px;
  background: var(--popup-background, #ffffff);
  border-radius: 12px;
  box-shadow: 0 2px 24px rgba(0, 0, 0, 0.08);
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

.heading {
  font-size: var(--heading-font-size, 22px);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--heading-color, #111111);
  margin: 0 0 12px 0;
}

.body {
  font-size: 14px;
  line-height: 1.5;
  color: var(--body-color, #666666);
  margin: 0 0 28px 0;
}

.buttonRow {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.primaryButton {
  flex: 1;
  min-width: 140px;
  padding: 12px 24px;
  background: var(--accent-color, #111111);
  color: var(--primary-text, #ffffff);
  border: none;
  border-radius: var(--button-radius, 8px);
  font-size: var(--button-font-size, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.primaryButton:hover {
  opacity: 0.85;
}

.secondaryButton {
  flex: 1;
  min-width: 140px;
  padding: 12px 24px;
  background: var(--secondary-bg, transparent);
  color: var(--secondary-text, #666666);
  border: 1px solid var(--secondary-border, #dddddd);
  border-radius: var(--button-radius, 8px);
  font-size: var(--button-font-size, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.secondaryButton:hover {
  opacity: 0.7;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
}
@media (max-width: 480px) {
  .container {
    padding: 28px 20px;
  }

  .buttonRow {
    flex-direction: column;
  }
}

.theme-noir {
  background: var(--popup-background, #0a0a0a);
  border: 1px solid #1f1f1f;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  padding: 44px 32px 36px;
}

.theme-noir .heading {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--heading-color, #ffffff);
}

.theme-noir .body {
  color: var(--body-color, #8a8a8f);
}

.theme-noir .primaryButton {
  background: var(--accent-color, #d9c5b8);
  color: var(--primary-text, #2a211d);
  width: 100%;
  padding: 20px 24px;
  border-radius: var(--button-radius, 12px);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.theme-noir .secondaryButton {
  color: var(--secondary-text, #8a8a8f);
  border-color: var(--secondary-border, #2b2b2b);
  border-radius: var(--button-radius, 12px);
}

.theme-noir .dobLabel {
  display: none;
}

.theme-noir .footer {
  color: #6f6f75;
}

.theme-amber {
  background: var(--popup-background, #ffffff);
  box-shadow: 0 2px 24px rgba(0, 0, 0, 0.08);
}

.theme-amber .heading {
  font-weight: 700;
  color: var(--heading-color, #1a1a1a);
}

.theme-amber .body {
  color: var(--body-color, #444444);
}

.theme-amber .buttonRow {
  flex-direction: column;
}

.theme-amber .primaryButton,
.theme-amber .secondaryButton {
  width: 100%;
  padding: 18px 24px;
  border-radius: var(--button-radius, 14px);
}

.theme-amber .primaryButton {
  background: var(--accent-color, #ffc400);
  color: var(--primary-text, #1a1a1a);
}

.theme-amber .secondaryButton {
  color: var(--secondary-text, #1a1a1a);
  border: 2px solid var(--secondary-border, #ffd21f);
}

.theme-blossom {
  background: var(--popup-background, #fdf1ee);
  border-radius: 24px;
  box-shadow: 0 8px 30px rgba(140, 59, 82, 0.18);
}

.theme-blossom .heading {
  font-weight: 700;
  color: var(--heading-color, #2b1620);
}

.theme-blossom .body {
  color: var(--body-color, #7a6b70);
}

.theme-blossom .primaryButton {
  background: var(--accent-color, #8c3b52);
  color: var(--primary-text, #ffffff);
  width: 100%;
  padding: 16px 24px;
  border-radius: var(--button-radius, 999px);
}

.theme-blossom .dobLabel {
  display: none;
}

.theme-blossom .dobSegment {
  color: #2b1620;
  background: #ffffff;
  border: 1px solid rgba(140, 59, 82, 0.25);
}

.theme-blossom .dobSegment::placeholder {
  color: #c8b3ba;
}

.theme-blossom .dobSegment:focus {
  border-color: var(--accent-color, #8c3b52);
}

.theme-garden {
  background: var(--popup-background, #1f3327);
  border-radius: 48px 48px 24px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  padding: 48px 32px 36px;
}

.theme-garden .heading {
  font-weight: 700;
  color: var(--heading-color, #f4f1e8);
}

.theme-garden .body {
  color: var(--body-color, #a9b8a0);
}

.theme-garden .buttonRow {
  flex-direction: column;
}

.theme-garden .primaryButton,
.theme-garden .secondaryButton {
  width: 100%;
  padding: 16px 24px;
  border-radius: var(--button-radius, 999px);
}

.theme-garden .primaryButton {
  background: var(--accent-color, #cfe3a4);
  color: var(--primary-text, #1f3327);
}

.theme-garden .primaryButton::before {
  content: '✓ ';
}

.theme-garden .secondaryButton {
  color: var(--secondary-text, #f4f1e8);
  border: 1px solid var(--secondary-border, rgba(244, 241, 232, 0.3));
}

.theme-garden .secondaryButton::before {
  content: '✕ ';
}

.theme-sunset {
  background: var(--popup-background, #fdf6ee);
  border-radius: 20px;
  box-shadow: 12px 12px 0 0 #f6e2cf, 0 2px 24px rgba(0, 0, 0, 0.08);
}

.theme-sunset .heading {
  font-weight: 700;
  color: var(--heading-color, #241b16);
}

.theme-sunset .body {
  color: var(--body-color, #6b5b52);
}

.theme-sunset .buttonRow {
  flex-direction: column;
}

.theme-sunset .primaryButton,
.theme-sunset .secondaryButton {
  width: 100%;
  padding: 16px 24px;
  border-radius: var(--button-radius, 999px);
}

.theme-sunset .primaryButton {
  background: var(--accent-color, #d9773f);
  color: var(--primary-text, #ffffff);
}

.theme-sunset .primaryButton::before {
  content: '✓ ';
}

.theme-sunset .secondaryButton {
  color: var(--secondary-text, #d9773f);
  border: 2px solid var(--secondary-border, #d9773f);
}

.theme-sunset .secondaryButton::before {
  content: '✕ ';
}

.logo {
  display: block;
  max-width: 160px;
  max-height: 72px;
  margin: 0 auto 20px;
  object-fit: contain;
}

.footer {
  font-size: var(--footer-font-size, 12px);
  line-height: 1.5;
  color: #888888;
  margin: 20px 0 0 0;
}

.previewNote {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #92650a;
  background: #fdf0d5;
  border-radius: 999px;
  padding: 4px 12px;
  margin: 0 0 16px 0;
}

.dobField {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  margin-bottom: 20px;
}

.dobLabel {
  font-size: 13px;
  font-weight: 500;
  color: #444444;
}

.dobInput {
  padding: 10px 12px;
  border: 1px solid #dddddd;
  border-radius: var(--button-radius, 8px);
  font-size: 14px;
  font-family: inherit;
  color: #111111;
  background: #ffffff;
}

.dobInput:focus {
  outline: none;
  border-color: var(--accent-color, #111111);
}

.dobError {
  font-size: 13px;
  color: #c0392b;
  margin: -10px 0 16px 0;
  text-align: left;
}
.dobSegments {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.dobSlash {
  color: #6f6f75;
  font-size: 20px;
}

.dobSegment {
  flex: 1;
  min-width: 0;
  padding: 18px 8px;
  text-align: center;
  font-size: 20px;
  font-family: inherit;
  color: #ffffff;
  background: #1a1a1a;
  border: 1px solid #2b2b2b;
  border-radius: 14px;
}

.dobSegment::placeholder {
  color: #5c5c62;
}

.dobSegment:focus {
  outline: none;
  border-color: var(--accent-color, #d9c5b8);
}
`;
