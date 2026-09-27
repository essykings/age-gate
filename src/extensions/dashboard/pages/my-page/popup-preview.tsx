import { useEffect, useRef, type FC } from 'react';
import { buildPopup, buildRestrictedHtml } from '../../../../popup/render';
import { POPUP_CSS } from '../../../../popup/styles';
import type { AgeGateSettings } from '../../../../settings/settings';

interface PopupPreviewProps {
  settings: AgeGateSettings;
  // Language for the built-in wording (anything the owner left blank).
  language?: string | null;
  // Which screen to show: the question, or what visitors see after answering "No".
  screen?: 'popup' | 'restricted';
}

// Draws the same popup visitors see, using the shared renderer and styles, inside a shadow
// root so the dashboard's styles can't affect it.
export const PopupPreview: FC<PopupPreviewProps> = ({ settings, language, screen = 'popup' }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const popup = buildPopup(settings, language);
    const html = screen === 'restricted' ? buildRestrictedHtml(settings, language) : popup.html;

    const vars = Object.entries(popup.cssVars)
      .map(([name, value]) => `${name}: ${value};`)
      .join(' ');

    // A backdrop like the real overlay, but sized to this card instead of the screen.
    root.innerHTML = `
      <style>
        ${POPUP_CSS}
        .preview-backdrop { background: #ffffff; border-radius: 8px; padding: 16px; pointer-events: none; }
        .preview-backdrop .container { width: 100%; padding-left: 20px; padding-right: 20px; }
      </style>
      <div class="preview-backdrop" style="${vars}" aria-hidden="true">${html}</div>
    `;

    // Set as textContent, not interpolated into the HTML above, so custom CSS can never
    // break out of its <style> tag no matter what characters it contains.
    if (settings.customCss) {
      const customStyle = document.createElement('style');
      customStyle.textContent = settings.customCss;
      root.append(customStyle);
    }
  }, [settings, language, screen]);

  return <div ref={hostRef} />;
};
