const html = '<font color="#ff6b6b">테스트</font>';
const matches = html.match(/<\/?(?!(span|div|font|b|i|u|br)\b)[^>]*>/gi);
console.log('Matches:', matches);
