import { useCallback, useEffect, useState, type FC } from 'react';
import { dashboard } from '@wix/dashboard';
import {
  Box,
  Button,
  Card,
  Cell,
  Dropdown,
  FormField,
  Input,
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
  loadStoredSettings,
  isProTheme,
  MAX_VERIFICATION_DAYS,
  saveSettings,
  type AgeGateSettings,
  type Theme,
  type VerificationMethod,
} from '../../../../settings/settings';
import { PopupPreview } from './popup-preview';
import { contrastIssues } from '../../../../settings/color';
import { fetchPlanInfo, getUpgradeUrl, type PlanInfo } from '../../../../settings/plan';

const THEME_LABELS: Record<Theme, string> = {
  minimal: 'Minimal (light)',
  midnight: 'Midnight (dark)',
  bold: 'Bold (outlined)',
  noir: 'Noir (dark, uppercase)',
  amber: 'Amber (yellow buttons)',
};

const colorInputStyle = {
  width: '100%',
  height: '36px',
  border: '1px solid #dfe5eb',
  borderRadius: '4px',
  cursor: 'pointer',
  padding: '2px',
};

const DashboardPage: FC = () => {
  const [settings, setSettings] = useState<AgeGateSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AgeGateSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    // The plan and the saved settings load independently, so a settings problem
    // (for example a missing collection) can't hide the plan.
    const loadSettings = async () => {
      try {
        const stored = await loadStoredSettings();
        if (stored) {
          setSettings(stored);
          setSavedSettings(stored);
        }
      } catch (error) {
        console.error('Failed to load age gate settings:', error);
        const reason = error instanceof Error ? error.message : String(error);
        dashboard.showToast({ message: `Could not load your settings: ${reason}`, type: 'error', timeout: 'none' });
      }
    };

    Promise.all([loadSettings(), fetchPlanInfo().then(setPlan)]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const { remove } = dashboard.onBeforeUnload((event) => event.preventDefault());
    return remove;
  }, [dirty]);

  const update = useCallback(
    <K extends keyof AgeGateSettings>(key: K, value: AgeGateSettings[K]) =>
      setSettings((current) => ({ ...current, [key]: value })),
    [],
  );

  const isPro = plan?.isPro ?? false;
  const planKnown = plan !== null && plan.status !== 'unknown';

  const handleUpgrade = () => {
    window.open(getUpgradeUrl(plan?.instanceId ?? null), '_blank', 'noopener,noreferrer');
  };

  // Re-reads the plan, e.g. after upgrading in another tab.
  const refreshPlan = async () => {
    setCheckingPlan(true);
    setPlan(await fetchPlanInfo());
    setCheckingPlan(false);
  };

  const handleSave = async () => {
    // Free plans can't keep Pro options, even if they were saved before a downgrade.
    const toSave: AgeGateSettings = isPro
      ? settings
      : {
          ...settings,
          verificationMethod: settings.verificationMethod === 'dob' ? 'button' : settings.verificationMethod,
          theme: isProTheme(settings.theme) ? 'minimal' : settings.theme,
          logoUrl: '',
        };

    setSaving(true);
    try {
      await saveSettings(toSave);
      setSettings(toSave);
      setSavedSettings(toSave);
      dashboard.showToast({ message: 'Settings saved.', type: 'success' });
    } catch (error) {
      console.error('Failed to save age gate settings:', error);
      const reason = error instanceof Error ? error.message : String(error);
      dashboard.showToast({ message: `Could not save your settings: ${reason}`, type: 'error', timeout: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = (Object.keys(THEME_LABELS) as Theme[]).map((id) => {
    const locked = isProTheme(id) && !isPro;
    return { id, value: locked ? `${THEME_LABELS[id]} — Pro` : THEME_LABELS[id], disabled: locked };
  });

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

  const textField = (
    label: string,
    key: 'headingText' | 'bodyText' | 'yesButtonText' | 'noButtonText' | 'redirectUrl' | 'footerText',
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
    key: 'minimumAge' | 'verificationDays' | 'headingFontSize' | 'buttonFontSize' | 'buttonBorderRadius',
    range: { min: number; max: number },
    suffix?: string,
    infoContent?: string,
  ) => (
    <FormField label={label} infoContent={infoContent}>
      <NumberInput
        min={range.min}
        max={range.max}
        value={settings[key]}
        onChange={(value) => {
          if (value !== null) update(key, value);
        }}
        suffix={suffix ? <Text size="small" secondary>{suffix}</Text> : undefined}
        aria-label={label}
      />
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
    options?: { placeholderColor?: string; resetLabel?: string },
  ) => (
    <FormField label={label}>
      <input
        type="color"
        value={settings[key] || options?.placeholderColor || '#111111'}
        onChange={(event) => update(key, event.target.value)}
        style={colorInputStyle}
        aria-label={label}
      />
      {options?.resetLabel && settings[key] && (
        <TextButton size="small" onClick={() => update(key, '')}>
          {options.resetLabel}
        </TextButton>
      )}
    </FormField>
  );

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

  return (
    <WixDesignSystemProvider>
      <Page maxWidth={1240}>
        <Page.Header
          title="Age Gate Settings"
          subtitle="Site-wide defaults for every age verification popup. A setting changed in a widget's own panel overrides these."
          actionsBar={
            <Box gap="SP2">
              {planKnown && !isPro && !loading && (
                <Button skin="premium" onClick={handleUpgrade}>
                  Upgrade
                </Button>
              )}
              <Button onClick={handleSave} disabled={!dirty || loading}>
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
                {plan?.status === 'unknown' ? (
                  <SectionHelper
                    appearance="warning"
                    fullWidth
                    actionText={checkingPlan ? 'Checking…' : 'Try again'}
                    actionDisabled={checkingPlan}
                    onAction={refreshPlan}
                  >
                    We couldn't check your plan, so Pro options stay locked for now.
                  </SectionHelper>
                ) : !isPro ? (
                  <SectionHelper
                    appearance="premium"
                    fullWidth
                    actionText="Upgrade"
                    onAction={handleUpgrade}
                    secondaryActionProps={{ label: checkingPlan ? 'Checking…' : "I've upgraded — refresh", onClick: refreshPlan }}
                  >
                    Date of birth verification, premium themes and a custom logo are Pro features. {plan?.isPaid ? 'Upgrade to the Pro plan to turn them on.' : 'Upgrade your plan to turn them on.'}
                  </SectionHelper>
                ) : (
                  <Text size="small" secondary>
                    Plan: {plan?.packageName ?? 'Pro'}
                  </Text>
                )}
              </Cell>
              <Cell span={12}>
                <Card>
                  <Card.Header title="Verification" />
                  <Card.Divider />
                  <Card.Content>
                    <Layout gap="24px">
                      <Cell span={12}>
                        <FormField
                          label="Enable for live site"
                          infoContent="While off, the popup shows on every visit so you can test it. Turn on to remember visitors who verified."
                          labelPlacement="right"
                          stretchContent={false}
                        >
                          <ToggleSwitch
                            checked={settings.liveMode}
                            onChange={() => update('liveMode', !settings.liveMode)}
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
                      <Cell span={12}>
                        {textField(
                          'Redirect URL',
                          'redirectUrl',
                          'https://example.com',
                          "Optional. Visitors who don't meet the age requirement are sent here instead of seeing the Access Restricted message.",
                        )}
                      </Cell>
                    </Layout>
                  </Card.Content>
                </Card>
              </Cell>
              <Cell span={12}>
                <Card>
                  <Card.Header title="Text" />
                  <Card.Divider />
                  <Card.Content>
                    <Layout gap="24px">
                      <Cell span={6}>
                        {textField('Heading text', 'headingText', undefined, 'Leave blank to generate one from the minimum age and method.')}
                      </Cell>
                      <Cell span={6}>{textField('Body text', 'bodyText', 'You must confirm your age to view this site.')}</Cell>
                      <Cell span={6}>{textField('Yes button text', 'yesButtonText', `Yes, I am ${settings.minimumAge}+`)}</Cell>
                      <Cell span={12}>
                        {textField('Footer text', 'footerText', 'e.g. By entering this site you confirm you are of legal age.', 'Small print shown under the buttons. Leave blank for none.')}
                      </Cell>
                      <Cell span={6}>{textField('No button text', 'noButtonText', `No, I am ${settings.minimumAge}`)}</Cell>
                    </Layout>
                  </Card.Content>
                </Card>
              </Cell>
              <Cell span={12}>
                <Card>
                  <Card.Header title="Appearance" />
                  <Card.Divider />
                  <Card.Content>
                    <Layout gap="24px">
                      <Cell span={12}>
                        <FormField label="Theme">
                          <Dropdown
                            selectedId={settings.theme}
                            options={themeOptions}
                            onSelect={(option) => update('theme', option.id as Theme)}
                            aria-label="Theme"
                          />
                        </FormField>
                      </Cell>
                      <Cell span={12}>
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
                              <TextButton size="small" onClick={() => update('logoUrl', '')}>
                                Remove
                              </TextButton>
                            )}
                          </Box>
                        </FormField>
                      </Cell>
                      <Cell span={6}>
                        {colorField('Popup background color', 'popupBackgroundColor', {
                          placeholderColor: '#ffffff',
                          resetLabel: 'Use theme background',
                        })}
                      </Cell>
                      <Cell span={6}>{colorField('Accent color (Yes button)', 'accentColor', {
                          placeholderColor: '#111111',
                          resetLabel: 'Use theme color',
                        })}</Cell>
                      <Cell span={6}>
                        {colorField('No button color', 'noButtonColor', {
                          placeholderColor: '#666666',
                          resetLabel: 'Use outlined style',
                        })}
                      </Cell>
                      <Cell span={6}>
                        {colorField('Heading color', 'headingColor', { resetLabel: 'Use automatic color' })}
                      </Cell>
                      <Cell span={6}>
                        {colorField('Body text color', 'bodyColor', { resetLabel: 'Use automatic color' })}
                      </Cell>
                      <Cell span={6}>
                        {colorField('Yes button text color', 'primaryButtonTextColor', { resetLabel: 'Use automatic color' })}
                      </Cell>
                      <Cell span={6}>
                        {colorField('No button text color', 'secondaryButtonTextColor', { resetLabel: 'Use automatic color' })}
                      </Cell>
                      {issues.length > 0 && (
                        <Cell span={12}>
                          <SectionHelper appearance="warning" fullWidth title="Check readability">
                            {issues.join(' ')}
                          </SectionHelper>
                        </Cell>
                      )}
                      <Cell span={4}>{numberField('Heading size', 'headingFontSize', { min: 16, max: 40 }, 'px')}</Cell>
                      <Cell span={4}>{numberField('Button text size', 'buttonFontSize', { min: 12, max: 24 }, 'px')}</Cell>
                      <Cell span={4}>{numberField('Button border radius', 'buttonBorderRadius', { min: 0, max: 100 }, 'px', '0 for square corners, 100 for fully rounded buttons.')}</Cell>
                    </Layout>
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
                      <PopupPreview settings={settings} />
                    </Card.Content>
                  </Card>
                </div>
              </Cell>
            </Layout>
          )}
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;
