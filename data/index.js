// 모든 데이터를 한곳에 모읍니다. 코드는 이 파일만 import 합니다.
import config from './config.js'
import schools from './schools.js'
import majors from './majors.js'
import tracks from './tracks.js'
import careers from './careers/index.js'
import events from './events/index.js'
import endings from './endings.js'
import duel from './minigames/duel.js'
import assets from './assets.js'
import names from './names.js'

export default {
  config, schools, majors, tracks, careers, events, endings, assets, names,
  minigames: { duel },
}
