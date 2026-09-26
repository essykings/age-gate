import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';
import ageGate from './extensions/site/embedded-scripts/age-gate/age-gate.extension.ts';

import reviewPrompt from './extensions/dashboard/modals/review-prompt/review-prompt.extension.ts';

export default app()
  .use(myPage).use(ageGate).use(reviewPrompt);
