# 촬영현장 커리어 (프로토타입 v2)

열아홉부터 마흔까지, 영화 현장에서 한 인생을 사는 웹 게임입니다.
게임오버는 없고, 확률이나 판정 숫자도 보이지 않습니다. 모든 선택이 기록되고 쌓여서 이후에 보이는 이야기와 선택지를 바꿉니다.

- 플레이: GitHub Pages 주소 (`https://<계정>.github.io/film-career/`)
- 로컬 실행: 폴더에서 `python3 -m http.server` → `http://localhost:8000` (ES 모듈이라 `file://`로는 안 열림)
- 점검: `node tools/simulate.js 300` (무작위 플레이어) / `node tools/simulate.js 300 steady` (한 길을 꾸준히 가는 플레이어)
  - 같은 판 안 반복, 판끼리 이야기 겹침, 조용한 시즌 비율, 엔딩·성향 분포, 한 번도 안 나온 이야기를 보여줍니다.

## 구조 한눈에

```
시즌 시작 → 행동 고르기(data/actions.js)
         → 조건이 맞는 이야기 1개 등장(data/storylets/) — 한 판에 한 번씩만
         → 선택지(자질·꼬리표·인연·상황에 따라 보이는 게 다름) → 결과 + 시즌 정리
         → … 40세 → 엔딩(최종 직업 × 성향 조합)
```

| 쌓이는 것 | 파일 | 화면 표시 |
|---|---|---|
| 타고난 자질 4개 (체력·감각·기술·재력, 거의 안 변함) | `traits.js` | 문장으로만 |
| 분야별 경험 | `fields.js` | "초보·익숙함·베테랑" 같은 말로 |
| 꼬리표 (같은 종류의 선택이 쌓이면) | `tags.js` | 이름과 설명 |
| 인연 5명의 관계와 기억 | `npcs.js` | 관계 단계만 |
| 성향 축 3개 (예술↔돈, 도전↔안정, 사람↔기술) | `leanings.js` | 숨김 (엔딩에서 이름으로) |
| 필모그래피, 통장, 직업, 트랙 | `jobs.js`, `tracks.js` | 그대로 |

```
data/
  config.js  traits.js  fields.js  schools.js  tracks.js  jobs.js  tags.js  npcs.js  leanings.js
  actions.js          시즌 행동
  storylets/          이야기: intro(시작) student rookie(1~3년차) mid(4년차~) late(후반·통장) paths(직업·트랙별)
  endings.js          엔딩 문장
  assets.js names.js
js/  engine.js(진행) conditions.js(조건) effects.js(효과) text.js(문장) memoir.js(엔딩) ui.js save.js
```

## 이야기(storylet) 추가하기

`data/storylets/` 파일 배열에 객체를 하나 넣습니다. 새 파일을 만들었다면 `data/storylets/index.js`에 import를 추가하세요.

```js
{
  id: 'cam_new_lens',               // 고유 id (한 판에 한 번만 등장)
  stage: 'career',                  // student | career (생략하면 career)
  action: ['work'],                 // 이 행동/묶음을 골랐을 때만. 생략하면 어떤 행동이든
  when: { careerYear: '>=2', jobField: ['camera'] },   // 등장 조건
  priority: 0,                      // 높을수록 먼저 (연쇄·지연 이야기는 5~8)
  weight: 1,                        // 같은 priority 안에서 뽑힐 비중
  title: '신형 렌즈',
  image: 'gear',                    // data/assets.js 키
  text: ['렌탈샵에서 신형 렌즈를 먼저 써보라고 한다. ',
         { when: { npc: { senior: { bond: '>=2' } } }, text: '{senior}이 옆에서 고개를 끄덕인다.' }],
  choices: [
    { label: '렌즈를 분해해본다', when: { trait: { skill: 'high' } },   // 기술이 높을 때만 보임 (🔧 열쇠 표시)
      text: '구조를 다 외웠다.',
      effects: { mark: ['fix'], npc: { senior: { remember: 'lens_nerd' } }, lean: { tech: 1 } },
      memo: '신형 렌즈를 분해해 구조를 외웠다.',   // 엔딩 회고록 후보
      pivotal: 1 },                                // "당신을 바꾼 선택" 후보 가중치
    { label: '감독에게 테스트 컷을 보여준다', when: { trait: { sense: 'high' } }, text: '…', effects: { … } },
    { label: '그냥 돌려준다', text: '…', effects: { lean: { safe: 1 } } },        // 조건 없는 선택지를 하나는 꼭 두세요
    { label: '결과가 갈리는 선택', results: [                                    // 숨겨진 랜덤 (확률은 화면에 안 나옴)
        { weight: 2, text: '잘됐다.', effects: { … } },
        { weight: 1, when: { tags: ['gear_kid'] }, text: '꼬리표가 있으면 이 결과도 후보', effects: { … } } ] },
  ],
}
```

