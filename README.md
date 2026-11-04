# 촬영현장 커리어 (프로토타입)

학생부터 촬영감독(DOP)까지, 영화 현장 커리어를 한 판 15~30분에 사는 로그라이트 웹 게임입니다.
빌드 없이 HTML + CSS + 바닐라 JS(ES 모듈)로 돌아가고, 휴대폰 세로 화면에 맞춰져 있습니다.

- 플레이: GitHub Pages 주소 (`https://<계정>.github.io/film-career/`)
- 로컬 실행: ES 모듈이라 `file://`로는 열리지 않습니다. 폴더에서 `python3 -m http.server`를 실행한 뒤 `http://localhost:8000` 접속
- 밸런스 점검: `node tools/simulate.js 1000` → 무작위로 1000판을 돌려 엔딩 분포를 보여줍니다

## 폴더 구조

```
index.html, css/style.css
js/            게임 코드 (보통은 건드릴 필요 없음)
  engine.js      진행 흐름: 학생 → 트랙 → 프로젝트 루프 → 엔딩
  conditions.js  조건(when) 판정    effects.js  효과 적용    check.js  확률 판정
  ui.js          화면               minigames/  미니게임 (registry.js가 공통 인터페이스)
data/          콘텐츠 전부 — 여기만 고치면 됩니다
  config.js      밸런스 수치(생활비, 판정 공식, 커리어 길이 등)
  schools.js  majors.js  tracks.js  names.js
  careers/       계열별 직급(촬영만 구현, 나머지 5개는 틀만)
  events/        이벤트 (student.js, camera.js, common.js)
  endings.js     엔딩
  minigames/duel.js  결투 상대·기술
  assets.js      그림 경로(지금은 이모지 자리 표시)
assets/img/    도트 이미지를 넣을 곳
```

## 이벤트 추가하기

`data/events/` 안의 파일 배열에 객체 하나를 추가합니다. 새 파일을 만들었다면 `data/events/index.js`에 import 한 줄을 추가하세요.

```js
{
  id: 'cam_new_lens',            // 고유 id
  slot: 'project',               // student(학생) | project(촬영 중) | between(작품 사이) | gap(공백기)
  career: ['camera'],            // 생략하면 모든 계열
  when: { rankMin: 'second' },   // 등장 조건 (아래 표). 생략하면 항상
  weight: 8,                     // 등장 가중치
  once: true,                    // 한 판에 한 번만 (또는 cooldown: 5 = 5작품 동안 재등장 금지)
  title: '신형 렌즈 테스트',
  image: 'gear',                 // data/assets.js의 키
  text: '렌탈샵에서 신형 렌즈를 먼저 써보라고 한다.',
  choices: [
    {                            // ① 판정 있는 선택지
      label: '테스트 촬영을 해본다',
      check: { stats: { skill: 1, sense: 0.5 }, base: 20 },   // 성공률 = 20 + (기술×1 + 감각×0.5)×4
      outcomes: {
        great:   { text: '…', effects: { stats: { rep: 5 } } },
        success: { text: '…', effects: { stats: { skill: 1 } } },
        fail:    { text: '…', effects: { stats: { money: -100 } } },
      },
    },
    { label: '거절한다', text: '…', effects: {} },            // ② 판정 없는 선택지
    { label: '싸운다', minigame: { id: 'duel', params: { enemy: 'actor' },   // ③ 미니게임
        results: { win: { text, effects }, lose: { text, effects }, flee: { text, effects } } } },
  ],
}
```

선택지에 `when`을 달면 조건이 맞을 때만 보입니다(`lockedLabel`을 주면 잠긴 버튼으로 보입니다).
판정에 `bonus: [{ when: { flags: ['art_school'] }, add: 10, label: '예술학교 +10' }]`처럼 가산점을 붙일 수 있습니다.

### 효과 (`effects`)

