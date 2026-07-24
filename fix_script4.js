const fs = require('fs');
const file = 'c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script.js';
let code = fs.readFileSync(file, 'utf8');
code = code.replace("const rowObj = [newId, tmpDate, '수업', nextStart, nextEnd, cls, '', '', '', ''];", "const rowObj = [newId, tmpDate, '수업', nextStart, nextEnd, cls, '', '', '', newId];");
code = code.replace("if (ids.includes(String(r[0]))) {", "if (ids.includes(String(r[0])) || ids.includes(String(r[9]))) {");
fs.writeFileSync(file, code, 'utf8');
console.log('Fixed flawlessly.');
