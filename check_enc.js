const fs = require('fs');
try {
    const idx = fs.readFileSync('index.html', 'utf8');
    const sc = fs.readFileSync('script.js', 'utf8');
    console.log(idx.includes('영재학교') ? 'index.html OK' : 'index.html FAIL');
    console.log(sc.includes('저장') ? 'script.js OK' : 'script.js FAIL');
} catch (e) {
    console.error(e);
}
