import { useEffect, useRef, type FC } from 'react';
import { buildPopup } from '../../../../popup/render';
import { POPUP_CSS } from '../../../../popup/styles';
import type { AgeGateSettings } from '../../../../settings/settings';

interface PopupPreviewProps {
  settings: AgeGateSettings;
}

// Draws the same popup visitors see, using the shared renderer and styles, inside a shadow
// root so the dashboard's styles can't affect it.
export const PopupPreview: FC<PopupPreviewProps> = ({ settings }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const popup = buildPopup(settings);

    const vars = Object.entries(popup.cssVars)
      .map(([name, value]) => `${name}: ${value};`)
      .join(' ');

    // A backdrop like the real overlay, but sized to this card instead of the screen.
    root.innerHTML = `
      <style>
        ${POPUP_CSS}
        .preview-backdrop { background: rgba(0, 0, 0, 0.5); border-radius: 8px; padding: 16px; pointer-events: none; }
        .preview-backdrop .container { width: 100%; padding-left: 20px; padding-right: 20px; }
      </style>
      <div class="preview-backdrop" style="${vars}" aria-hidden="true">${popup.html}</div>
    `;
  }, [settings]);

  return <div ref={hostRef} />;
};
