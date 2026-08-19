// 상점 아이템. 가격은 문서 확정 3개 외엔 임시 — 밸런스 조정 시 여기 숫자만 수정.
// target: true면 사용 시 상대팀 지정 필요
export const ITEMS = [
  { id: 'curse',   name: '저주 주사위',  price: 3,  target: true,  desc: '지정팀의 다음 주사위 눈이 1~3으로 줄어듦' },
  { id: 'double',  name: '더블 주사위',  price: 5,  target: false, desc: '다음 턴에 주사위 2개의 합만큼 이동' },
  { id: 'triple',  name: '트리플 주사위', price: 10, target: false, desc: '다음 턴에 주사위 3개의 합만큼 이동' },
  { id: 'stealItem', name: '빼앗기 상자', price: 6,  target: true,  desc: '지정팀의 아이템 1개를 무작위로 빼앗음' },
  { id: 'stealCoin', name: '도둑놈',     price: 5,  target: true,  desc: '지정팀의 코인 3개를 강탈' },
  { id: 'shield',  name: '천사카드',     price: 4,  target: false, desc: '상대의 공격 1회 자동 무효화 (구매 즉시 발동 대기)' },
  { id: 'pull',    name: '끌어당기기',   price: 5,  target: true,  desc: '지정팀을 3칸 뒤로 끌어당김' }, // ponytail: 1/3/5칸 선택 → 3칸 고정으로 단순화
  { id: 'getOff',  name: '즉시 내리기',  price: 4,  target: true,  desc: '지정팀은 즉시 다음 역에서 하차해야 함 (스태프 집행)' },
  { id: 'bike',    name: '자전거 슝슝',  price: 4,  target: true,  desc: '지정팀은 다음 역을 도보/자전거로 이동해야 함 (스태프 집행)' },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
// 공격으로 분류되는 아이템 = 천사카드로 방어 가능
export const IS_ATTACK = new Set(['curse', 'stealItem', 'stealCoin', 'pull', 'getOff', 'bike']);
