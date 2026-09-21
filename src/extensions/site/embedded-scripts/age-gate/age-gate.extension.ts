import { extensions } from '@wix/astro/builders'

export default extensions.embeddedScript({
  id: '52917344-1de1-452a-a83b-d454ff641ffd',
  name: 'Age Gate',
  placement: 'BODY_START',
  scriptType: 'ESSENTIAL',
  source: './extensions/site/embedded-scripts/age-gate/age-gate.html',
});
