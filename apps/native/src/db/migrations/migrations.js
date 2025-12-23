// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_polite_lightspeed.sql';
import m0001 from './0001_left_selene.sql';
import m0002 from './0002_colorful_greymalkin.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  