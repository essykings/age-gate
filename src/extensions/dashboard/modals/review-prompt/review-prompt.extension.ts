import { extensions } from '@wix/astro/builders'
import config from './review-prompt.config.ts';

export default extensions.dashboardModal({
  id: 'f5435726-b327-45d2-b53a-fd32939aef40',
  title: config.title,
  width: config.width,
  height: config.height,
  component: './extensions/dashboard/modals/review-prompt/review-prompt.tsx',
});
