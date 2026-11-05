// 도트 그래픽 설정. js/pixel.js가 이 값으로 픽셀을 그립니다(이미지 파일 없음).
// 사람 look: { skin, hair, hairStyle(short long bun spiky bald), top, sleeve, bottom, shoes, dress,
//              hat(cap beanie beret headset headband hood veil hardhat), hatColor, acc[], accColor, face }
//   acc: glasses shades tie vest apron camera backpack phone clipboard megaphone wheel drone brush mic pearl gloves medal scarf
// 몬스터: { shape(blob ghost cloud ball box bird cup clock golem fairy swirl), color, eye(normal angry red sleepy), mouth, acc[] }
//   acc: plug battery plus steam drops sdcard dollar tie slate antenna screen zzz bolt crack
// 새 직업·적을 추가하면 여기에 한 줄만 넣으세요. 없으면 _default 모습.

const crew = { skin: '#f2c49b', hair: '#3a2a1e', top: '#343a40', bottom: '#495057', shoes: '#212529' }

export const looks = {
  _default: { ...crew, top: '#5c7cfa' },
  // 촬영 정석 루트
  cam_maknae:   { ...crew, top: '#4263eb', hat: 'cap', hatColor: '#1c7ed6', acc: ['gloves'] },
  cam_third:    { ...crew, top: '#364fc7', hat: 'cap', hatColor: '#e03131', acc: ['gloves'] },
  cam_second:   { ...crew, top: '#212529', hat: 'cap', hatColor: '#212529', acc: ['camera'] },
  cam_first:    { ...crew, top: '#1b1a26', hat: 'beanie', hatColor: '#495057', acc: ['wheel'] },
  b_cam:        { ...crew, top: '#5f3dc4', hat: 'beanie', hatColor: '#7048e8', acc: ['camera'] },
  eternal_first:{ ...crew, top: '#1b1a26', hat: 'beanie', hatColor: '#c92a2a', acc: ['wheel', 'medal'] },
  dop_film:     { ...crew, hair: '#212529', top: '#5c3a21', sleeve: '#4a2e1a', hat: 'beret', hatColor: '#1b1a26', acc: ['scarf', 'camera'], accColor: '#c92a2a' },
  dop_ott:      { ...crew, top: '#1864ab', hat: 'beret', hatColor: '#212529', acc: ['scarf', 'camera'], accColor: '#74c0fc' },
  dop_ad:       { ...crew, top: '#f8f9fa', bottom: '#212529', hat: 'beret', hatColor: '#e64980', acc: ['shades', 'camera'] },
  dop_indie:    { ...crew, hair: '#5c3a21', hairStyle: 'long', top: '#2b8a3e', hat: 'beret', hatColor: '#2f9e44', acc: ['scarf'], accColor: '#fab005' },
  dop_bunit:    { ...crew, top: '#7048e8', hat: 'cap', hatColor: '#5f3dc4', acc: ['camera'] },
  // 그립 · 스테디캠
  grip:         { ...crew, top: '#e8590c', hat: 'hardhat', acc: ['gloves', 'vest'] },
  key_grip:     { ...crew, top: '#d9480f', hat: 'hardhat', acc: ['gloves', 'vest'] },
  grip_chief:   { ...crew, top: '#c92a2a', hat: 'hardhat', acc: ['gloves', 'vest', 'megaphone'] },
  grip_legend:  { ...crew, hair: '#adb5bd', top: '#c92a2a', hat: 'hardhat', acc: ['gloves', 'vest', 'medal'] },
  steadicam:    { ...crew, top: '#212529', hat: 'headband', hatColor: '#f59f00', acc: ['vest', 'camera'] },
  steadicam_ace:{ ...crew, top: '#212529', hat: 'headband', hatColor: '#e03131', acc: ['vest', 'camera'] },
  steadicam_master: { ...crew, hair: '#868e96', top: '#1b1a26', hat: 'headband', hatColor: '#fcc419', acc: ['vest', 'camera', 'medal'] },
  // 데이터 · 후반
  data_wrangler:{ ...crew, top: '#0b7285', hat: 'hood', hatColor: '#0c8599', acc: ['glasses'] },
  dit:          { ...crew, top: '#0b7285', hat: 'headset', acc: ['glasses'] },
  dit_chief:    { ...crew, top: '#0a5c6b', hat: 'headset', acc: ['glasses', 'clipboard'] },
  colorist:     { ...crew, hair: '#9c36b5', top: '#1b1a26', acc: ['glasses', 'scarf'], accColor: '#f06595' },
  colorist_master: { ...crew, hair: '#e64980', hairStyle: 'spiky', top: '#1b1a26', acc: ['glasses', 'scarf', 'medal'], accColor: '#f06595' },
  post_supervisor: { ...crew, top: '#343a40', hat: 'headset', acc: ['glasses', 'tie'] },
  drone:        { ...crew, top: '#2b8a3e', hat: 'cap', hatColor: '#2f9e44', acc: ['drone'] },
  aerial:       { ...crew, top: '#2b8a3e', hat: 'headset', acc: ['drone', 'shades'] },
  aerial_master:{ ...crew, top: '#5c940d', hat: 'headset', acc: ['drone', 'shades', 'medal'] },
  // 프리랜서 · 광고 · 사업
  freelancer:   { ...crew, top: '#f08c00', hat: 'beanie', hatColor: '#f59f00', acc: ['backpack'] },
  freelance_cam:{ ...crew, top: '#e67700', hat: 'cap', hatColor: '#f59f00', acc: ['backpack', 'camera'] },
  freelance_dop:{ ...crew, top: '#d9480f', hat: 'beret', hatColor: '#f59f00', acc: ['backpack', 'camera'] },
  freelance_legend: { ...crew, hair: '#868e96', top: '#d9480f', hat: 'beret', hatColor: '#fcc419', acc: ['backpack', 'camera', 'medal'] },
  ad_cam:       { ...crew, top: '#f8f9fa', bottom: '#343a40', hat: 'cap', hatColor: '#212529', acc: ['camera'] },
  ad_cam_chief: { ...crew, top: '#f8f9fa', bottom: '#212529', acc: ['shades', 'camera'] },
  rental_manager:{ ...crew, top: '#495057', acc: ['apron', 'clipboard'] },
  rental_ceo:   { ...crew, hair: '#868e96', top: '#212529', acc: ['apron', 'tie', 'medal'] },
  prod_manager: { ...crew, top: '#495057', acc: ['tie', 'clipboard'] },
  prod_ceo:     { ...crew, top: '#212529', bottom: '#212529', acc: ['tie', 'phone'] },
  // 크리에이터 · 웨딩
  youtuber:     { ...crew, hair: '#e8590c', hairStyle: 'spiky', top: '#f03e3e', hat: 'hood', hatColor: '#fa5252', acc: ['phone'] },
  creator_pro:  { ...crew, hair: '#e8590c', hairStyle: 'spiky', top: '#f03e3e', hat: 'headset', acc: ['phone'] },
  creator_star: { ...crew, hair: '#fcc419', hairStyle: 'spiky', top: '#e64980', hat: 'headset', acc: ['phone', 'shades', 'medal'] },
  wedding_assist:{ ...crew, top: '#f8f9fa', bottom: '#212529', acc: ['tie', 'camera'] },
  wedding_main: { ...crew, top: '#212529', bottom: '#212529', acc: ['tie', 'camera'] },
  wedding_lead: { ...crew, top: '#212529', bottom: '#212529', acc: ['tie', 'camera', 'pearl'] },
  wedding_ceo:  { ...crew, hair: '#868e96', top: '#f8f9fa', bottom: '#f8f9fa', acc: ['tie', 'medal'] },
  // 미술 · 노조 · 기타
  art_maknae:   { ...crew, top: '#e64980', hat: 'beret', hatColor: '#d6336c', acc: ['apron', 'brush'] },
  art_team:     { ...crew, top: '#c2255c', hat: 'beret', hatColor: '#a61e4d', acc: ['apron', 'brush'] },
  art_lead:     { ...crew, hairStyle: 'bun', top: '#a61e4d', hat: 'beret', hatColor: '#862e9c', acc: ['apron', 'brush'] },
  art_director: { ...crew, hairStyle: 'bun', top: '#862e9c', hat: 'beret', hatColor: '#5f3dc4', acc: ['scarf', 'brush', 'medal'], accColor: '#fcc419' },
  union_staff:  { ...crew, top: '#c92a2a', hat: 'headband', hatColor: '#ffffff', acc: ['megaphone'] },
  union_leader: { ...crew, hair: '#868e96', top: '#c92a2a', hat: 'headband', hatColor: '#ffffff', acc: ['megaphone', 'medal'] },
  mv_director:  { ...crew, hair: '#9c36b5', hairStyle: 'long', top: '#1b1a26', acc: ['shades', 'scarf'], accColor: '#cc5de8' },
  mv_master:    { ...crew, hair: '#cc5de8', hairStyle: 'long', top: '#1b1a26', acc: ['shades', 'scarf', 'medal'], accColor: '#cc5de8' },
  director:     { ...crew, hair: '#212529', top: '#343a40', hat: 'cap', hatColor: '#212529', acc: ['megaphone', 'scarf'], accColor: '#fab005' },
  teacher:      { ...crew, hair: '#868e96', top: '#5c3a21', acc: ['glasses', 'tie'] },
}

