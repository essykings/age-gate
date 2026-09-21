import type { CSSProperties, FC } from 'react';
import styles from '../../../site/widgets/age-verify/age-verify.module.css';
import { resolvePopupColors } from '../../../../settings/color';
import type { AgeGateSettings } from '../../../../settings/settings';

interface PopupPreviewProps {
  settings: AgeGateSettings;
}

// Mirrors the markup and CSS variables the widget builds in renderOverlay(),
// so the dashboard preview matches the live popup.
export const PopupPreview: FC<PopupPreviewProps> = ({ settings }) => {
  const { minimumAge, verificationMethod, theme } = settings;
  const isDob = verificationMethod === 'dob';
  const themeClass = theme === 'minimal' ? '' : styles[`theme-${theme}`];

  const isNoir = theme === 'noir';
  const heading =
    settings.headingText ||
    (isDob ? (isNoir ? 'Confirm your age' : 'Please confirm your date of birth') : `Are you ${minimumAge} or older?`);
  const body =
    settings.bodyText ||
    (isNoir && isDob ? 'Enter your date of birth to continue' : 'You must confirm your age to view this site.');
  const logoUrl = settings.logoUrl.startsWith('https://') ? settings.logoUrl : '';
  const yesText = settings.yesButtonText || `Yes, I am ${minimumAge}+`;
  const noText = settings.noButtonText || `No, I am ${minimumAge}`;

  const cssVars = {
    '--heading-font-size': `${settings.headingFontSize}px`,
    '--button-font-size': `${settings.buttonFontSize}px`,
    '--button-radius': `${settings.buttonBorderRadius}px`,
    ...resolvePopupColors({
      theme,
      popupBackground: settings.popupBackgroundColor,
      accent: settings.accentColor,
      noButton: settings.noButtonColor,
      headingColor: settings.headingColor,
      bodyColor: settings.bodyColor,
      primaryButtonTextColor: settings.primaryButtonTextColor,
      secondaryButtonTextColor: settings.secondaryButtonTextColor,
    }),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      style={{
        ...cssVars,
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div className={`${styles.container} ${themeClass}`} style={{ width: '100%', padding: '28px 20px' }}>
        {logoUrl && <img className={styles.logo} src={logoUrl} alt="" />}
        <h2 className={styles.heading}>{heading}</h2>
        <p className={styles.body}>{body}</p>
        {isDob ? (
          <>
            <div className={styles.dobField}>
              {isNoir ? (
                <div className={styles.dobSegments}>
                  <input className={styles.dobSegment} placeholder="DD" tabIndex={-1} readOnly />
                  <span className={styles.dobSlash}>/</span>
                  <input className={styles.dobSegment} placeholder="MM" tabIndex={-1} readOnly />
                  <span className={styles.dobSlash}>/</span>
                  <input className={styles.dobSegment} placeholder="YYYY" tabIndex={-1} readOnly />
                </div>
              ) : (
                <>
                  <label className={styles.dobLabel}>Date of birth</label>
                  <input className={styles.dobInput} type="date" tabIndex={-1} readOnly />
                </>
              )}
            </div>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} tabIndex={-1}>
                {isNoir ? 'Enter' : 'Confirm'}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} tabIndex={-1}>
              {yesText}
            </button>
            <button type="button" className={styles.secondaryButton} tabIndex={-1}>
              {noText}
            </button>
          </div>
        )}
        {settings.footerText && <p className={styles.footer}>{settings.footerText}</p>}
      </div>
    </div>
  );
};
