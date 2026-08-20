// 2호선 홍대입구 → (시청 방면) → 강남. 26정거장 이동, 27개 역.
// 좌표는 보드 이미지가 나오기 전까지 사각형 루프에 자동 배치 (0~1 정규화).
// ponytail: 디자인 노선도 이미지 확정되면 x,y를 실측 픽셀값으로 교체
const NAMES = [
  '홍대입구', '신촌', '이대', '아현', '충정로', '시청', '을지로입구',
  '을지로3가', '을지로4가', '동대문역사문화공원', '신당', '상왕십리', '왕십리',
  '한양대', '뚝섬', '성수', '건대입구', '구의', '강변', '잠실나루',
  '잠실', '잠실새내', '종합운동장', '삼성', '선릉', '역삼', '강남',
];

// 사각형 루프에 27칸 배치: 좌변(아래→위) 7, 상변(좌→우) 8, 우변(위→아래) 7, 하변(우→좌) 5
function layout() {
  const pts = [];
  const [L, R, T, B] = [0.07, 0.93, 0.08, 0.92]; // 보드 여백
  for (let i = 0; i < 7; i++) pts.push({ x: L, y: B - ((B - T) * i) / 7 });        // 좌변 ↑
  for (let i = 0; i < 8; i++) pts.push({ x: L + ((R - L) * i) / 7, y: T });        // 상변 →
  for (let i = 1; i < 8; i++) pts.push({ x: R, y: T + ((B - T) * i) / 7 });        // 우변 ↓
  for (let i = 1; i < 6; i++) pts.push({ x: R - ((R - L) * i) / 7, y: B });        // 하변 ←
  return pts;
}

export const STATIONS = NAMES.map((name, i) => ({ name, index: i, ...layout()[i] }));
export const START = 0;
export const FINISH = STATIONS.length - 1;

export const TEAM_COLORS = {
  1: '#e74c3c', 2: '#3498db', 3: '#2ecc71', 4: '#f1c40f',
  5: '#9b59b6', 6: '#e67e22', 7: '#1abc9c', 8: '#fd79a8',
};
