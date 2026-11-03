# 한자 마법사 대모험

7세 아이가 TV 앞에서 몸을 움직여 한자 마법 주문을 쓰는 모션인식 웹게임.
스마트폰 전면 카메라 + MediaPipe Pose Landmarker 로 동작을 인식하며, 카메라 영상은 기기 밖으로 나가지 않는다.

## 진행 상황

- [x] 1단계: 카메라 + MediaPipe + 스켈레톤 오버레이
- [x] 2단계: 캘리브레이션 + 동작 판정(火, 大, 力)
- [ ] 3단계: 게임 루프(몬스터, 주문, 이펙트, 음성)
- [ ] 4단계: 나머지 동작, 레벨, 결과 화면, 휴식
- [ ] 5단계: 다듬기

## 폰에서 테스트

배포 주소 뒤에 `?debug=1` 을 붙이면 관절 좌표·각도·FPS·동작별 판정 상태가 표시된다.
디버그 모드의 "● 녹화" 버튼은 관절 좌표(숫자)만 JSON 파일로 저장한다 (영상은 저장하지 않음).

## PC 키보드 (개발용)

- `c`: 캘리브레이션 건너뛰기 (기본 체형 사용)
- `1`~`3`: 火·大·力 동작 성공 흉내
- `n`: 다음 주문

## 판정 값 조정

인식·판정 관련 숫자는 모두 `src/config/thresholds.ts` 한 파일에 있다.

## 개발 (PC)

```bash
npm install
npm run dev      # http://localhost:5173 (PC 웹캠으로 확인 가능)
npm test         # 판정 로직 테스트
npm run build    # 배포용 빌드 (dist/)
```

## 폴더 구조

- `src/config/` 임계값, 주문 데이터
- `src/platform/` 카메라·전체화면·화면유지·음성 등 브라우저 기능
- `src/pose/` 포즈 인식 (게임과 독립된 모듈). 공개 API 는 `poseRecognizer.ts`, 동작별 판정은 `gestures/`
- `src/game/` 장면(준비·캘리브레이션·연습), 그리기, 이펙트
- `src/dev/` PC 개발용 키보드 입력
- `src/ui/` 카메라 미리보기, 디버그 오버레이
- `public/mediapipe/` 포즈 모델 (wasm 은 빌드 시 `scripts/copy-mediapipe.mjs` 가 복사)
