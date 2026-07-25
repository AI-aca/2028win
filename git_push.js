const { execSync } = require('child_process');
const opts = { cwd: "c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반" };
try {
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" add .', opts).toString());
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" commit -m "fix: 시간표 돔 붕괴 복구 및 평면 표 행높이 축소, 전역 13px 세팅"', opts).toString());
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" push', opts).toString());
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e.message);
  console.error(e.stderr ? e.stderr.toString() : '');
}
