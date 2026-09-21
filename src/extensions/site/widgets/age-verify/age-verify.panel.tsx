import React, { type FC, useState, useEffect, useCallback } from 'react';
import { widget } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
  Input,
  FormField,
  SectionHelper,
  ToggleSwitch,
  Dropdown,
  NumberInput,
  Text,
  TextButton,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { fetchPlanInfo } from '../../../../settings/plan';
import { MAX_VERIFICATION_DAYS, isProTheme, parseVerificationDays, type Theme } from '../../../../settings/settings';

const SITE_WIDGETS_DOCS = 'https://dev.wix.com/docs/wix-cli/guides/extensions/site-extensions/site-widgets/site-widget-extension-files-and-code';

const THEME_LABELS: Record<Theme, string> = {
  minimal: 'Minimal (light)',
  midnight: 'Midnight (dark)',
  bold: 'Bold (outlined)',
  noir: 'Noir (dark, uppercase)',
  amber: 'Amber (yellow buttons)',
};

const VERIFICATION_METHOD_OPTIONS = [
  { id: 'button', value: 'Yes / No buttons' },
  { id: 'dob', value: 'Date of birth' ,disbaled :true},
];


// An optional colour stored as a widget prop. Empty means "automatic": the popup picks a
// readable colour for the current background.
const OptionalColorField: FC<{ label: string; prop: string; infoContent?: string }> = ({ label, prop, infoContent }) => {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    widget.getProp(prop)
      .then(saved => setValue(saved || ''))
      .catch(error => console.error(`Failed to fetch ${prop}:`, error));
  }, [prop]);

  const change = (next: string) => {
    setValue(next);
    widget.setProp(prop, next);
  };

  return (
    <FormField label={label} infoContent={infoContent}>
      <input
        type="color"
        value={value || '#111111'}
        onChange={(event) => change(event.target.value)}
        style={{ width: '100%', height: '36px', border: '1px solid #dfe5eb', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
        aria-label={label}
      />
      {value && <TextButton size="small" onClick={() => change('')}>Use automatic color</TextButton>}
    </FormField>
  );
};

const Panel: FC = () => {

  const [isPro, setIsPro] = useState(false);
  // True only once the plan was confirmed as not Pro. A failed check must not wipe Pro settings.
  const [planIsNotPro, setPlanIsNotPro] = useState(false);
  const [footerText, setFooterText] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [minimumAge, setMinimumAge] = useState<string>('21');
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [headingText, setHeadingText] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');


  //buttons
  const [accentColor, setAccentColor] = useState<string>('#111111');
  const [noButtonColor, setNoButtonColor] = useState<string>('#666666');
  const [yesButtonText, setYesButtonText] = useState<string>('');
  const [noButtonText, setNoButtonText] = useState<string>('');
  const [buttonFontSize, setButtonFontSize] = useState<string>('14');
  const [buttonBorderRadius, setButtonBorderRadius] =
  useState<string>('8');

//headings
  const [headingFontSize, setHeadingFontSize] = useState<string>('22');


  const [redirectUrl, setRedirectUrl] = useState<string>('');
//background
  const [popupBackgroundColor, setPopupBackgroundColor] = useState<string>('#ffffff');
  


  const [theme, setTheme] = useState<string>('minimal');


  const [verificationDays, setVerificationDays] = useState<number>(30);
  const [verificationMethod, setVerificationMethod] = useState<string>('button');
  const themeOptions = (Object.keys(THEME_LABELS) as Theme[]).map((id) => {
    const locked = isProTheme(id) && !isPro;
    return { id, value: locked ? `${THEME_LABELS[id]} — Pro` : THEME_LABELS[id], disabled: locked };
  });
  const verificationMethodOptions = [
    { id: 'button', value: 'Yes / No buttons' },
    {
      id: 'dob',
      value: isPro ? 'Date of birth' : 'Date of birth — Pro',
      disabled: !isPro,
    },
  ];


  useEffect(() => {
    fetchPlanInfo().then((plan) => {
      setIsPro(plan.isPro);
      setPlanIsNotPro(plan.status !== 'unknown' && !plan.isPro);
    });
  }, []);

  useEffect(() => {
    widget.getProp('display-name')
      .then(displayName => setDisplayName(displayName || `Your Widget's Title`))
      .catch(error => console.error('Failed to fetch display-name:', error));
  }, [setDisplayName]);

  useEffect(() => {
    widget.getProp('minimum-age')
      .then(minimumAge => setMinimumAge(minimumAge || '21'))
      .catch(error => console.error('Failed to fetch minimum-age:', error));
  }, [setMinimumAge]);

  useEffect(() => {
    widget.getProp('live-mode')
      .then(liveMode => setLiveMode(liveMode === 'true'))
      .catch(error => console.error('Failed to fetch live-mode:', error));
  }, [setLiveMode]);

  useEffect(() => {
    widget.getProp('heading-text')
      .then(value => setHeadingText(value || ''))
      .catch(error => console.error('Failed to fetch heading-text:', error));
  }, [setHeadingText]);

  useEffect(() => {
    widget.getProp('body-text')
      .then(value => setBodyText(value || ''))
      .catch(error => console.error('Failed to fetch body-text:', error));
  }, [setBodyText]);

  useEffect(() => {
    widget.getProp('accent-color')
      .then(value => setAccentColor(value || '#111111'))
      .catch(error => console.error('Failed to fetch accent-color:', error));
  }, [setAccentColor]);

  useEffect(() => {
    widget.getProp('no-button-color')
      .then(value => setNoButtonColor(value || '#666666'))
      .catch(error => console.error('Failed to fetch no-button-color:', error));
  }, [setNoButtonColor]);

  useEffect(() => {
    widget.getProp('yes-button-text')
      .then(value => setYesButtonText(value || ''))
      .catch(error => console.error('Failed to fetch yes-button-text:', error));
  }, [setYesButtonText]);

  useEffect(() => {
    widget.getProp('no-button-text')
      .then(value => setNoButtonText(value || ''))
      .catch(error => console.error('Failed to fetch no-button-text:', error));
  }, [setNoButtonText]);

  useEffect(() => {
    widget.getProp('redirect-url')
      .then(value => setRedirectUrl(value || ''))
      .catch(error => console.error('Failed to fetch redirect-url:', error));
  }, [setRedirectUrl]);

  useEffect(() => {
    widget.getProp('button-border-radius')
      .then(value => setButtonBorderRadius(String(value || '').replace('px', '')))
      .catch(error => console.error('Failed to fetch button-border-radius:', error));
  }, [setButtonBorderRadius]);

  useEffect(() => {
    widget.getProp('popup-background-color')
      .then(value => setPopupBackgroundColor(value || '#ffffff'))
      .catch(error => console.error('Failed to fetch popup-background-color:', error));
  }, [setPopupBackgroundColor]);


  useEffect(() => {
    widget.getProp('heading-font-size')
      .then(value => {
        setHeadingFontSize(String(value || '22').replace('px', ''));
      })
      .catch(error =>
        console.error('Failed to fetch heading-font-size:', error)
      );
  }, []);
  
 

  useEffect(() => {
    widget.getProp('button-font-size')
      .then(value => {
        setButtonFontSize(String(value || '14').replace('px', ''));
      })
      .catch(error =>
        console.error('Failed to fetch button-font-size:', error)
      );
  }, []);
  
  useEffect(() => {
    widget.getProp('verification-duration')
      .then(value => setVerificationDays(parseVerificationDays(value, 30)))
      .catch(error => console.error('Failed to fetch verification-duration:', error));
  }, []);

  useEffect(() => {
    widget.getProp('theme')
      .then(value => {
        const saved = (value || 'minimal') as Theme;
        // A Free plan can't keep a Pro theme, e.g. after a downgrade.
        if (isProTheme(saved) && planIsNotPro) {
          setTheme('minimal');
          widget.setProp('theme', 'minimal');
          return;
        }
        setTheme(saved);
      })
      .catch(error => console.error('Failed to fetch theme:', error));
  }, [setTheme, planIsNotPro]);

  useEffect(() => {
    widget.getProp('footer-text')
      .then(value => setFooterText(value || ''))
      .catch(error => console.error('Failed to fetch footer-text:', error));
  }, []);

  useEffect(() => {
    widget.getProp('verification-method')
      .then(value => {
        const method = value || 'button';
  
        // Never allow a Free plan to keep DOB selected.
        if (method === 'dob' && planIsNotPro) {
          setVerificationMethod('button');
          widget.setProp('verification-method', 'button');
          return;
        }
  
        setVerificationMethod(method);
      })
      .catch(error =>
        console.error('Failed to fetch verification-method:', error)
      );
  }, [planIsNotPro]);

  const handleVerificationDaysChange = useCallback((value: number | null) => {
    if (value === null) return;
    const days = parseVerificationDays(value, 30);
    setVerificationDays(days);
    widget.setProp('verification-duration', String(days));
  }, []);

  const handleDisplayNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayName = event.target.value;
    setDisplayName(newDisplayName);
    widget.setProp('display-name', newDisplayName);
  }, [setDisplayName]);

  const handleMinimumAgeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newMinimumAge = event.target.value;
    setMinimumAge(newMinimumAge);
    widget.setProp('minimum-age', newMinimumAge);
  }, [setMinimumAge]);

  const handleLiveModeChange = useCallback(() => {
    const newLiveMode = !liveMode;
    setLiveMode(newLiveMode);
    widget.setProp('live-mode', String(newLiveMode));
  }, [liveMode]);

  const handleHeadingTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setHeadingText(value);
    widget.setProp('heading-text', value);
  }, [setHeadingText]);

  const handleBodyTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setBodyText(value);
    widget.setProp('body-text', value);
  }, [setBodyText]);

  const handleAccentColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAccentColor(value);
    widget.setProp('accent-color', value);
  }, [setAccentColor]);

  const handleNoButtonColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNoButtonColor(value);
    widget.setProp('no-button-color', value);
  }, [setNoButtonColor]);

  const handleYesButtonTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setYesButtonText(value);
    widget.setProp('yes-button-text', value);
  }, [setYesButtonText]);

  const handleNoButtonTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNoButtonText(value);
    widget.setProp('no-button-text', value);
  }, [setNoButtonText]);

  const handleRedirectUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setRedirectUrl(value);
    widget.setProp('redirect-url', value);
  }, [setRedirectUrl]);

  const handleButtonFontSizeChange = useCallback((value: number | null) => {
    if (value === null) return;
    setButtonFontSize(String(value));
    widget.setProp('button-font-size', `${value}px`);
  }, []);
  const handleHeadingFontSizeChange = useCallback((value: number | null) => {
    if (value === null) return;
    setHeadingFontSize(String(value));
    widget.setProp('heading-font-size', `${value}px`);
  }, []);
  


  const handleButtonBorderRadiusChange = useCallback((value: number | null) => {
    if (value === null) return;
    setButtonBorderRadius(String(value));
    widget.setProp('button-border-radius', `${value}px`);
  }, []);

  const handlePopupBackgroundColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPopupBackgroundColor(value);
    widget.setProp('popup-background-color', value);
  }, [setPopupBackgroundColor]);

  const handleThemeChange = useCallback((option: { id: string | number }) => {
    const newTheme = String(option.id);
    if (isProTheme(newTheme as Theme) && !isPro) return;
    setTheme(newTheme);
    widget.setProp('theme', newTheme);
  }, [setTheme, isPro]);
  const handleVerificationMethodChange = useCallback(
    (option: { id: string | number }) => {
      const newMethod = String(option.id);
  
      // DOB is a Pro-only feature.
      if (newMethod === 'dob' && !isPro) {
        return;
      }
  
      setVerificationMethod(newMethod);
      widget.setProp('verification-method', newMethod);
    },
    [isPro]
  );
  // const handleVerificationMethodChange = useCallback((option: { id: string | number }) => {
  //   const newMethod = String(option.id);
  //   setVerificationMethod(newMethod);
  //   widget.setProp('verification-method', newMethod);
  // }, [setVerificationMethod]);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300" height="100vh">
        <SidePanel.Content noPadding stretchVertically>
          <SidePanel.Field>
            <FormField label="Display Name">
              <Input
                type="text"
                value={displayName}
                onChange={handleDisplayNameChange}
                aria-label="Display Name"
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Minimum Age">
              <Input
                type="number"
                value={minimumAge}
                onChange={handleMinimumAgeChange}
                aria-label="Minimum Age"
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Enable for live site">
              <ToggleSwitch
                checked={liveMode}
                onChange={handleLiveModeChange}
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Theme">
              <Dropdown
                selectedId={theme}
                onSelect={handleThemeChange}
                options={themeOptions}
                aria-label="Theme"
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField
              label="Verification Method"
              infoContent="Yes / No is a quick self-confirmation. Date of Birth calculates the visitor's exact age from what they enter."
            >
              <Dropdown
  selectedId={verificationMethod}
  onSelect={handleVerificationMethodChange}
  options={verificationMethodOptions}
  aria-label="Verification Method"
