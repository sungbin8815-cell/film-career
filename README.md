# 촬영현장 RPG (프로토타입 v3)

촬영팀 막내로 시작해 작품 10개(20살 → 40살)를 거치며 레벨을 올리고 전직하는 로그라이트 RPG입니다.
직업은 전부 현실에 있는 이름이고, 스킬만 판타지입니다(렌즈폭탄, 트라이포드 찌르기…).
**찍은 스킬 + 사건에서 고른 선택 + 맡은 작품**이 성향 포인트로 쌓여 전직 루트를 가릅니다. 게임오버는 없습니다.

- 플레이: `https://<계정>.github.io/film-career/`
- 로컬: 폴더에서 `python3 -m http.server` → `http://localhost:8000`
- 점검: `node tools/simulate.js 300 smart` / `node tools/simulate.js 300 random`
  - 직업 트리 검사(모든 직업에 기본 다음 루트가 있는지), 판당 터치 수, 전투 승률, 최종 직업 분포, 전직 경로 가짓수

## 한 판 흐름

```
계열 선택(촬영팀) → 시작 특성 3개 중 1개
└ 작품 × 10
   의뢰 3개 중 1개 (작품 종류 + 수식어: 장마 시즌, 예산 반토막…)
   → 지도 2칸 (⚔️전투 / 💀강적 / ❓사건 / 🛒렌탈샵 / 🍱밥차 중 2갈래 선택) → 👑 크랭크업 보스
   → 정산 (등급 S~D, 페이, 명성, 경험치, 성향)
   → 레벨업마다 스킬 1개 찍기 → Lv5·10·15·20에 전직
└ 40살 엔딩: 최종 직업 → 도감 등록, 일부는 새 시작 특성 해금
```

## 전투 두 가지

| 칸 | 방식 | 조작 |
|---|---|---|
| ⚔️ 현장 난전 (일반 적) | **1대다수 3인칭 액션** — 등 뒤 시점 경기장에서 무리와 싸움 | 왼쪽 끌기 = 이동, 오른쪽 = 공격·스킬 3개·구르기(무적)·박카스. PC는 WASD + J/K/L/; + Shift |
| 💀 강적 · 👑 보스 | **1대1 턴제 (포켓몬식)** — 메시지 창 + 싸운다/가방/살펴보기/도망 | 기술 4개 중 선택. "효과가 굉장했다!" |

- 두 방식 모두 📒에서 편성한 기술(기본기 + 3개)을 씁니다. 약점 속성은 1.5배.
- 액션 밸런스는 `config.action`(무리 수, 체력·공격 배율, 제한 시간), 지도 칸 비중은 `config.nodeWeights`.
- 테스트: 주소에 `?debug`를 붙이면 콘솔에서 `__game.debugFight('pigeons')`처럼 원하는 전투를 바로 열 수 있습니다.

## 데이터 파일

```
data/
  config.js        밸런스 (작품 수, 경험치 곡선, 전직 레벨, 전투 수치)
  routes.js        성향 8개 (포커스·근력·데이터·처세·감각·돈·작가주의·투쟁)
  classes.js       시작 계열 (촬영팀만 구현, 나머지 5개는 틀)
  traits.js        시작 특성 (unlock: 엔딩으로 해금)
  jobs/camera.js   직업 트리 54개 (최종 21개)
  skills/camera.js 스킬 31개
  enemies.js       현장 문제 몬스터·엘리트·보스
  items.js         장비 (일반·희귀·영웅·전설)
  projects.js      작품 종류 8개 + 수식어 10개
  events/          사건 (common.js, camera.js)
```

## 직업(전직) 추가하기 — `data/jobs/camera.js`

```js
{ id: 'gaffer', tier: 3, from: ['cam_second', 'grip'],   // 이 직업들에서 전직 ('any' = 바로 아래 단계 아무 직업)
  name: '조명감독', emoji: '💡',
  when: { routes: { art: '>=10', muscle: '>=6' } },        // 전직 조건 (없으면 기본 루트)
  affinity: { art: 2, muscle: 2 },                         // 후보 정렬 (성향 × 가중치)
  hint: '감각과 근력이 필요하다',                            // 잠겼을 때 보이는 힌트
  growth: { hp: 7, mp: 3, str: 1, sen: 2 },                // 레벨업 성장
  payMul: 2.1, projects: { film: 4, mv: 3 },               // 페이 배수, 잘 들어오는 작품
  desc: '빛을 설계하는 사람.',
  ending: '…' }                                            // tier 4(최종)일 때만
```
- tier: 0(시작) → 1(Lv5) → 2(Lv10) → 3(Lv15) → 4(Lv20, 최종 = 엔딩)
- 최종이 아닌 직업에는 **조건 없이 갈 수 있는 다음 직업이 하나 이상** 있어야 합니다(시뮬레이터가 검사).
- 숨은 루트: 사건에서 `flags`를 남기고 `when: { flags: ['art_saved'] }`로 겁니다.

## 스킬 추가하기 — `data/skills/camera.js`

```js
{ id: 'lens_flare', name: '렌즈 플레어 섬광', emoji: '✨', route: 'art',   // 찍으면 이 성향 +2, 피해 속성
  type: 'attack', power: 12, scale: { sen: 1.3 }, mp: 6,                  // attack heal mana guard buff debuff stun gold
  req: { level: 5, jobs: ['b_cam'], tierMin: 2 },                         // 배울 조건
  desc: '태양을 렌즈에 담아 적의 눈을 멀게 한다.' }
```

## 사건 추가하기 — `data/events/*.js`

```js
{ id: 'ev_new', when: { tierMin: 1, projects: ['film'] }, priority: 0,
  title: '제목', emoji: '❓', text: '상황',
  choices: [
    { label: '근력으로 해결', when: { stats: { str: '>=8' } }, text: '결과',
      effects: { routes: { muscle: 3 }, grade: 1, flags: ['x'] }, memo: '엔딩에 남을 한 줄' },
    { label: '싸운다', text: '…', effects: { fight: 'tyrant_pd' } },      // 결과 후 전투
    { label: '도박', results: [ { weight: 1, text: '대박', effects: { money: 500 } }, { weight: 2, text: '꽝', effects: {} } ] },
  ] }
```
- **조건(when)**: `routes`, `stats`(hp·mp·str·tec·sen·cha), `flags`, `notFlags`, `sinceFlag: { x: '>=3' }`(플래그 후 작품 수), `job`, `tierMin`, `tierMax`, `projects`, `money`, `fame`, `level`, `skills`, `seen`, `any`, `all`, `not`, `chance`
- **효과(effects)**: `routes`, `stats`(영구), `flags`, `removeFlags`, `money`, `fame`, `exp`, `hp`, `mp`, `grade`(작품 평가), `item`(id 또는 'rare'·'epic'), `learn`(스킬), `fight`(적 id)
- 지연된 결과: 막내 때 `flags: ['covered_peer']` → 3작품 뒤 `when: { sinceFlag: { covered_peer: '>=3' } }, priority: 5`

## 그 밖에
- 적·장비·작품·수식어도 같은 방식으로 배열에 추가하면 됩니다(각 파일 상단 주석 참고).
- 저장: localStorage `filmCareer.run.v3`(진행 중), `filmCareer.dex.v3`(도감). 저장이 막혀도 게임은 진행됩니다.
- 그래픽: 지금은 이모지. 도트 이미지로 바꿀 때 `data/assets.js`를 쓸 수 있습니다.
