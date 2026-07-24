const fs = require('fs');
let code = fs.readFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script.js', 'utf8');

const marker1 = '      if (insertIndex >= 0 && insertIndex <= this.data.timetables.length) {\r\n';
const marker2 = '                if (insertIndex >= 0) {\r\n          this.data.timetables.splice(actualInsertIndex + i, 0, rowObj);';

const idx1 = code.indexOf(marker1);
const idx2 = code.indexOf(marker2, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    const replacement = '      if (insertIndex >= 0 && insertIndex <= this.data.timetables.length) {\r\n        actualInsertIndex = insertIndex;\r\n      }\r\n      \r\n      let i = 0;\r\n      const tasks = [];\r\n      this.dynamicCols.timetable.forEach(cls => {\r\n        const newId = \'f-\' + Date.now().toString(36) + \'-\' + Math.random().toString(36).substr(2, 5);\r\n        const rowObj = [newId, tmpDate, \'수업\', nextStart, nextEnd, cls, \'\', \'\', \'\', newId];\r\n';
    const newCode = code.substring(0, idx1) + replacement + code.substring(idx2);
    fs.writeFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script.js', newCode, 'utf8');
    console.log('Successfully repaired!');
} else {
    // If \n instead of \r\n
    const m1 = '      if (insertIndex >= 0 && insertIndex <= this.data.timetables.length) {\n';
    const m2 = '                if (insertIndex >= 0) {\n          this.data.timetables.splice(actualInsertIndex + i, 0, rowObj);';
    const i1 = code.indexOf(m1);
    const i2 = code.indexOf(m2, i1);
    if (i1 !== -1 && i2 !== -1) {
        const rep = '      if (insertIndex >= 0 && insertIndex <= this.data.timetables.length) {\n        actualInsertIndex = insertIndex;\n      }\n      \n      let i = 0;\n      const tasks = [];\n      this.dynamicCols.timetable.forEach(cls => {\n        const newId = \'f-\' + Date.now().toString(36) + \'-\' + Math.random().toString(36).substr(2, 5);\n        const rowObj = [newId, tmpDate, \'수업\', nextStart, nextEnd, cls, \'\', \'\', \'\', newId];\n';
        const nCode = code.substring(0, i1) + rep + code.substring(i2);
        fs.writeFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script.js', nCode, 'utf8');
        console.log('Successfully repaired with \\n!');
    } else {
        console.log('Markers not found');
    }
}
