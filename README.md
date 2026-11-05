# ROLLING! — 픽셀 아트 촬영장 격투게임

촬영장 직업인들이 구도·녹음 문제로 다투다가 장비를 무기로 한판 붙는 2D 대전 격투게임입니다.

- **바로 플레이**: https://sungbin8815-cell.github.io/film-career/play/ (휴대폰 세로·가로 모두)
- 기술: TypeScript · Phaser 3 · Vite (온라인 대전용 Node.js + Socket.IO 서버는 PHASE 4)

## 현재 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| PHASE 1 | 프로젝트 세팅, 메인 메뉴, 픽셀 스타일, 촬영감독, 이동·점프·공격·방어, 체력·승패 | ✅ 완료 |
| PHASE 2 | 연출감독·사운드감독 추가, 캐릭터별 밸런스 | ⬜ 예정 (선택 화면에 잠금 표시) |
| PHASE 3 | STAGE MODE(스테이지 5개), 스테이지 클리어·엔딩 | ⬜ 예정 (메뉴에 잠금 표시) |
| PHASE 4 | FRIEND MATCH 온라인 PVP (Socket.IO 서버, 6자리 방 코드) | ⬜ 예정 (메뉴에 잠금 표시) |
| PHASE 5 | 오프닝 컷신, 실제 효과음 에셋, 환경 기믹, 연출 보강 | ⬜ 예정 |

PHASE 1에서 실제로 되는 것:
- 메인 메뉴 → START → 캐릭터 선택(촬영감독) → 크로마키 스튜디오에서 CPU와 대전 (3판 2선승, 60초)
- 이동·달리기(같은 방향 두 번)·점프·앉기·방어, 약/강/특수기 2종/필살기
- 공격 판정 박스 ↔ 몸통 판정 박스 충돌, 피격 경직·넉백·다운, 가드 시 피해 감소(칩 데미지), 히트스톱·화면 흔들림
- 콤보: 약 → 약 → 강 → 특수/필살 캔슬, 콤보 보정, "N HIT!" 표시
- 게이지: 때리거나 맞으면 참. 특수기 25, 필살기 100 소모
- KO / 시간 초과(체력 많은 쪽 승리), 결과 화면 → 재대결 / 메뉴
- CPU AI: EASY / NORMAL / HARD (SETTINGS에서 변경), 사운드 ON/OFF
- 임시 효과음(WebAudio 합성): 슬레이트 "딱", 타격음, 가드음, 셔터음 등

아직 없는 것: 연출감독·사운드감독, STAGE MODE, 온라인 대전, 오프닝 컷신, 실제 효과음 파일, 환경 기믹. 메뉴에서 해당 버튼은 잠겨 있고 누르면 "준비 중" 안내가 나옵니다.

## 조작

| | 휴대폰 | 키보드 |
|---|---|---|
| 이동 / 점프 / 앉기 | 왼쪽 방향 패드 (밀어서 조작) | A D / W / S |
| 달리기 | 같은 방향 빠르게 두 번 | 같은 방향 두 번 |
| 약공격 · 강공격 | 약 · 강 | J · K |
| 특수기 (숄더 어택) / ▼+특수기 (조명 낙하) | 특 / ▼ + 특 | L / S + L |
| 방어 (누르는 동안) | 방어 | I 또는 스페이스 |
| 필살기 원테이크 (게이지 100) | 필살 | U |
| 일시정지 | 화면 위 ❚❚ | ESC / P |

## 실행·테스트

```bash
npm install
npm run dev      # 개발 서버 http://localhost:5173 (같은 와이파이의 휴대폰에서도 접속 가능)
npm test         # 전투 로직 테스트 12개 (이동·점프·피격·가드·콤보·KO·시간초과·게이지·난이도)
npm run build    # play/ 폴더로 빌드 → 커밋하면 GitHub Pages에 반영
```

주소 끝에 `?debug`를 붙이면 판정 박스(하늘색 = 몸통, 빨강 = 공격)가 보입니다.

## 폴더 구조

```
client/
  index.html
  src/
    main.ts              Phaser 설정 + 터치 콘솔
    core/                전투 로직 (Phaser 없음 → 온라인 서버에서도 그대로 사용 예정)
      types.ts           입력·기술·캐릭터 타입, 60프레임 고정
      Fighter.ts         상태 머신(대기·걷기·달리기·점프·공격·피격·다운·가드…) + 물리
      Match.ts           라운드·타이머·충돌 판정·가드·콤보·히트스톱·투사체
      AI.ts              상태 기반 CPU (난이도 3단계)
    config/characters.ts 캐릭터 능력치·기술 프레임 데이터 (숫자만 바꾸면 밸런스 변경)
    gfx/                 도트 그래픽 (외부 이미지 없이 코드로 그림)
      Painter.ts         관절 포즈 + 의상 → 48×64 픽셀 프레임 (외곽선·장비 포함)
      poses.ts           애니메이션 14종 포즈
      TextureFactory.ts  텍스처·애니메이션 등록, 배경·이펙트
    scenes/              Boot · Menu · Select · Settings · Fight
    ui/                  터치 콘솔(Controls), 설정 저장, UI 위젯
    audio/Sfx.ts         임시 합성 효과음 (파일로 교체 가능)
  tests/                 Vitest 테스트
play/                    빌드 결과 (GitHub Pages가 서빙)
server/                  (PHASE 4) Socket.IO 대전 서버
```

### 에셋 교체
- **스프라이트**: `gfx/TextureFactory.ts`에서 `dp` 키로 만든 텍스처를 PNG 스프라이트시트(`load.spritesheet('dp', …)`)로 바꾸면 됩니다. 프레임 이름(`idle_0`, `light_1` …)과 애니메이션 키(`dp_idle` …)만 맞추면 나머지 코드는 그대로입니다.
- **효과음**: `audio/Sfx.ts`의 `sfx(key)` 키(`slate`, `hit`, `block`, `shutter` …)를 유지한 채 파일 재생으로 바꾸면 됩니다.
- **폰트**: Galmuri11 (SIL OFL 1.1, `client/src/assets/fonts`, 라이선스 `client/public/LICENSE-Galmuri11.txt`)

### 캐릭터·기술 수치
`config/characters.ts`의 기술마다 `startup / active / recovery`(프레임), `damage`, `hitstun`, `blockstun`, `kbX`, `hitbox`, `cost`, `cancelInto`(콤보로 이어질 수 있는 기술)를 조정합니다.

## 온라인 대전 계획 (PHASE 4, 아직 구현 안 됨)
- `server/`에 Node.js + Socket.IO 서버: 방 생성·6자리 코드·참가·이탈·준비·시작·종료 관리
- 서버가 `core/Match`를 직접 돌리는 **서버 권위 방식**: 클라이언트는 입력(InputState)만 보내고, 서버가 상태를 브로드캐스트 → 클라이언트는 보간해서 그림
- GitHub Pages는 정적 호스팅이라 서버를 못 돌립니다. 서버는 Render·Railway·Fly.io 같은 곳에 따로 배포하고, 게임 설정에 서버 주소를 넣는 방식이 됩니다(배포 방법은 PHASE 4에서 이 문서에 추가).