/>

            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Heading Text" infoContent="Leave blank to auto-generate based on Minimum Age and Verification Method">
              <Input
                type="text"
                value={headingText}
                onChange={handleHeadingTextChange}
                placeholder={verificationMethod === 'dob'
                  ? 'Please confirm your date of birth'
                  : `Are you ${minimumAge} or older?`}
                aria-label="Heading Text"
              />
            </FormField>
          </SidePanel.Field>

          <SidePanel.Field>
  <FormField label="Heading Size">
    <NumberInput
      min={16}
      max={40}
      value={Number(headingFontSize)}
      onChange={handleHeadingFontSizeChange}
      suffix={<Text size="small" secondary>px</Text>}
      aria-label="Heading Size"
    />
  </FormField>
</SidePanel.Field>

<SidePanel.Field>
  <FormField label="Button Text Size">
    <NumberInput
      min={12}
      max={24}
      value={Number(buttonFontSize)}
      onChange={handleButtonFontSizeChange}
      suffix={<Text size="small" secondary>px</Text>}
      aria-label="Button Text Size"
    />
  </FormField>
</SidePanel.Field>

<SidePanel.Field>
  <FormField
    label="Remember Verification"
    infoContent="How many days a visitor stays verified before they need to verify again. Use 0 to ask again each browser session."
  >
    <NumberInput
      min={0}
      max={MAX_VERIFICATION_DAYS}
      value={verificationDays}
      onChange={handleVerificationDaysChange}
      suffix={<Text size="small" secondary>days</Text>}
      aria-label="Remember Verification"
    />
  </FormField>
</SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Body Text">
              <Input
                type="text"
                value={bodyText}
                onChange={handleBodyTextChange}
                placeholder="You must confirm your age to view this site."
                aria-label="Body Text"
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Footer Text" infoContent="Small print shown under the buttons. Leave blank for none.">
              <Input
                type="text"
                value={footerText}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setFooterText(event.target.value);
                  widget.setProp('footer-text', event.target.value);
                }}
                aria-label="Footer Text"
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Popup Background Color">
              <input
                type="color"
                value={popupBackgroundColor}
                onChange={handlePopupBackgroundColorChange}
                style={{ width: '100%', height: '36px', border: '1px solid #dfe5eb', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <OptionalColorField
              label="Heading Color"
              prop="heading-color"
              infoContent="Leave automatic to pick a readable color for the popup background."
            />
          </SidePanel.Field>
          <SidePanel.Field>
            <OptionalColorField label="Body Text Color" prop="body-color" />
          </SidePanel.Field>
          <SidePanel.Field>
            <OptionalColorField label="Yes Button Text Color" prop="primary-button-text-color" />
          </SidePanel.Field>
          <SidePanel.Field>
            <OptionalColorField label="No Button Text Color" prop="secondary-button-text-color" />
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Accent Color" infoContent="Used for the primary/Yes button and other highlights.">
              <input
                type="color"
                value={accentColor}
                onChange={handleAccentColorChange}
                style={{ width: '100%', height: '36px', border: '1px solid #dfe5eb', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Button Border Radius" infoContent="In pixels — 0 for square corners, 100 for fully rounded pill buttons.">
              <NumberInput
                min={0}
                max={100}
                value={Number(buttonBorderRadius || 0)}
                onChange={handleButtonBorderRadiusChange}
                suffix={<Text size="small" secondary>px</Text>}
                aria-label="Button Border Radius"
              />
            </FormField>
          </SidePanel.Field>
          {verificationMethod === 'button' && (
            <>
              <SidePanel.Field>
                <FormField label="No Button Color">
                  <input
                    type="color"
                    value={noButtonColor}
                    onChange={handleNoButtonColorChange}
                    style={{ width: '100%', height: '36px', border: '1px solid #dfe5eb', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                  />
                </FormField>
              </SidePanel.Field>
              <SidePanel.Field>
                <FormField label="Yes Button Text">
                  <Input
                    type="text"
                    value={yesButtonText}
                    onChange={handleYesButtonTextChange}
                    placeholder={`Yes, I am ${minimumAge}+`}
                    aria-label="Yes Button Text"
                  />
                </FormField>
              </SidePanel.Field>
              <SidePanel.Field>
                <FormField label="No Button Text">
                  <Input
                    type="text"
                    value={noButtonText}
                    onChange={handleNoButtonTextChange}
                    placeholder="No"
                    aria-label="No Button Text"
                  />
                </FormField>
              </SidePanel.Field>
            </>
          )}
          <SidePanel.Field>
            <FormField
              label="Redirect URL"
              infoContent="Optional. If set, visitors who don't meet the age requirement are sent here instead of seeing the Access Restricted message — applies whether they click No or fail the Date of Birth check."
            >
              <Input
                type="text"
                value={redirectUrl}
                onChange={handleRedirectUrlChange}
                placeholder="https://example.com"
                aria-label="Redirect URL"
              />
            </FormField>
          </SidePanel.Field>
        </SidePanel.Content>
        <SidePanel.Footer noPadding>
          <SectionHelper fullWidth appearance="success" border="topBottom">
            Learn more about <a href={SITE_WIDGETS_DOCS} target="_blank" rel="noopener noreferrer" title="Site Widget docs">Site Widgets</a>
          </SectionHelper>
        </SidePanel.Footer>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;