# 배틀쉽 파일럿

워3 유즈맵 '배틀쉽'에서 영감을 받은 도트 해전 로그라이크. 브라우저에서 바로 실행되는 단일 HTML 파일 게임이에요.

## 구조

| 경로 | 내용 |
|---|---|
| `battleship-pilot.html` | 게임 전체 (페이지 본문) |
| `fx/fx.config.json` | 게임에 넣을 pixelfx 이펙트 목록 |
| `assets/fx/` | 구운 스프라이트 시트 (PNG + JSON, Aseprite 형식) |
| `vendor/pixelfx/` | pixelfx (고정 커밋, `PINNED_COMMIT`) |
| `tools/` | 이펙트 굽기·삽입, 빌드, pixelfx 버전 고정 스크립트 |
| `.claude/skills/` | Claude용 스킬: `pixelfx`(원본), `game-fx`(이 게임의 파이프라인) |

## 명령 (Node 18+)

```sh
npm run fx          # fx.config.json의 이펙트를 구워서(assets/fx) 게임 파일에 삽입
npm run fx:list -- splash         # pixelfx 이펙트 검색
npm run fx:render -- water/splash --out /tmp/fx   # 미리보기 contact.png
npm run build       # dist/index.html (+ itch.io용 zip)
tools/pixelfx-pin.sh <commit>     # pixelfx 버전 교체
```

이펙트 출처와 라이선스는 `THIRD_PARTY_NOTICES.md`에 있어요.
