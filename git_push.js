const { execSync } = require('child_process');
const opts = { cwd: "c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반" };
try {
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" add .', opts).toString());
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" commit -m "UI: 시간표 거인병 픽스, 진도계획표 주차 중복 증발 방지(Zero-width space), 달력 모달 분리, 강사 팝업 모달 개편"', opts).toString());
  console.log(execSync('"C:\\Program Files\\Git\\bin\\git.exe" push', opts).toString());
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e.message);
  console.error(e.stderr ? e.stderr.toString() : '');
}
