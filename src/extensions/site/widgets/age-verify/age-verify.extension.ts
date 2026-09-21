import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: '7e94f35b-c5ec-4516-ad12-ecfa8f53f208',
  name: 'Age verify',
  width: {
    defaultWidth: 450,
    allowStretch: true
  },
  height: {
    defaultHeight: 250
  },
  installation: {
    autoAdd: true
  },
  presets: [
    {
      id: '4523c2d4-6aec-4cbc-a0be-2a1278d27b96',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/age-verify-thumbnail.png',
    },
  ],
  
  tagName: 'age-verify',
  element: './extensions/site/widgets/age-verify/age-verify.tsx',
  settings: './extensions/site/widgets/age-verify/age-verify.panel.tsx',
});