| 키 | 예 | 뜻 |
|---|---|---|
| `stats` | `{ stamina: -3, money: [100, 300] }` | 능력치 증감(범위면 랜덤). 통장 단위는 만 원 |
| `favor` / `setFavor` | `5` / `45` | 팀장 호감도 증감 / 지정 |
| `flags` / `removeFlags` | `['union_member']` | 플래그 붙이기/떼기 (엔딩·이벤트 조건에 사용) |
| `setTrack` | `'freelance'` | 트랙 이동 (film, ott, ad, freelance) |
| `setRank` / `promote` | `'dop'` / `true` | 직급 지정 / 한 단계 승진 |
| `unlockCareer` | `'art'` | 다른 계열 해금 |
| `skipProjects` | `1` | 일하지 않고 N작품 쉼(생활비 지출, 시간 경과) |
| `age` | `1` | 나이 증가 |
| `ending` | `'union_activist'` | 즉시 해당 엔딩 |

### 조건 (`when`)

숫자 비교는 `'>=5'`, `'<0'`, `'==3'`, `'!=1'` 또는 `[최소, 최대]`로 씁니다. 모든 키가 맞아야 통과합니다.

| 키 | 예 |
|---|---|
| `stats` | `{ skill: '>=8', money: '<0' }` (rep 평판, money 통장 포함) |
| `favor`, `projects`, `rankProjects`, `careerYears`, `age`, `debtStreak` | `'>=4'` |
| `career`, `track`, `notTrack`, `rank`, `school`, `major` | `['film', 'ott']` |
| `rankMin`, `rankMax` | `'second'` (직급 순서 기준) |
| `flags`, `notFlags`, `anyFlags` | `['gear_owner']` |
| `any`, `all`, `not` | `{ any: [{ track: ['ad'] }, { flags: ['x'] }] }` |
| `chance` | `30` (30% 확률) |

## 엔딩 추가하기

`data/endings.js` 배열에 추가합니다.

```js
{
  id: 'film_teacher',
  timing: 'final',      // final: 커리어가 끝날 때 판정 / instant: 매 턴 체크 / event: 이벤트 effects.ending으로만
  priority: 72,         // final끼리는 높은 것부터 검사해서 처음 맞는 엔딩
  emoji: '🧑‍🏫', image: 'ending_field',
  title: '영화과 교수',
  when: { flags: ['festival_award'], stats: { rep: '>=40' } },
  text: '엔딩 화면에 나올 이야기',
  hint: '도감에서 잠겼을 때 보일 힌트',
}
```

- `priority: 0`, `when: {}`인 `field_person`이 마지막 안전망이라 어떤 판이든 엔딩이 하나는 나옵니다.
- 같은 엔딩에 여러 경로로 가고 싶으면 `alias: '원래엔딩id'`를 붙이세요. 도감에서는 한 칸으로 합쳐집니다.

## 그 밖에

- **새 계열**: `data/careers/sound.js` 같은 빈 틀에 `camera.js`처럼 `ranks`를 채우고 `implemented: true`로 바꾸면 그 전공으로 플레이할 수 있습니다. 이벤트에는 `career: ['sound']`를 붙이세요.
- **그림 교체**: `assets/img/`에 PNG를 넣고 `data/assets.js`에서 해당 키의 `img: 'assets/img/파일.png'`만 채우면 됩니다. 파일이 없으면 이모지로 돌아갑니다.
- **새 미니게임**: `js/minigames/`에 파일을 만들어 `register('id', { run(root, params, ctx) { return Promise<{ outcome }> } })`로 등록하고, `js/minigames/index.js`에 import를 추가합니다. 이벤트에서는 `minigame: { id, params, results: { [outcome]: { text, effects } } }`로 연결합니다.
- **저장**: localStorage에 진행 중인 판(`filmCareer.run.v1`)과 엔딩 도감(`filmCareer.dex.v1`)을 저장합니다. 저장이 막힌 환경에서도 게임은 진행됩니다.
- **도트 폰트**: `css/style.css` 맨 위의 `@font-face` 주석을 풀고 `fonts/`에 폰트 파일을 넣으면 됩니다. 지금은 기기의 고정폭 글꼴을 씁니다.
