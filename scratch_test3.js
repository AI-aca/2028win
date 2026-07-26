const html = '<font color="#ff6b6b"><b>1주차</b></font><script>alert(1)</script>';
const cleaned = html.replace(/<\/?([a-z0-9]+)\b[^>]*>/gi, function(match, tagName) {
  const allowed = ['span', 'div', 'font', 'b', 'i', 'u', 'br'];
  return allowed.includes(tagName.toLowerCase()) ? match : '';
});
console.log('Cleaned:', cleaned);
