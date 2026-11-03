/**
 * PC 개발용 키보드 입력.
 * 1~9: 해당 번호 주문 동작 성공 / n: 다음 주문 / c: 캘리브레이션 건너뛰기
 */
export function installKeyboard(onKey: (key: string) => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    onKey(e.key.toLowerCase());
  });
}