// 적: 사람형은 human에 look, 나머지는 몬스터 설정
export const enemies = {
  cable_knot:      { shape: 'ball', color: '#495057', eye: 'angry', acc: ['plug', 'crack'] },
  battery_slime:   { shape: 'blob', color: '#69db7c', eye: 'normal', acc: ['battery', 'plus'] },
  coffee_storm:    { shape: 'cup', color: '#f1f3f5', eye: 'angry', acc: ['steam'] },
  pigeons:         { shape: 'bird', color: '#adb5bd', eye: 'angry' },
  rain_spirit:     { shape: 'cloud', color: '#74c0fc', eye: 'sleepy', acc: ['drops'] },
  sd_ghost:        { shape: 'ghost', color: '#e9ecef', eye: 'normal', acc: ['sdcard'] },
  buzzing_fairy:   { shape: 'fairy', color: '#ffe066', eye: 'normal', mouth: 'grin' },
  calltime_clock:  { shape: 'clock', color: '#ffd43b', eye: 'angry' },
  budget_wraith:   { shape: 'ghost', color: '#b197fc', eye: 'red', acc: ['dollar'] },
  hate_cloud:      { shape: 'cloud', color: '#495057', eye: 'red', acc: ['bolt'] },
  reshoot_golem:   { shape: 'golem', color: '#868e96', eye: 'angry', acc: ['slate', 'crack'] },
  generator_golem: { shape: 'box', color: '#fab005', eye: 'angry', acc: ['bolt', 'antenna'] },
  night_shoot:     { shape: 'ball', color: '#364fc7', eye: 'sleepy', acc: ['zzz'] },
  algorithm:       { shape: 'box', color: '#15aabf', eye: 'red', acc: ['screen', 'antenna'] },
  crankup_typhoon: { shape: 'swirl', color: '#4dabf7', eye: 'angry' },
  investor_ghost:  { shape: 'ghost', color: '#ced4da', eye: 'sleepy', acc: ['tie'] },
  // 사람형 (격투 맞짱 상대)
  nervous_manager: { human: { skin: '#f2c49b', hair: '#212529', top: '#212529', bottom: '#212529', acc: ['phone', 'shades'], face: 'angry' } },
  diva_actor:      { human: { skin: '#f8d0b0', hair: '#f59f00', hairStyle: 'long', top: '#e64980', bottom: '#f8f9fa', acc: ['shades', 'pearl'], face: 'angry' } },
  tyrant_pd:       { human: { skin: '#e8b48a', hair: '#212529', hairStyle: 'bald', top: '#5c940d', bottom: '#343a40', hat: 'cap', hatColor: '#2b8a3e', acc: ['megaphone'], face: 'angry' } },
  client_feeling:  { human: { skin: '#f2c49b', hair: '#495057', top: '#1864ab', bottom: '#1b1a26', acc: ['tie', 'glasses'], face: 'angry' } },
  bride_mom:       { human: { skin: '#f2c49b', hair: '#5c3a21', hairStyle: 'bun', top: '#d6336c', dress: '#c2255c', bottom: '#c2255c', acc: ['pearl'], face: 'angry' } },
  genius_director: { human: { skin: '#f2c49b', hair: '#adb5bd', hairStyle: 'spiky', top: '#1b1a26', bottom: '#343a40', hat: 'beret', hatColor: '#c92a2a', acc: ['megaphone', 'scarf'], accColor: '#fab005' } },
  unpaid_ceo:      { human: { skin: '#f2c49b', hair: '#212529', top: '#343a40', bottom: '#343a40', acc: ['tie', 'shades'], face: 'angry' } },
}

