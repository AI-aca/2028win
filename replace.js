const fs = require('fs');
const path = require('path');

const files = ['index.html', 'script.js', 'Code.gs'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // 학급분류 변형 처리
  content = content.replace(/학급분류\s*\(반\s*이름\)/g, '학급(명)');
  content = content.replace(/학급분류\(반이름\)/g, '학급(명)');
  content = content.replace(/학급분류/g, '학급(명)');
  
  // 대/중/소분류 처리
  content = content.replace(/대분류/g, '구분');
  content = content.replace(/중분류/g, '과목');
  content = content.replace(/소분류/g, '세부과목');
  
  // script.js 내에 변수명 변경 중 일부 깨질 수 있는 부분 복구 (만약 있다면)
  // 현재 코드에서 대분류, 중분류 등은 한글 문자열이나 alert, placeholder 등에만 쓰였음.
  // 객체 키나 변수명에는 영문을 사용했으므로 안전함.
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`${file} 변환 완료`);
});
