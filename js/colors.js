// 每個選項是一個可選的「隊伍身分」：label 顯示在畫面上、hex 是記分板底色、
// voice 是語音辨識要比對的詞（不一定要是顏色，例如天氣/風險是自訂隊名）
export const COLORS = [
  { id: 'red', label: '紅', hex: '#c62828', voice: ['紅色隊', '紅隊', '紅色', '紅'] },
  { id: 'blue', label: '藍', hex: '#1565c0', voice: ['藍色隊', '藍隊', '藍色', '藍'] },
  { id: 'green', label: '綠', hex: '#2e7d32', voice: ['綠色隊', '綠隊', '綠色', '綠'] },
  { id: 'yellow', label: '黃', hex: '#f9a825', voice: ['黃色隊', '黃隊', '黃色', '黃'] },
  { id: 'orange', label: '橘', hex: '#ef6c00', voice: ['橘色隊', '橘隊', '橘色', '橘'] },
  { id: 'purple', label: '紫', hex: '#6a1b9a', voice: ['紫色隊', '紫隊', '紫色', '紫'] },
  { id: 'weather', label: '天氣', hex: '#00838f', voice: ['天氣隊', '天氣'] },
  { id: 'risk', label: '風險', hex: '#ad1457', voice: ['風險隊', '風險'] },
];

export function colorById(id) {
  return COLORS.find((c) => c.id === id);
}
