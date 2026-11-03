export type GestureId = 'fire' | 'big' | 'power';

export interface Spell {
  id: GestureId;
  hanja: string;
  /** 훈 (뜻) */
  meaning: string;
  /** 음 */
  sound: string;
  /** 음성으로 읽어 줄 동작 설명 */
  instruction: string;
  /** 있으면 횟수형, 없으면 유지형 */
  reps?: number;
  color: string;
}

export const SPELLS: Spell[] = [
  { id: 'fire', hanja: '火', meaning: '불', sound: '화', instruction: '팔을 앞으로 쭉!', color: '#ff7a3d' },
  { id: 'big', hanja: '大', meaning: '큰', sound: '대', instruction: '팔다리를 크게 벌려요! 세 번!', reps: 3, color: '#ffc52e' },
  { id: 'power', hanja: '力', meaning: '힘', sound: '력', instruction: '앉았다 일어나요! 세 번!', reps: 3, color: '#5fd068' },
];
