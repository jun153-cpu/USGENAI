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
} as const;
