const { execSync } = require('child_process');
const opts = { cwd: "c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반" };
try {
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" add .', opts).toString());
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" commit -m "refactor: 시간표 및 진도계획 시스템-와이드 groupId 병합 방지 아키텍처 완전 적용 (GAS/Google Sheets 의존성 없음)"', opts).toString());
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" push', opts).toString());
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e.message);
  console.error(e.stderr ? e.stderr.toString() : '');
}
