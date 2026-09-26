import type { FC } from 'react';
import { dashboard } from '@wix/dashboard';
import wixConfig from '../../../../../wix.config.json';

// Wix's own hosted "leave a review" page for this app. We never build review UI
// ourselves — see https://dev.wix.com/docs/build-apps/manage-your-app/user-support/user-reviews.
// It sets a Content-Security-Policy that only allows a handful of Wix-owned domains to
// frame it, which doesn't include our own app's hosting domain — so it opens in a new
// tab instead of embedding, rather than showing a silently blank iframe.
const REVIEW_URL = `https://www.wix.com/app-market/add-review/${wixConfig.appId}`;

// Deliberately dependency-free: pulling in the full @wix/design-system bundle for this
// two-button dialog added a multi-second load delay the first time it opens, since this
// extension's bundle is separate from the dashboard page's and wasn't loaded yet.
const buttonBase: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: 'none',
};

// Shown once, right after a site owner successfully turns the gate on — see
// promptForReview in my-page.tsx's handleSave for when and how often.
const Modal: FC = () => {
  const openReviewPage = () => {
    window.open(REVIEW_URL, '_blank', 'noopener,noreferrer');
    dashboard.closeModal();
  };

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#000624' }}>Enjoying the age gate?</h2>
      <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.5, color: '#5c5f6a' }}>
        Mind leaving a quick review? It really helps other site owners find the app. It opens in a new tab.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          onClick={() => dashboard.closeModal()}
          style={{ ...buttonBase, background: 'transparent', color: '#116dff' }}
        >
          Not now
        </button>
        <button
          type="button"
          onClick={openReviewPage}
          style={{ ...buttonBase, background: '#116dff', color: '#ffffff' }}
        >
          Sure, I'll review it
        </button>
      </div>
    </div>
  );
};

export default Modal;
