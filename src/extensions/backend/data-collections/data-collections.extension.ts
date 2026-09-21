import { extensions } from '@wix/astro/builders'

import ageGateSettingsCollection from './age-gate-settings';

export default extensions.dataCollections({
  id: 'b8c36f55-98b5-468c-84ca-21e96005c6df',
  name: 'Data Collections',
  collections: [ageGateSettingsCollection],
});
