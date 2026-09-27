import { useCallback, useEffect, useRef, useState, type CSSProperties, type FC } from 'react';
import { dashboard } from '@wix/dashboard';
import { embeddedScripts } from '@wix/app-management';
import {
  Badge,
  Box,
  Button,
  Card,
  Cell,
  Dropdown,
  FormField,
  Input,
  InputArea,
  Layout,
  Loader,
  NumberInput,
  Page,
  SectionHelper,
  Text,
  TextButton,
  ToggleSwitch,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import {
  DEFAULT_SETTINGS,
  decodeConfig,
  BACKDROPS,
  EMPTY_TRANSLATION,
  encodeConfig,
  MAX_CUSTOM_CSS_LENGTH,
  MAX_VERIFICATION_DAYS,
  normalizeRedirectUrl,
  normalizeTargetPath,
  PAGE_TARGETING_MODES,
  hasTargetPaths,
  redirectUrlIssue,
  resolveLocalizedSettings,
  stripProFeatures,
  toLanguageCode,
  translationsIssue,
  usesProFeatures,
  type AgeGateSettings,
  type Backdrop,
  type PageTargetingMode,
  type Theme,
  type Translation,
  type VerificationMethod,
} from '../../../../settings/settings';
import { PopupPreview } from './popup-preview';
import { contrastIssues } from '../../../../settings/color';
import { fetchPlanInfo, getUpgradeUrl, type PlanInfo } from '../../../../settings/plan';
import { hasBuiltInWording, uiStrings } from '../../../../popup/i18n';
import { isSegmentedDobTheme } from '../../../../popup/render';
import { LANGUAGE_NAMES, languageName } from './languages';

// The review-prompt Dashboard Modal's extension id (see review-prompt.extension.ts).
const REVIEW_PROMPT_MODAL_ID = 'f5435726-b327-45d2-b53a-fd32939aef40';

const THEME_LABELS: Record<Theme, string> = {
  minimal: 'Minimal (light)',
  noir: 'Noir (dark, uppercase)',
  amber: 'Amber (yellow buttons)',
  blossom: 'Blossom (soft pink)',
  garden: 'Garden (dark green)',
  sunset: 'Sunset (warm orange)',
};

// Real screenshots of each theme, hosted on Cloudinary.
const THEME_PREVIEW_IMAGES: Record<Theme, string> = {
  minimal: 'https://res.cloudinary.com/dgfqcinz9/image/upload/v1790318743/0c894479-0765-4f63-9056-d74393e384f2.png',
  noir: 'https://res.cloudinary.com/dgfqcinz9/image/upload/v1790317455/bold_ewrviv.png',
  amber: 'https://res.cloudinary.com/dgfqcinz9/image/upload/v1790317456/yellow_xk8rhk.png',
  blossom: 'https://res.cloudinary.com/dgfqcinz9/image/upload/v1790317457/pink_scykcx.png',
  garden: 'https://res.cloudinary.com/dgfqcinz9/image/upload/v1790317458/green_ypforz.png',
  sunset: 'https://res.cloudinary.com/dgfqcinz9/image/upload/v1790317458/orange_v7smog.png',
};

const colorInputStyle = {
  width: '100%',
  height: '36px',
  border: '1px solid #dfe5eb',
  borderRadius: '4px',
  cursor: 'pointer',
  padding: '2px',
};

// A more compact swatch for cards where several colour fields are stacked in one column.
const smallColorInputStyle = { ...colorInputStyle, height: '28px', maxWidth: '150px' };

type GateStatus =
  | { kind: 'checking' }
  | { kind: 'live' }
  | { kind: 'off' }
  | { kind: 'notSetUp' }
  | { kind: 'error'; message: string };

const BACKDROP_LABELS: Record<Backdrop, string> = {
  dim: 'Dimmed',
  blur: 'Blurred',
  solid: 'Hidden completely',
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// Wix returns a 404 when the script has never been embedded on this site.
const isNotFound = (error: unknown): boolean =>
  /404|not[ _-]?found|NO_HTML_EMBEDS_ON_SITE/i.test(errorMessage(error));

const DashboardPage: FC = () => {
  const [settings, setSettings] = useState<AgeGateSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AgeGateSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);
  // What Wix says about the age gate script on this site.
  const [gateStatus, setGateStatus] = useState<GateStatus>({ kind: 'checking' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  // '' previews the default (main-language) text; otherwise a saved translation's code.
  const [previewLanguage, setPreviewLanguage] = useState('');
  // Rows in "Other languages" where the owner picked "Other" and types a code themselves.
  const [otherLanguageRows, setOtherLanguageRows] = useState<number[]>([]);
  // The preview can show the question or the "Access Restricted" screen.
  const [previewScreen, setPreviewScreen] = useState<'popup' | 'restricted'>('popup');
  // Set when Pro options were switched off on the site because it's no longer on Pro.
  const [proSwitchedOff, setProSwitchedOff] = useState(false);
  // Whether Wix currently has the script switched off, as loaded (see the refresh below).
  const scriptDisabled = useRef(false);
  // Only a site with real saved settings is refreshed; defaults are never pushed on its behalf.
  const hasSavedConfig = useRef(false);
  const refreshed = useRef(false);

  // Edits that haven't been saved yet (drives the "leave without saving?" warning).
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  // A site that has never been saved has nothing on it yet, even though the defaults on
  // screen already look "on" — so Save must work without the owner changing something first.
  const canSave = dirty || gateStatus.kind === 'notSetUp';

  useEffect(() => {
    // The plan and the saved settings load independently, so a settings problem
    // can't hide the plan.
    const loadSettings = async () => {
      try {
        const script = await embeddedScripts.getEmbeddedScript();
        const encoded = script.parameters?.config;
        const stored = encoded ? decodeConfig(encoded) : null;
        if (stored) {
          // ?reset-review-prompt lets us retest the one-time review prompt on a site
          // that's already seen it, without a fresh install. Left as a pending change —
          // savedSettings keeps the real stored value, so Save is what actually clears it.
          const resetReviewPrompt = new URLSearchParams(window.location.search).has('reset-review-prompt');
          setSettings(resetReviewPrompt ? { ...stored, reviewPrompted: false } : stored);
          setSavedSettings(stored);
        }
        // On only when Wix's flag and the saved "show the age gate" setting agree.
        scriptDisabled.current = !!script.disabled;
        hasSavedConfig.current = stored !== null;
        setGateStatus({ kind: !script.disabled && stored?.enabled ? 'live' : 'off' });
      } catch (error) {
        setGateStatus(isNotFound(error) ? { kind: 'notSetUp' } : { kind: 'error', message: errorMessage(error) });
        // Nothing is saved until the first Save, so this can also just mean "no settings yet".
        console.error('Could not load saved age gate settings:', error);
      }
    };

    Promise.all([loadSettings(), fetchPlanInfo().then(setPlan)]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const { remove } = dashboard.onBeforeUnload((event) => event.preventDefault());
    return remove;
  }, [dirty]);

  // Escape closes the "Upgrade to Premium" box.
  useEffect(() => {
    if (!showProModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showProModal]);

  const update = useCallback(
    <K extends keyof AgeGateSettings>(key: K, value: AgeGateSettings[K]) =>
      setSettings((current) => ({ ...current, [key]: value })),
    [],
  );

  // Colour fields left over from a previous theme would otherwise keep overriding the
  // newly picked theme's own look, so switching themes clears them back to "theme default".
  const changeTheme = useCallback(
    (theme: Theme) =>
      setSettings((current) => ({
        ...current,
        theme,
        popupBackgroundColor: '',
        accentColor: '',
        noButtonColor: '',
        headingColor: '',
        bodyColor: '',
        primaryButtonTextColor: '',
        secondaryButtonTextColor: '',
      })),
    [],
  );

  // One input per page, backed by the same newline-joined string the gate script reads.
  const targetPathList = settings.targetPaths.split('\n');

  const setTargetPath = (index: number, value: string) => {
    const next = [...targetPathList];
    next[index] = value;
    update('targetPaths', next.join('\n'));
  };

  const addTargetPath = () => update('targetPaths', [...targetPathList, ''].join('\n'));

  const removeTargetPath = (index: number) =>
    update('targetPaths', targetPathList.filter((_, i) => i !== index).join('\n'));

  const addTranslation = () => update('translations', [...settings.translations, { ...EMPTY_TRANSLATION }]);

  const updateTranslation = (index: number, key: keyof Translation, value: string) => {
    const next = [...settings.translations];
    next[index] = { ...next[index]!, [key]: value };
    update('translations', next);
  };

  // Empties every text field of a language, so it goes back to the ready-made wording.
  // Also used when a row switches language: text typed for the old language is no use for
  // the new one, and leaving it would show visitors the wrong language.
  const resetTranslationText = (index: number, code: string) => {
    const next = [...settings.translations];
    next[index] = { ...EMPTY_TRANSLATION, code };
    update('translations', next);
  };

  const hasTypedText = (translation: Translation) =>
    (Object.keys(EMPTY_TRANSLATION) as (keyof Translation)[]).some((key) => key !== 'code' && translation[key] !== '');

  const removeTranslation = (index: number) => {
    update('translations', settings.translations.filter((_, i) => i !== index));
    // Rows after the removed one move up by one.
    setOtherLanguageRows((rows) => rows.filter((row) => row !== index).map((row) => (row > index ? row - 1 : row)));
  };

  const isPro = plan?.isPro ?? false;
  const planKnown = plan !== null && plan.status !== 'unknown';
  // Built-in wording in the site's main language, for placeholders and the preview.
  const siteLanguage = plan?.siteLanguage ?? null;
  const strings = uiStrings(siteLanguage);

  // Re-saves the site's current settings once per visit to this page, for two reasons:
  // - A site keeps serving the version of the gate script it had the last time the script
  //   was embedded; releasing a new app version doesn't update it. Re-embedding picks up
  //   the latest script without the owner having to press Save.
  // - The script on the site never checks the plan, so a site that left Pro would keep
  //   its Pro options. Once the plan is confirmed not to be Pro, they're switched off here.
  // Only for sites that have saved before, and Wix's on/off state is left exactly as it was.
  useEffect(() => {
    if (loading || refreshed.current || !hasSavedConfig.current) return;
    if (gateStatus.kind !== 'live' && gateStatus.kind !== 'off') return;
    refreshed.current = true;
    const stripPro = planKnown && !isPro && usesProFeatures(savedSettings);
    const current = stripPro ? stripProFeatures(savedSettings) : savedSettings;
    embeddedScripts
      .embedScript({ parameters: { config: encodeConfig(current) }, disabled: scriptDisabled.current })
      .then(() => {
        if (!stripPro) return;
        setSavedSettings(current);
        // Keep any edits in progress, minus the Pro options.
        setSettings((edits) => stripProFeatures(edits));
        setProSwitchedOff(true);
      })
      .catch((error) => console.error('Could not refresh the age gate on the site:', error));
  }, [loading, planKnown, isPro, gateStatus.kind, savedSettings]);
  // Shown in the header for Pro sites, e.g. "pro" -> "Pro".
  const planName = plan?.packageName ? plan.packageName.charAt(0).toUpperCase() + plan.packageName.slice(1) : 'Pro';

  const handleUpgrade = () => {
    window.open(getUpgradeUrl(plan?.instanceId ?? null), '_blank', 'noopener,noreferrer');
  };

  // Re-reads the plan, e.g. after upgrading in another tab.
  const refreshPlan = async () => {
    setCheckingPlan(true);
    setPlan(await fetchPlanInfo());
    setCheckingPlan(false);
  };

  // `overrides` lets a one-click action (like "Turn off testing mode") save with a change
  // applied, without waiting for the owner to edit the form and press Save.
  const handleSave = async (overrides: Partial<AgeGateSettings> = {}) => {
    const current: AgeGateSettings = {
      ...settings,
      ...overrides,
      // Fix up what was typed (e.g. "google.com" -> "https://google.com") before checking it.
      redirectUrl: normalizeRedirectUrl(overrides.redirectUrl ?? settings.redirectUrl),
    };
    const redirectProblem = redirectUrlIssue(current.redirectUrl);
    if (redirectProblem) {
      dashboard.showToast({ message: `Fix the Redirect URL before saving. ${redirectProblem}`, type: 'error' });
      return;
    }
    const translationProblem = translationsIssue(current.translations);
    if (translationProblem) {
      dashboard.showToast({ message: `Fix "Other languages" before saving. ${translationProblem}`, type: 'error' });
      return;
    }
    current.targetPaths = current.targetPaths.split('\n').map(normalizeTargetPath).filter(Boolean).join('\n');

    // Free plans can't keep Pro options, even if they were saved before a downgrade. If the
    // plan couldn't be determined we keep everything as-is rather than wipe a Pro owner's setup.
    const toSave: AgeGateSettings = isPro || !planKnown ? current : stripProFeatures(current);

    // Ask for a review at most once, right after the gate first goes live — a "happy
    // moment", not a random save. Flipping the flag here saves it in this same request.
    const promptForReview = toSave.enabled && !toSave.reviewPrompted;
    if (promptForReview) toSave.reviewPrompted = true;

    setSaving(true);
    try {
      // Embedding the script (with its settings) is what puts the age gate on the site.
      await embeddedScripts.embedScript({
        parameters: { config: encodeConfig(toSave) },
        disabled: !toSave.enabled,
      });
      setSettings(toSave);
      setSavedSettings(toSave);
      setGateStatus({ kind: toSave.enabled ? 'live' : 'off' });
      dashboard.showToast({ message: 'Settings saved.', type: 'success' });
      if (promptForReview) dashboard.openModal(REVIEW_PROMPT_MODAL_ID);
    } catch (error) {
      console.error('Failed to save age gate settings:', error);
      const reason = errorMessage(error);
      setGateStatus({ kind: 'error', message: reason });
      dashboard.showToast({ message: `Could not save your settings: ${reason}`, type: 'error', timeout: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const chooseLogo = async () => {
    try {
      const chosen = await dashboard.openMediaManager({ category: 'IMAGE' });
      const url = chosen?.items?.[0]?.url;
      if (url) update('logoUrl', url);
    } catch (error) {
      console.error('Could not choose a logo:', error);
    }
  };

  const methodOptions: { id: VerificationMethod; value: string; disabled?: boolean }[] = [
    { id: 'button', value: 'Yes / No buttons' },
    { id: 'dob', value: isPro ? 'Date of birth' : 'Date of birth — Pro', disabled: !isPro },
  ];

  const PAGE_TARGETING_LABELS: Record<PageTargetingMode, string> = {
    all: 'Entire site',
    specific: 'Specific pages',
  };
  const pageTargetingOptions = PAGE_TARGETING_MODES.map((id) => {
    const locked = id === 'specific' && !isPro;
    return { id, value: locked ? `${PAGE_TARGETING_LABELS[id]} — Pro` : PAGE_TARGETING_LABELS[id], disabled: locked };
  });

  const textField = (
    label: string,
    key:
      | 'headingText'
      | 'bodyText'
      | 'yesButtonText'
      | 'noButtonText'
      | 'redirectUrl'
      | 'footerText'
      | 'restrictedHeadingText'
      | 'restrictedBodyText',
    placeholder?: string,
    infoContent?: string,
  ) => (
    <FormField label={label} infoContent={infoContent}>
      <Input
        value={settings[key]}
        onChange={(event) => update(key, event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </FormField>
  );

  const numberField = (
    label: string,
    key: 'minimumAge' | 'verificationDays' | 'headingFontSize' | 'buttonFontSize' | 'footerFontSize' | 'buttonBorderRadius',
    range: { min: number; max: number },
    suffix?: string,
    infoContent?: string,
    disabled?: boolean,
    width?: number,
  ) => (
    <FormField label={label} infoContent={infoContent}>
      <Box style={width ? { width: `${width}px` } : undefined}>
        <NumberInput
          min={range.min}
          max={range.max}
          value={settings[key]}
          onChange={(value) => {
            if (value !== null) update(key, value);
          }}
          suffix={suffix ? <Text size="small" secondary>{suffix}</Text> : undefined}
          aria-label={label}
          disabled={disabled}
        />
      </Box>
    </FormField>
  );

  // Optional colours can be cleared to fall back to the theme's own (or automatic) colour.
  const colorField = (
    label: string,
    key:
      | 'popupBackgroundColor'
      | 'accentColor'
      | 'noButtonColor'
      | 'headingColor'
      | 'bodyColor'
      | 'primaryButtonTextColor'
      | 'secondaryButtonTextColor',
    options?: { placeholderColor?: string; resetLabel?: string; disabled?: boolean; small?: boolean },
  ) => (
    <FormField label={label}>
      <input
        type="color"
        value={settings[key] || options?.placeholderColor || '#111111'}
        onChange={(event) => update(key, event.target.value)}
        style={options?.small ? smallColorInputStyle : colorInputStyle}
        aria-label={label}
        disabled={options?.disabled}
      />
      {options?.resetLabel && settings[key] && (
        <TextButton size="small" disabled={options?.disabled} onClick={() => update(key, '')}>
          {options.resetLabel}
        </TextButton>
      )}
    </FormField>
  );

  // Shown under the Redirect URL field while it holds something that wouldn't work.
  const redirectProblem = redirectUrlIssue(settings.redirectUrl);

  const issues = contrastIssues({
    theme: settings.theme,
    popupBackground: settings.popupBackgroundColor,
    accent: settings.accentColor,
    noButton: settings.noButtonColor,
    headingColor: settings.headingColor,
    bodyColor: settings.bodyColor,
    primaryButtonTextColor: settings.primaryButtonTextColor,
    secondaryButtonTextColor: settings.secondaryButtonTextColor,
  });

  // A subtle black replaces Wix Design System's default blue input borders, scoped to
  // this page only via its own CSS variables (see tokens-default.global.css).
  const inputBorderVars = {
    '--wds-input-border-color': 'rgba(0, 0, 0, 0.1)',
    '--wds-input-border-color-hover': 'rgba(0, 0, 0, 0.2)',
    '--wds-input-border-color-focus': 'rgba(0, 0, 0, 0.3)',
  } as CSSProperties;

  return (
    <WixDesignSystemProvider>
      <div style={inputBorderVars}>
      <Page maxWidth={1240}>
        <Page.Header
          title="Age Verification Pro"
          subtitle="Set up the age verification popup shown to visitors across your whole site."
          actionsBar={
            <Box gap="SP2" verticalAlign="middle">
              {planKnown && !isPro && !loading && (
                <Button skin="premium" onClick={handleUpgrade}>
                  Upgrade
                </Button>
              )}
              {planKnown && isPro && !loading && (
                <Badge skin="premium" type="outlined" size="medium">
                  {/* Badges uppercase their text by default; keep the wording as written. */}
                  <span style={{ textTransform: 'none' }}>👑 Current plan: {planName}</span>
                </Badge>
              )}
              <Button onClick={() => handleSave()} disabled={!canSave || loading || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Box>
          }
        />
        <Page.Content>
          {loading ? (
            <Box align="center" verticalAlign="middle" height="240px">
              <Loader />
            </Box>
          ) : (
            <Layout gap="24px">
              <Cell span={8}>
            <Layout gap="24px">
              <Cell>
                <Box direction="vertical" gap="SP2">
                {gateStatus.kind === 'live' && !dirty && (
                  <SectionHelper appearance="success" fullWidth title="Age gate is switched on">
                    Your settings are saved. Open your published site to see the age gate.
                  </SectionHelper>
                )}
                {gateStatus.kind === 'live' && dirty && (
                  <SectionHelper appearance="standard" fullWidth title="You have unsaved changes">
                    Your site still shows the last saved version. Click Save to update it.
                  </SectionHelper>
                )}
                {proSwitchedOff && (
                  <SectionHelper appearance="warning" fullWidth title="Pro options switched off">
                    This site isn't on the Pro plan, so its Pro options (themes, page targeting, other languages,
                    custom CSS and branding) were turned off on your site. Upgrade to turn them back on.
                  </SectionHelper>
                )}
                {gateStatus.kind === 'off' && (
                  <SectionHelper appearance="standard" fullWidth title="Age gate is off">
                    It's set up but hidden. Turn on "Show the age gate on your site" and click Save to show it.
                  </SectionHelper>
                )}
                {gateStatus.kind === 'notSetUp' && (
                  <SectionHelper appearance="warning" fullWidth title="Not on your site yet">
                    {settings.enabled
                      ? 'Your settings haven\'t been saved yet. Click Save to put the age gate on your site.'
                      : 'Turn on "Show the age gate on your site", then click Save to put it on your site.'}
                  </SectionHelper>
                )}
                {savedSettings.previewMode && savedSettings.enabled && gateStatus.kind !== 'notSetUp' && (
                  <SectionHelper
                    appearance="warning"
                    fullWidth
                    title="Testing mode is on"
                    actionText={saving ? 'Saving…' : 'Turn off and save'}
                    actionDisabled={saving}
                    onAction={() => handleSave({ previewMode: false })}
                  >
                    Every visitor sees the age gate on every page, even after answering, with an "Always shown during
                    testing" label. Turn this off once you've finished testing.
                  </SectionHelper>
                )}
                {gateStatus.kind === 'error' && (
                  <SectionHelper appearance="danger" fullWidth title="Couldn't reach the age gate on your site">
                    {gateStatus.message}
                  </SectionHelper>
                )}
                {plan?.status === 'unknown' && (
                  <SectionHelper
                    appearance="warning"
                    fullWidth
                    actionText={checkingPlan ? 'Checking…' : 'Try again'}
                    actionDisabled={checkingPlan}
                    onAction={refreshPlan}
                  >
                    We couldn't check your plan, so Pro options stay locked for now.
                  </SectionHelper>
                )}
                </Box>
              </Cell>
              <Cell span={12}>
                <Card>
                  <Card.Header title="Verification" />
                  <Card.Divider />
                  <Card.Content>
                    <Layout gap="24px">
                      <Cell span={12}>
                        <FormField
                          label="Show the age gate on your site"
                          infoContent="Turn on, then click Save, to show the popup to every visitor. Turn off to hide it. To see it again after you've verified yourself, add ?age-gate-test to a page's address."
                          labelPlacement="right"
                          stretchContent={false}
                        >
                          <ToggleSwitch
                            checked={settings.enabled}
                            onChange={() => update('enabled', !settings.enabled)}
                          />
                        </FormField>
                      </Cell>
                      <Cell span={12}>
                        <FormField
                          label="Always show the age gate (for testing)"
                          infoContent="Ignores remembered visits so you always see the popup while you're testing. Leave this off once you're done — otherwise every real visitor sees the gate on every page, even after verifying."
                          labelPlacement="right"
                          stretchContent={false}
                        >
                          <ToggleSwitch
                            checked={settings.previewMode}
                            onChange={() => update('previewMode', !settings.previewMode)}
                          />
                        </FormField>
                      </Cell>
                      <Cell span={4}>{numberField('Minimum age', 'minimumAge', { min: 1, max: 120 })}</Cell>
                      <Cell span={4}>
                        <FormField
                          label="Verification method"
                          infoContent="Yes / No is a quick self-confirmation. Date of birth calculates the visitor's exact age."
                        >
                          <Dropdown
                            selectedId={settings.verificationMethod}
                            options={methodOptions}
                            onSelect={(option) => update('verificationMethod', option.id as VerificationMethod)}
                            aria-label="Verification method"
                          />
                        </FormField>
                      </Cell>
                      <Cell span={4}>
                        {numberField(
                          'Remember verification',
                          'verificationDays',
                          { min: 0, max: MAX_VERIFICATION_DAYS },
                          'days',
                          'How many days a visitor stays verified. Use 0 to ask again each browser session.',
                        )}
                      </Cell>
                      <Cell span={6}>
                        <FormField
                          label="Page behind the popup"
                          infoContent="How much of your site visitors can see before they confirm their age."
                        >
                          <Dropdown
                            selectedId={settings.backdrop}
                            options={BACKDROPS.map((id) => ({ id, value: BACKDROP_LABELS[id] }))}
                            onSelect={(option) => update('backdrop', option.id as Backdrop)}
                            aria-label="Page behind the popup"
                          />
                        </FormField>
                      </Cell>
                      <Cell span={12}>
                        <FormField
                          label="Redirect URL"
                          infoContent="Optional. Visitors who don't meet the age requirement are sent here instead of seeing the Access Restricted message."
                          status={redirectProblem ? 'error' : undefined}
                          statusMessage={redirectProblem ?? undefined}
                        >
                          <Input
                            value={settings.redirectUrl}
                            onChange={(event) => update('redirectUrl', event.target.value)}
                            // Tidies up as soon as they leave the field, e.g. "google.com" -> "https://google.com".
                            // Anything that isn't a usable address is left as typed, with the error showing.
                            onBlur={() => {
                              if (!redirectProblem) update('redirectUrl', normalizeRedirectUrl(settings.redirectUrl));
                            }}
                            placeholder="https://example.com"
                            status={redirectProblem ? 'error' : undefined}
                            aria-label="Redirect URL"
                          />
                        </FormField>
                      </Cell>
                    </Layout>
                  </Card.Content>
                </Card>
              </Cell>
              <Cell span={12}>
                <Layout gap="24px">
                  <Cell span={6}>
                    <Card>
                      <Card.Header
                        title="Text"
                        subtitle="Shown to every visitor. Leave a field empty to use built-in wording in the visitor's language."
                      />
                      <Card.Divider />
                      <Card.Content>
                        <Layout gap="18px">
                          <Cell span={12}>
                            {textField('Heading text', 'headingText', undefined, 'Leave blank to generate one from the minimum age and method.')}
                          </Cell>
                          <Cell span={12}>{textField('Body text', 'bodyText', strings.body)}</Cell>
                          <Cell span={12}>{textField('Yes button text', 'yesButtonText', strings.yes(settings.minimumAge))}</Cell>
                          <Cell span={12}>
                            {textField('Footer text', 'footerText', 'e.g. By entering this site you confirm you are of legal age.', 'Small print shown under the buttons. Leave blank for none.')}
                          </Cell>
                          <Cell span={12}>{textField('No button text', 'noButtonText', strings.no(settings.minimumAge))}</Cell>
                          <Cell span={12}>
                            {textField(
                              '"Access Restricted" heading',
                              'restrictedHeadingText',
                              strings.restrictedHeading,
                              "Shown to visitors who don't meet the minimum age (unless you set a Redirect URL).",
                            )}
                          </Cell>
                          <Cell span={12}>
                            {textField('"Access Restricted" message', 'restrictedBodyText', strings.restrictedBody(settings.minimumAge))}
                          </Cell>
                        </Layout>
                      </Card.Content>
                    </Card>
                  </Cell>
                  <Cell span={6}>
                    <Card>
                      <Card.Header title="Appearance/Font" />
                      <Card.Divider />
                      <Card.Content>
                        <Layout gap="18px">
                          <Cell span={6}>
                            {colorField('Heading color', 'headingColor', { resetLabel: 'Use automatic color', small: true })}
                          </Cell>
                          <Cell span={6}>
                            {colorField('Body text color', 'bodyColor', { resetLabel: 'Use automatic color', small: true })}
                          </Cell>
                          <Cell span={6}>
                            {colorField('Yes button text color', 'primaryButtonTextColor', { resetLabel: 'Use automatic color', small: true })}
                          </Cell>
                          <Cell span={6}>
                            {colorField('No button text color', 'secondaryButtonTextColor', { resetLabel: 'Use automatic color', small: true })}
                          </Cell>
                          {issues.length > 0 && (
                            <Cell span={12}>
                              <SectionHelper appearance="warning" fullWidth title="Check readability">
                                {issues.join(' ')}
                              </SectionHelper>
                            </Cell>
                          )}
                          <Cell span={6}>
                            {numberField('Heading text size', 'headingFontSize', { min: 16, max: 40 }, 'px', undefined, undefined, 150)}
                          </Cell>
                          <Cell span={6}>
                            {numberField('Button text size', 'buttonFontSize', { min: 12, max: 24 }, 'px', undefined, undefined, 150)}
                          </Cell>
                          <Cell span={6}>
                            {numberField('Footer text size', 'footerFontSize', { min: 8, max: 20 }, 'px', undefined, undefined, 150)}
                          </Cell>
                        </Layout>
                      </Card.Content>
                    </Card>
                  </Cell>
                </Layout>
              </Cell>
              <Cell span={12}>
                <Card>
                  <Card.Header
                    title="Pro features"
                    subtitle={
                      isPro
                        ? 'Themes, page targeting, other languages, custom CSS, and branding.'
                        : 'Unlock themes, page targeting, other languages, custom CSS, and branding with the Pro plan.'
                    }
                  />
                  <Card.Divider />
                  <Card.Content>
                    <div style={{ position: 'relative' }}>
                    <Layout gap="24px">
                      <Cell span={12}>
                        <FormField label="Theme">
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '12px',
                            }}
                          >
                            {(Object.keys(THEME_LABELS) as Theme[]).map((id) => {
                              const selected = settings.theme === id;
                              return (
                                <Box key={id} direction="vertical" gap="SP1" style={{ alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    disabled={!isPro}
                                    onClick={() => changeTheme(id)}
                                    aria-label={THEME_LABELS[id]}
                                    aria-pressed={selected}
                                    style={{
                                      width: '100%',
                                      padding: '3px',
                                      borderRadius: '10px',
                                      border: selected ? '2px solid #116dff' : '1px solid #dfe5eb',
                                      background: 'transparent',
                                      cursor: isPro ? 'pointer' : 'not-allowed',
                                      display: 'block',
                                      lineHeight: 0,
                                    }}
                                  >
                                    <img
                                      src={THEME_PREVIEW_IMAGES[id]}
                                      alt=""
                                      style={{ width: '100%', display: 'block', borderRadius: '7px' }}
                                    />
                                  </button>
                                  <Text size="tiny" align="center">
                                    {THEME_LABELS[id]}
                                  </Text>
                                </Box>
                              );
                            })}
                          </div>
                        </FormField>
                      </Cell>
                      <Cell span={12}>
                        <FormField
                          label="Where to show the popup"
                          infoContent="Entire site shows it everywhere. Specific pages only shows it on the pages you list below."
                        >
                          <Dropdown
                            selectedId={settings.pageTargeting}
                            options={pageTargetingOptions}
                            onSelect={(option) => update('pageTargeting', option.id as PageTargetingMode)}
                            disabled={!isPro}
                            aria-label="Where to show the popup"
                          />
                        </FormField>
                      </Cell>
                      {settings.pageTargeting === 'specific' && (
                        <Cell span={12}>
                          <FormField
                            label="Pages"
                            infoContent="Enter each page's path, e.g. /shop, or paste its full address. Use /shop/* to include every page under it. Capital letters, your free Wix site name and language folders like /fr are handled for you."
                          >
                            <Box direction="vertical" gap="SP1">
                              {targetPathList.map((path, index) => (
                                <Box key={index} gap="SP1" verticalAlign="middle">
                                  <Box style={{ flexGrow: 1 }}>
                                    <Input
                                      value={path}
                                      onChange={(event) => setTargetPath(index, event.target.value)}
                                      // Tidies a pasted address into a path, e.g. "https://site.com/Shop/" -> "/shop".
                                      onBlur={() => setTargetPath(index, normalizeTargetPath(path))}
                                      placeholder="/shop"
                                      disabled={!isPro}
                                      aria-label={`Page ${index + 1}`}
                                    />
                                  </Box>
                                  <TextButton
                                    size="small"
                                    skin="destructive"
                                    disabled={!isPro}
                                    onClick={() => removeTargetPath(index)}
                                  >
                                    Remove
                                  </TextButton>
                                </Box>
                              ))}
                              {isPro && !hasTargetPaths(settings.targetPaths) && (
                                <Text size="small" skin="error">
                                  No pages added yet — the age gate will show on every page until you add one.
                                </Text>
                              )}
                              <Box>
                                <Button size="small" priority="secondary" disabled={!isPro} onClick={addTargetPath}>
                                  + Add page
                                </Button>
                              </Box>
                            </Box>
                          </FormField>
                        </Cell>
                      )}
                      <Cell span={12}>
                        <Box direction="vertical" gap="SP1">
                          <Text weight="bold">Other languages</Text>
                          <Text size="small" secondary>
                            Add a language to show visitors the popup in their language. Leave a field empty to use
                            our ready-made wording (shown in grey), or type your own.
                          </Text>
                          {translationsIssue(settings.translations) && (
                            <Text size="small" skin="error">
                              {translationsIssue(settings.translations)}
                            </Text>
                          )}
                        </Box>
                      </Cell>
                      {settings.translations.map((translation, index) => {
                        const code = translation.code;
                        const name = code ? languageName(code) : 'this language';
                        // Typed code: chosen "Other", or a saved code that isn't in the list.
                        const typingCode = otherLanguageRows.includes(index) || (!!code && !LANGUAGE_NAMES[code]);
                        const usedElsewhere = new Set(settings.translations.filter((_, i) => i !== index).map((t) => t.code));
                        // What visitors get if a field is left empty (see resolveLocalizedSettings):
                        // built-in wording in this language when there is some, else the main text.
                        const builtIn = uiStrings(code);
                        const hasBuiltIn = hasBuiltInWording(code);
                        const fallback = (main: string, wording: string) => (hasBuiltIn ? wording : main || wording);
                        const age = settings.minimumAge;
                        const segmented = isSegmentedDobTheme(settings.theme);
                        const isDob = settings.verificationMethod === 'dob';
                        const defaultHeading = isDob ? (segmented ? builtIn.segmentedHeading : builtIn.dobHeading) : builtIn.heading(age);
                        const defaultBody = isDob && segmented ? builtIn.segmentedBody : builtIn.body;
                        const fields: { key: keyof Translation; label: string; placeholder: string }[] = [
                          { key: 'headingText', label: 'Heading', placeholder: fallback(settings.headingText, defaultHeading) },
                          { key: 'bodyText', label: 'Body text', placeholder: fallback(settings.bodyText, defaultBody) },
                          { key: 'yesButtonText', label: 'Yes button', placeholder: fallback(settings.yesButtonText, builtIn.yes(age)) },
                          { key: 'noButtonText', label: 'No button', placeholder: fallback(settings.noButtonText, builtIn.no(age)) },
                          { key: 'footerText', label: 'Footer', placeholder: settings.footerText || 'No footer' },
                          {
                            key: 'restrictedHeadingText',
                            label: '"Access Restricted" heading',
                            placeholder: fallback(settings.restrictedHeadingText, builtIn.restrictedHeading),
                          },
                          {
                            key: 'restrictedBodyText',
                            label: '"Access Restricted" message',
                            placeholder: fallback(settings.restrictedBodyText, builtIn.restrictedBody(age)),
                          },
                        ];
                        return (
                          <Cell span={12} key={index}>
                            <Box
                              direction="vertical"
                              gap="SP2"
                              style={{ border: '1px solid #dfe5eb', borderRadius: '8px', padding: '16px' }}
                            >
                              <Box gap="SP2" verticalAlign="bottom">
                                <Box style={{ width: 220 }}>
                                  <FormField label="Language">
                                    <Dropdown
                                      placeholder="Choose a language"
                                      selectedId={typingCode ? 'other' : code || undefined}
                                      options={[
                                        ...Object.entries(LANGUAGE_NAMES).map(([id, value]) => ({
                                          id,
                                          value,
                                          disabled: usedElsewhere.has(id),
                                        })),
                                        { id: 'other', value: 'Other (type a language code)' },
                                      ]}
                                      onSelect={(option) => {
                                        if (option.id === 'other') {
                                          setOtherLanguageRows((rows) => [...rows, index]);
                                          resetTranslationText(index, '');
                                        } else {
                                          setOtherLanguageRows((rows) => rows.filter((row) => row !== index));
                                          if (String(option.id) !== code) resetTranslationText(index, String(option.id));
                                        }
                                      }}
                                      disabled={!isPro}
                                      aria-label="Language"
                                    />
                                  </FormField>
                                </Box>
                                {typingCode && (
                                  <Box style={{ width: 150 }}>
                                    <FormField
                                      label="Language code"
                                      infoContent='The 2-letter code of the language, e.g. "sk" for Slovak. It must match the language your site shows visitors.'
                                    >
                                      <Input
                                        value={code}
                                        onChange={(event) => updateTranslation(index, 'code', toLanguageCode(event.target.value))}
                                        placeholder="e.g. sk"
                                        disabled={!isPro}
                                        aria-label="Language code"
                                      />
                                    </FormField>
                                  </Box>
                                )}
                                <Box style={{ paddingBottom: 8 }} gap="SP3">
                                  {hasTypedText(translation) && (
                                    <TextButton
                                      size="small"
                                      disabled={!isPro}
                                      onClick={() => resetTranslationText(index, code)}
                                    >
                                      Use ready-made wording
                                    </TextButton>
                                  )}
                                  <TextButton
                                    size="small"
                                    skin="destructive"
                                    disabled={!isPro}
                                    onClick={() => removeTranslation(index)}
                                  >
                                    Remove language
                                  </TextButton>
                                </Box>
                              </Box>
                              {fields.map(({ key, label, placeholder }) => (
                                <FormField key={key} label={`${label} (${name})`}>
                                  <Input
                                    value={translation[key]}
                                    onChange={(event) => updateTranslation(index, key, event.target.value)}
                                    placeholder={placeholder}
                                    disabled={!isPro}
                                    aria-label={`${label} (${name})`}
                                  />
                                </FormField>
                              ))}
                            </Box>
                          </Cell>
                        );
                      })}
                      <Cell span={12}>
                        <Button size="small" priority="secondary" disabled={!isPro} onClick={addTranslation}>
                          + Add language
                        </Button>
                      </Cell>
                      <Cell span={12}>
                        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                          <Box style={{ flexGrow: 1 }}>
                            <FormField
                              label="Logo"
                              infoContent="Shown above the heading. A Pro feature."
                            >
                              <Box gap="SP2" verticalAlign="middle">
                                {settings.logoUrl && (
                                  <img src={settings.logoUrl} alt="" style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain' }} />
                                )}
                                <Button size="small" priority="secondary" disabled={!isPro} onClick={chooseLogo}>
                                  {settings.logoUrl ? 'Change logo' : isPro ? 'Choose logo' : 'Choose logo — Pro'}
                                </Button>
                                {settings.logoUrl && (
                                  <TextButton size="small" disabled={!isPro} onClick={() => update('logoUrl', '')}>
                                    Remove
                                  </TextButton>
                                )}
                              </Box>
                            </FormField>
                          </Box>
                          <Box style={{ width: '140px', flexShrink: 0 }}>
                            {numberField(
                              'Button border radius',
                              'buttonBorderRadius',
                              { min: 0, max: 100 },
                              'px',
                              '0 for square corners, 100 for fully rounded buttons.',
                              !isPro,
                            )}
                          </Box>
                        </Box>
                      </Cell>
                      <Cell span={4}>
                        {colorField('Popup background color', 'popupBackgroundColor', {
                          placeholderColor: '#ffffff',
                          resetLabel: 'Use theme background',
                          disabled: !isPro,
                        })}
                      </Cell>
                      <Cell span={4}>
                        {colorField('Accent color (Yes button)', 'accentColor', {
                          placeholderColor: '#111111',
                          resetLabel: 'Use theme color',
                          disabled: !isPro,
                        })}
                      </Cell>
                      <Cell span={4}>
                        {colorField('No button color', 'noButtonColor', {
                          placeholderColor: '#666666',
                          resetLabel: 'Use outlined style',
                          disabled: !isPro,
                        })}
                      </Cell>
                      <Cell span={12}>
                        <FormField
                          label="Custom CSS"
                          infoContent="Applied after the built-in styles, so it can override anything above. Available classes: .container, .heading, .body, .buttonRow, .primaryButton (Yes), .secondaryButton (No), .logo, .footer, .dobField, .dobInput, .dobSegments, .dobSegment, .dobSlash, .dobError."
                        >
                          <InputArea
                            value={settings.customCss}
                            onChange={(event) => update('customCss', event.target.value)}
                            placeholder={'.heading {\n  font-family: Georgia, serif;\n}'}
                            rows={4}
                            maxLength={MAX_CUSTOM_CSS_LENGTH}
                            hasCounter
                            disabled={!isPro}
                            aria-label="Custom CSS"
                          />
                        </FormField>
                        <Text size="small" secondary>
                          Not sure which element is which? Right-click the popup in the Live Preview panel and choose
                          "Inspect" — it's a real, open shadow root, so DevTools shows every element and class name
                          exactly as it renders.
                        </Text>
                      </Cell>
                    </Layout>
                    {!isPro && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowProModal((current) => !current)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setShowProModal((current) => !current);
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          background: 'rgba(255, 255, 255, 0.85)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {!showProModal && (
                          <>
                            <style>{`
                              @keyframes ageGateProCtaWiggle {
                                0%, 100% { transform: rotate(-2deg); }
                                50% { transform: rotate(2deg); }
                              }
                            `}</style>
                            <button
                              type="button"
                              style={{
                                padding: '10px 22px',
                                borderRadius: '999px',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                background: 'linear-gradient(90deg, #ff7a59, #8b5cf6)',
                                animation: 'ageGateProCtaWiggle 2.4s ease-in-out infinite',
                              }}
                            >
                              Pro feature — click to learn more
                            </button>
                          </>
                        )}
                        {showProModal && (
                          <div
                            role="dialog"
                            onClick={(event) => event.stopPropagation()}
                            style={{
                              position: 'relative',
                              width: '85%',
                              maxWidth: '300px',
                              padding: '28px 20px 20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              textAlign: 'center',
                              background: '#f5f5f5',
                              borderRadius: '16px',
                              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
                              cursor: 'default',
                            }}
                          >
                            <button
                              type="button"
                              aria-label="Close"
                              onClick={() => setShowProModal(false)}
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '24px',
                                height: '24px',
                                border: 'none',
                                borderRadius: '50%',
                                background: 'transparent',
                                color: '#666666',
                                fontSize: '16px',
                                lineHeight: 1,
                                cursor: 'pointer',
                              }}
                            >
                              ×
                            </button>
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: '#fdf0d5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 24,
                                marginBottom: '2px',
                              }}
                              aria-hidden="true"
                            >
                              👑
                            </div>
                            <Text size="medium" weight="bold">
                              Upgrade to Premium
                            </Text>
                            <Text size="small" secondary>
                              Unlock this feature and more with Premium.
                            </Text>
                            <button
                              type="button"
                              onClick={() => {
                                setShowProModal(false);
                                handleUpgrade();
                              }}
                              style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '10px 0',
                                borderRadius: '999px',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                background: 'linear-gradient(90deg, #ff7a59, #8b5cf6)',
                              }}
                            >
                              Upgrade now
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </Card.Content>
                </Card>
              </Cell>
            </Layout>
              </Cell>
              <Cell span={4}>
                <div style={{ position: 'sticky', top: 24 }}>
                  <Card>
                    <Card.Header
                      title="Live preview"
                      subtitle="Updates as you edit. On your site the popup covers the whole page."
                    />
                    <Card.Divider />
                    <Card.Content>
                      <Box direction="vertical" gap="SP2">
                        <FormField label="Preview">
                          <Dropdown
                            selectedId={previewScreen}
                            options={[
                              { id: 'popup', value: 'Age question' },
                              { id: 'restricted', value: 'After answering No' },
                            ]}
                            onSelect={(option) => setPreviewScreen(option.id as 'popup' | 'restricted')}
                            aria-label="Preview screen"
                          />
                        </FormField>
                        {settings.translations.some((t) => t.code) && (
                          <FormField
                            label="Preview as a visitor in"
                            infoContent="See what visitors viewing your site in another language get, using the text you added under Other languages."
                          >
                            <Dropdown
                              selectedId={previewLanguage || 'default'}
                              options={[
                                { id: 'default', value: 'Main language' },
                                ...settings.translations
                                  .filter((t) => t.code)
                                  .map((t) => ({ id: t.code, value: languageName(t.code) })),
                              ]}
                              onSelect={(option) => setPreviewLanguage(option.id === 'default' ? '' : String(option.id))}
                              aria-label="Preview as a visitor in"
                            />
                          </FormField>
                        )}
                        <PopupPreview
                          settings={resolveLocalizedSettings(settings, previewLanguage)}
                          language={previewLanguage || siteLanguage}
                          screen={previewScreen}
                        />
                      </Box>
                    </Card.Content>
                  </Card>
                </div>
              </Cell>
            </Layout>
          )}
        </Page.Content>
      </Page>
      </div>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;