- 선택지 `next: '이야기id'`: 같은 시즌에 바로 이어지는 장면 (그 이야기는 `manual: true`로 두면 랜덤으로는 안 나옴)
- **지연된 결과**: 효과로 기억을 남기고 몇 시즌 뒤 조건으로 겁니다.
  ```js
  // 막내 때
  effects: { npc: { peer: { remember: 'covered' } } }
  // 15시즌(약 5년) 뒤에 등장하는 이야기
  when: { npc: { peer: { since: { covered: '>=15' } } } }, priority: 8
  ```

### 효과 (`effects`)

| 키 | 예 | 뜻 |
|---|---|---|
| `money` | `300`, `[-200, -100]` | 통장(만원). 0 아래로 가도 끝나지 않음 |
| `exp` | `{ camera: 1, '@job': 1, '@field': 1 }` | 분야 경험 (`@job` 현재 직업 분야, `@field` 전공) |
| `mark` | `['fix']` | 꼬리표용 기록 (`tags.js`의 count만큼 쌓이면 꼬리표) |
| `lean` | `{ art: 1, safe: 1, tech: 1 }` | 숨은 성향 (반대쪽: money, risk, people) |
| `npc` | `{ peer: { meet: true, bond: 1, remember: 'covered', forget: 'x' } }` | 인연 |
| `flags` / `removeFlags` | `['has_short']` | 플래그 (붙은 시즌이 기록됨) |
| `setJob` | `'cam_second'`, `'@entry'` | 직업 변경 (`@entry` = 전공 분야의 첫 직업) |
| `setTrack` | `'ott'` | 트랙 이동 (film, ott, ad, freelance) |
| `film` / `filmNote` | `{ title, role, note }` / `'흥행작'` | 필모그래피 추가 / 이번 시즌 작품에 메모 |
| `age` | `1` | 나이 (재수·유학 등) |

### 조건 (`when`)

숫자는 `'>=5'`, `'<0'`, `'==3'` 또는 `[최소, 최대]`. 모든 키가 맞아야 통과합니다.

| 키 | 예 |
|---|---|
| `trait` / `notTrait` | `{ stamina: 'high' }`, `{ wealth: ['low', 'mid'] }` |
| `tags`, `anyTags`, `notTags`, `marks` | `['gear_kid']`, `{ fix: '>=2' }` |
| `npc` | `{ peer: { met: true, bond: '>=2', remembers: 'covered', remembersAny: [...], notRemembers: 'x', since: { covered: '>=15' } } }` |
| `lean` | `{ art: '>=2' }` (평균 플레이 기준 상대값) |
| `exp` | `{ camera: '>=7' }` |
| `job`, `notJob`, `jobKind`, `jobField`, `notJobField`, `field`, `notField`, `school`, `track`, `notTrack` | `['cam_first']` |
| `money`, `age`, `careerYear`, `films` | `'<=0'` |
| `flags`, `anyFlags`, `notFlags`, `sinceFlag` | `['at_home']`, `{ at_home: '>=6' }` |
| `seen`, `notSeen`, `sinceSeen`, `chose`, `notChose` | `'y1_lenscap'`, `'y1_lenscap.cover'` |
| `any`, `all`, `not`, `chance` | `{ any: [{...}, {...}] }`, `30` |

## 직업·꼬리표·엔딩 추가하기

- **직업** (`jobs.js`): `{ id, name, field, kind: 'crew'|'post'|'own', pay: [min, max], ending }`.
  승진·전환 제안은 `offer: { from: ['이전직업'], when: {...}, text, memo }`만 쓰면 엔진이 "제안" 이야기를 자동으로 만듭니다.
- **꼬리표** (`tags.js`): `{ id, name, desc, mark: { id: 'fix', count: 3 } }` 또는 `when: {...}`.
- **엔딩** (`endings.js`): `{ id, title, emoji, image, text }` 후 직업의 `ending`에 연결. 도감 칸은 엔딩 × 성향 조합 8개로 자동 생성됩니다.
- **인연** (`npcs.js`): `{ id, name, role, emoji, desc }` → 텍스트에서 `{id}`로 이름이 들어갑니다.

## 그 밖에

- 그림: `assets/img/`에 PNG를 넣고 `data/assets.js`의 `img`에 경로만 적으면 이모지 대신 표시됩니다.
- 미니게임: `js/minigames/`에 `register('id', { run(root, params, ctx) })`로 등록하면 선택지에 `minigame: { id, params, results: { 결과: { text, effects } } }`로 연결됩니다. 지금은 등록된 미니게임이 없습니다.
- 저장: localStorage `filmCareer.run.v2`(진행 중인 판), `filmCareer.dex.v2`(도감). 저장이 막혀도 게임은 진행됩니다.
