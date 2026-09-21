import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'age-gate-settings';

// One row holds the site-wide defaults. Field keys mirror src/settings/settings.ts.
export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Age Gate Settings',
  fields: [
    { type: 'TEXT', displayName: 'Title', key: 'title' },
    { type: 'BOOLEAN', displayName: 'Enable for live site', key: 'liveMode' },
    { type: 'NUMBER', displayName: 'Minimum age', key: 'minimumAge' },
    { type: 'TEXT', displayName: 'Verification method', key: 'verificationMethod' },
    { type: 'NUMBER', displayName: 'Remember verification (days)', key: 'verificationDays' },
    { type: 'TEXT', displayName: 'Theme', key: 'theme' },
    { type: 'TEXT', displayName: 'Logo URL', key: 'logoUrl' },
    { type: 'TEXT', displayName: 'Footer text', key: 'footerText' },
    { type: 'TEXT', displayName: 'Heading text', key: 'headingText' },
    { type: 'TEXT', displayName: 'Body text', key: 'bodyText' },
    { type: 'TEXT', displayName: 'Yes button text', key: 'yesButtonText' },
    { type: 'TEXT', displayName: 'No button text', key: 'noButtonText' },
    { type: 'TEXT', displayName: 'Redirect URL', key: 'redirectUrl' },
    { type: 'TEXT', displayName: 'Popup background color', key: 'popupBackgroundColor' },
    { type: 'TEXT', displayName: 'Accent color', key: 'accentColor' },
    { type: 'TEXT', displayName: 'Heading color', key: 'headingColor' },
    { type: 'TEXT', displayName: 'Body text color', key: 'bodyColor' },
    { type: 'TEXT', displayName: 'Yes button text color', key: 'primaryButtonTextColor' },
    { type: 'TEXT', displayName: 'No button text color', key: 'secondaryButtonTextColor' },
    { type: 'TEXT', displayName: 'No button color', key: 'noButtonColor' },
    { type: 'NUMBER', displayName: 'Heading size (px)', key: 'headingFontSize' },
    { type: 'NUMBER', displayName: 'Button text size (px)', key: 'buttonFontSize' },
    { type: 'NUMBER', displayName: 'Button border radius (px)', key: 'buttonBorderRadius' },
  ],
  displayField: 'title',
  // The public widget reads these settings; only dashboard users write them.
  dataPermissions: {
    itemInsert: 'CMS_EDITOR',
    itemRead: 'ANYONE',
    itemRemove: 'CMS_EDITOR',
    itemUpdate: 'CMS_EDITOR',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
