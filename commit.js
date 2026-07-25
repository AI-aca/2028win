const { execSync } = require('child_process');
try {
    console.log(execSync('git commit -m "feat: 대시보드 리뉴얼 고도화 및 과학 진도계획 분리"', { encoding: 'utf8' }));
} catch (e) {
    console.error(e.stdout || e.message);
}
try {
    console.log(execSync('git push', { encoding: 'utf8' }));
} catch (e) {
    console.error(e.stdout || e.message);
}
