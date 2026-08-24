// 상점 아이템 23종. 가격·문구 조정은 이 파일만.
// cat: dice(주사위) / mission(미션) / attack(공격) / etc(기타)
// target: true = 사용 시 상대팀 지정
export const ITEMS = [
  // ── 기타/필살기 ──
  { id: 'pegasus', name: '🐴 페가수스', price: 100, cat: 'etc', target: false,
    desc: '즉시 강남역까지 내리지 않고 직행 (주사위·미션 면제, 떨어트리기 외 공격 무효)' },
  { id: 'pegasusDrop', name: '🪂 페가수스 떨어트리기', price: 90, cat: 'attack', target: true,
    desc: '페가수스 탑승 중인 팀을 다음 정차역에 하차시킴' },
  // ── 주사위 ──
  { id: 'triple', name: '트리플 주사위', price: 30, cat: 'dice', target: false,
    desc: '주사위 3개의 합만큼 이동' },
  { id: 'pickDice', name: '지정 주사위', price: 25, cat: 'dice', target: false,
    desc: '1~6 중 원하는 숫자로 이동' },
  { id: 'double', name: '더블 주사위', price: 20, cat: 'dice', target: false,
    desc: '주사위 2개의 합만큼 이동' },
  { id: 'dice9', name: '강화 주사위', price: 15, cat: 'dice', target: false,
    desc: '1~9 주사위를 굴림' },
  { id: 'oddEven', name: '홀짝 도박 주사위', price: 10, cat: 'dice', target: false,
    desc: '홀수: 두 배 전진 / 짝수: 나온 만큼 후진 (후진 시 그 턴 종료, 미션 없음)' },
  { id: 'reverse', name: '거꾸로 주사위', price: 15, cat: 'attack', target: true,
    desc: '지정팀은 다음 주사위 결과만큼 뒤로 이동' },
  { id: 'curse', name: '저주 주사위', price: 10, cat: 'attack', target: true,
    desc: '지정팀의 다음 주사위 눈이 1~3으로 줄어듦' },
  // ── 미션 ──
  { id: 'doubleMission', name: '미션 2개 시키기', price: 15, cat: 'attack', target: true,
    desc: '지정팀은 다음 역에서 미션 2개를 성공해야 주사위를 굴릴 수 있음' },
  { id: 'missionSkip', name: '미션 면제권', price: 15, cat: 'mission', target: false,
    desc: '다음 역 미션을 건너뜀' },
  { id: 'missionPick', name: '미션 고르기', price: 10, cat: 'mission', target: false,
    desc: '다음 미션을 랜덤이 아니라 보고 고름' },
  { id: 'missionRevive', name: '죽은자의 소생', price: 10, cat: 'mission', target: false,
    desc: '다음 미션을 이미 했던 미션 중에서 골라 다시 수행' },
  // ── 공격 ──
  { id: 'getOff', name: '즉시 내리기', price: 25, cat: 'attack', target: true,
    desc: '지정팀을 즉시 다음 역에서 하차시킴 (페가수스 무효, 스태프 집행)' },
  { id: 'bike', name: '자전거 슝슝', price: 20, cat: 'attack', target: true,
    desc: '지정팀은 다음 역을 도보/자전거로 이동 (스태프 집행)' },
  { id: 'shield', name: '천사카드', price: 20, cat: 'etc', target: false,
    desc: '상대의 공격 1회 자동 무효화 (구매 즉시 대기)' },
  { id: 'shieldTear', name: '천사카드 찢기', price: 20, cat: 'attack', target: true,
    desc: '지정팀의 천사카드를 제거 (천사카드로 못 막음)' },
  { id: 'pull3', name: '3칸 끌어당기기', price: 20, cat: 'attack', target: true,
    desc: '지정팀을 3칸 뒤로 끌어옴' },
  { id: 'pull5', name: '5칸 끌어당기기', price: 30, cat: 'attack', target: true,
    desc: '지정팀을 5칸 뒤로 끌어옴' },
  { id: 'magnet', name: '🧲 자석', price: 20, cat: 'attack', target: false,
    desc: '말판에서 바로 앞에 있는 팀을 내 위치까지 끌어옴 (거리 무제한, 자동 지정)' },
  // ── 기타 ──
  { id: 'slot', name: '🎰 슬롯머신', price: 10, cat: 'etc', target: false,
    desc: '주사위 짝수: 보유 코인 200% / 홀수: 보유 코인 50%' },
  { id: 'americano', name: '☕ 아메리카노', price: 30, cat: 'etc', target: false,
    desc: '다음 역에서 스태프가 커피 한 잔씩 사줌' },
  { id: 'mychew', name: '🍬 마이쮸', price: 5, cat: 'etc', target: false,
    desc: '스태프가 마이쮸 1개씩 줌' },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
// 천사카드로 방어 가능한 공격 (찢기는 방어 불가 — 그게 존재 이유)
export const IS_ATTACK = new Set([
  'pegasusDrop', 'reverse', 'curse', 'doubleMission', 'getOff', 'bike', 'pull3', 'pull5',
]);
export const CATS = [
  { key: 'dice', label: '🎲 주사위' },
  { key: 'mission', label: '📋 미션' },
  { key: 'attack', label: '⚔️ 공격' },
  { key: 'etc', label: '✨ 기타' },
];