// 8×8 아이콘
const K = '#1b1a26'
export const icons = {
  heart:    { pal: { r: '#ff6b6b', w: '#ffc9c9' }, rows: ['.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....'] },
  drop:     { pal: { b: '#4dabf7', w: '#d0ebff' }, rows: ['...b....', '..bbb...', '.bbwbb..', '.bwbbb..', 'bbbbbbb.', '.bbbbb..', '..bbb...'] },
  coin:     { pal: { y: '#fcc419', o: '#e67700', w: '#fff3bf' }, rows: ['..yyyy..', '.ywyyyo.', 'yyyoyyyo', 'yyyoyyyo', 'yyyoyyyo', '.yyyyyo.', '..oooo..'] },
  star:     { pal: { y: '#fcc419', w: '#fff3bf' }, rows: ['...y....', '...y....', 'yyywyyy.', '.yyyyy..', '..yyy...', '.yy.yy..', 'y.....y.'] },
  sword:    { pal: { s: '#dee2e6', g: '#fab005', b: '#5c3a21' }, rows: ['......s.', '.....s..', '....s...', '.g.s....', '..g.....', '.b.g....', 'b.......'] },
  skull:    { pal: { w: '#f1f3f5', k: K }, rows: ['.wwwww..', 'wwwwwww.', 'wkwwwkw.', 'wkwwwkw.', 'wwwkwww.', '.wwwww..', '.w.w.w..'] },
  question: { pal: { p: '#cc5de8' }, rows: ['.pppp...', 'pp..pp..', '....pp..', '...pp...', '..pp....', '........', '..pp....'] },
  cart:     { pal: { g: '#adb5bd', k: '#495057' }, rows: ['g.......', '.gggggg.', '.g.g.g..', '.gggggg.', '..ggggg.', '........', '..k..k..'] },
  bowl:     { pal: { w: '#f8f9fa', r: '#ff8787', b: '#8d6e63' }, rows: ['..w.w...', '...w....', 'rrrrrrr.', 'bbbbbbb.', '.bbbbb..', '..bbb...'] },
  crown:    { pal: { y: '#fcc419', r: '#e03131' }, rows: ['y..y..y.', 'yy.y.yy.', 'yyyyyyy.', 'yryyyry.', 'yyyyyyy.'] },
  fist:     { pal: { s: '#f2c49b', d: '#d9a073' }, rows: ['.ssss...', 'ssssss..', 'sdsdss..', 'ssssss..', 'ssssss..', '.ssss...'] },
  bolt:     { pal: { y: '#fcc419' }, rows: ['...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.y......'] },
  book:     { pal: { b: '#748ffc', w: '#f8f9fa' }, rows: ['bbbbbb..', 'bwwwwb..', 'bwbbwb..', 'bwwwwb..', 'bwbbwb..', 'bbbbbb..'] },
  film:     { pal: { k: '#495057', w: '#f1f3f5' }, rows: ['kkkkkkk.', 'kwkwkwk.', 'kkkkkkk.', 'kwwwwwk.', 'kkkkkkk.', 'kwkwkwk.', 'kkkkkkk.'] },
}

// 경기장 소품
export const props = {
  lamp:   { pal: { y: '#fff3bf', g: '#495057', k: '#343a40' }, rows: ['.yyyy.', 'yyyyyy', '.gggg.', '..gg..', '..gg..', '..gg..', '..gg..', '..gg..', '.g..g.', 'g....g'] },
  camera: { pal: { g: '#343a40', b: '#74c0fc', l: '#868e96' }, rows: ['gggggl', 'ggggbl', 'gggggl', '..gg..', '..gg..', '.g.g..', 'g..g..', 'g...g.'] },
  box:    { pal: { b: '#a87b4f', d: '#8d5f36', t: '#e9c46a' }, rows: ['bbbbbbbb', 'btttbbbb', 'bbbbbbbb', 'dddddddd', 'bbbbbbbb', 'bbbbbbbb'] },
  chair:  { pal: { k: '#343a40', c: '#c92a2a' }, rows: ['cccccc', 'cccccc', 'k....k', 'kkkkkk', 'k....k', 'k....k'] },
}

export default { looks, enemies, icons, props }
