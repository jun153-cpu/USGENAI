// 판정·인식 관련 숫자는 모두 여기서 조정한다.
export const THRESHOLDS = {
  camera: {
    // 4:3 이 16:9 보다 세로 화각이 넓어 아이 전신이 더 잘 들어온다.
    width: 640,
    height: 480,
  },

  tracking: {
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    maxInferenceFps: 30,
    // 이 값 아래로 떨어지면 디버그 화면에 경고 표시
    targetInferenceFps: 20,
  },

  landmark: {
    // visibility 가 이보다 낮은 관절은 판정·그리기에서 무시
    minVisibility: 0.5,
  },

  smoothing: {
    // One-Euro 필터: minCutoff↓ = 더 부드럽지만 느림, beta↑ = 빠른 움직임에 더 민감
    minCutoff: 1.0,
    beta: 5.0,
    dCutoff: 1.0,
  },

  fullBody: {
    // 화면 가장자리에서 이만큼(비율) 안쪽에 있어야 "보인다"고 판단
    edgeMargin: 0.01,
  },

  // 사람이 이 시간 이상 안 보이면 "없음" 처리
  personLostMs: 1500,

  // ───── 2단계: 캘리브레이션·동작 판정 ─────
  // 아래 거리 값의 단위는 "어깨너비"(1.0 = 아이 어깨너비 하나만큼)

  ready: {
    // 전신이 이 시간 동안 계속 보이면 캘리브레이션 시작
    fullBodyHoldMs: 1000,
  },

  calibration: {
    durationMs: 3000,
    // 차렷 측정 중 몸 중심이 이만큼 이상 움직이면 처음부터 다시 측정
    maxDrift: 0.35,
  },

  // 엉덩이 높이 기준선(점프·스쿼트용). 무릎을 편 채 서 있을 때만 천천히 따라간다.
  baseline: {
    kneeStraightDeg: 150,
    adaptRate: 0.03,
  },

  reps: {
    // 동작 상태가 이 시간보다 짧으면 떨림으로 보고 세지 않음
    minActiveMs: 80,
    // 연속 횟수 사이 최소 간격
    minIntervalMs: 300,
  },

  hold: {
    // 유지형 주문(火 등) 기본 유지 시간
    durationMs: 500,
    // 이 시간 이하로 잠깐 자세가 흐트러져도 봐준다
    graceMs: 250,
  },

  // 火: 양팔 앞으로 쭉. 정면 카메라에선 팔이 짧아 보이므로 "손이 어깨 높이·몸 앞쪽에 있음"으로 판정
  fire: {
    // 손목이 어깨선보다 이만큼 위까지 허용
    wristAboveShoulderMax: 0.8,
    // 손목이 어깨선보다 이만큼 아래까지 허용 (팔을 내리면 약 1.4 이상)
    wristBelowShoulderMax: 0.9,
    // 손목이 몸 중심에서 좌우로 이만큼까지 허용 (팔을 옆으로 벌리면 2 이상)
    wristFromCenterMax: 1.5,
  },

  // 大: 점핑잭. 팔을 어깨 위로 + 다리 벌리기 → 팔 내리기 = 1회
  big: {
    armsUpMin: 0.2,
    armsDownMin: 0.1,
    // 발목 사이 거리 (차렷 시 약 0.4~0.8)
    legsOpenMin: 1.2,
    requireLegs: true,
  },

  // 力: 스쿼트. 무릎 각도 또는 허벅지 길이 비율 중 하나만 맞아도 앉은 것으로 본다.
  // 정면에서는 앉아도 무릎 각도가 잘 안 줄어들어 보이므로, 허벅지가 짧아 보이는 정도도 함께 쓴다.
  power: {
    kneeDownMaxDeg: 110,
    kneeUpMinDeg: 150,
    // (허벅지 세로 길이 ÷ 정강이 세로 길이) 를 차렷 때 값으로 나눈 비율
    thighRatioDownMax: 0.6,
    thighRatioUpMin: 0.8,
  },

  // 점프(활동량 집계용): 엉덩이가 기준선보다 이만큼 올라가면 공중
  jump: {
    riseMin: 0.25,
    landMax: 0.1,
  },
} as const;
