export const QUOTES = [
  { text: '시작이 반이다.', author: '아리스토텔레스' },
  { text: '오늘 할 수 있는 일을 내일로 미루지 마라.', author: '벤저민 프랭클린' },
  { text: '작은 일에도 최선을 다하라. 작은 일에서 큰 힘이 나온다.', author: '데모스테네스' },
  { text: '성공은 매일 반복한 작은 노력의 합이다.', author: '로버트 콜리어' },
  { text: '목표를 향해 한 걸음 내딛는 것이 목표를 세우는 것보다 중요하다.', author: '마하트마 간디' },
  { text: '실패는 성공의 어머니다.', author: '토마스 에디슨' },
  { text: '당신이 할 수 있다고 믿든, 할 수 없다고 믿든, 당신 말이 맞다.', author: '헨리 포드' },
  { text: '위대한 일은 작은 일들이 모여 이루어진다.', author: '빈센트 반 고흐' },
  { text: '미래는 현재 우리가 무엇을 하느냐에 달려 있다.', author: '마하트마 간디' },
  { text: '매일 조금씩 나아지면 결국 큰 변화가 온다.', author: '존 우든' },
  { text: '행동이 모든 성공의 기초이다.', author: '파블로 피카소' },
  { text: '포기하지 않는 한, 실패란 없다.', author: '엘론 머스크' },
  { text: '완벽을 두려워하지 마라. 완벽에 도달하지 못할 테니까.', author: '살바도르 달리' },
  { text: '오늘의 나는 어제의 선택으로 만들어졌다.', author: '엘리너 루스벨트' },
  { text: '변화를 원한다면 스스로가 그 변화가 되어라.', author: '마하트마 간디' },
  { text: '꿈을 이루고 싶다면 먼저 꿈에서 깨어나라.', author: 'J.M. 파워' },
  { text: '천 리 길도 한 걸음부터.', author: '노자' },
  { text: '성공한 사람이 되려 하지 말고, 가치 있는 사람이 되려 하라.', author: '알베르트 아인슈타인' },
  { text: '지금 자는 것은 꿈을 꾸는 것이고, 지금 공부하는 것은 꿈을 이루는 것이다.', author: '하버드 도서관 명언' },
  { text: '계획 없는 목표는 한낱 소원에 불과하다.', author: '앙투안 드 생텍쥐페리' },
  { text: '노력은 배신하지 않는다.', author: '작자 미상' },
  { text: '오늘 하루도 최선을 다하자.', author: '작자 미상' },
  { text: '할 수 있다고 생각하면 할 수 있고, 할 수 없다고 생각하면 할 수 없다.', author: '부처' },
  { text: '고통이 남기고 간 뒤를 보라. 고난이 지나면 반드시 기쁨이 스며든다.', author: '괴테' },
  { text: '인생은 속도가 아니라 방향이다.', author: '작자 미상' },
  { text: '습관이 운명을 만든다.', author: '작자 미상' },
  { text: '지금 이 순간에 집중하라. 그것이 인생의 비밀이다.', author: '마르쿠스 아우렐리우스' },
  { text: '어려운 길을 택하라. 그 끝에 성장이 있다.', author: '작자 미상' },
  { text: '멈추지 않는 한 얼마나 천천히 가는지는 문제되지 않는다.', author: '공자' },
  { text: '오늘 심은 씨앗이 내일의 꽃이 된다.', author: '작자 미상' },
];

export function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
