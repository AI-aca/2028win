const fs = require('fs');
const path = 'c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /if\s*\(insertIndex\s*>=\s*0\)\s*\{\s*\n\s*if\s*\(res\.success\s*&&\s*res\.id\)\s*\{\s*\n\s*rowObj\[0\]\s*=\s*res\.id;\s*\n\s*const\s*isHoliday\s*=\s*\(type\s*===\s*'휴일'\);/;
const match = regex.exec(code);

if (match) {
    console.log("Found match at index:", match.index);
    
    // We need to replace from the match index.
    // Let's actually do the full reconstruction.
    // The broken code is:
    /*
        if (insertIndex >= 0) {
        if (res.success && res.id) {
          rowObj[0] = res.id;
      const isHoliday = (type === '휴일');
    */
    
    const replacement = `        if (insertIndex >= 0) {
          this.data.timetables.splice(actualInsertIndex + i, 0, rowObj);
        } else {
          this.data.timetables.push(rowObj);
        }
        const payloadInsertIdx = insertIndex >= 0 ? actualInsertIndex + i : -1;
        tasks.push({ rowObj, cls, payloadInsertIdx });
        i++;
      });
      this.renderView(type);
      
      const payloadArray = tasks.map(t => ({ id: t.rowObj[0], insertIndex: t.payloadInsertIdx, date: tmpDate, type: '수업', start: nextStart, end: nextEnd, className: t.cls, subject: '', instructor: '', note: '' }));
      this.apiPost('upsertMultipleTimetables', { payloadArray }).then(res => {
        if (res && res.success && res.returnedIds) {
          this.data.timetables.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
        }
      });
    } else if (type === 'holiday') {
      const tmpDate = 'tmp-' + Date.now() + Math.random().toString(36).substr(2, 5);
      const rowObj = ['', tmpDate, '휴일', '00:00', '00:00', '전체', '휴일', '', '', ''];
      this.data.timetables.push(rowObj);
      this.apiPost('upsertTimetable', { id: '', date: tmpDate, type: '휴일', start: '00:00', end: '00:00', className: '전체', subject: '휴일', instructor: '', note: '' }).then(res => {
        if (res.success && res.id) {
          rowObj[0] = res.id;
          const td = document.querySelector(\`td[data-date="\${tmpDate}"]\`);
          if (td) td.setAttribute('data-id', res.id);
        }
      });
      this.renderView('timetable');
    }
  },

  renderCurriculumPivot: function() {
    const table = document.querySelector('#view-curriculum .excel-table');
    let headHtml = \`<thead><tr><th class="label-col-header fixed-col" style="width:10%;">주차</th>\`;
    this.dynamicCols.curriculum.forEach(sub => {
      headHtml += \`<th data-colname="\${sub}">\${sub}</th>\`;
    });
    headHtml += \`</tr></thead><tbody id="tbody-curriculum">\`;

    const weeks = Array.from(new Set(this.data.curriculums.map(r => r[1]).filter(Boolean)));

    weeks.forEach(week => {
      headHtml += \`<tr data-week="\${week}">
      <td class="label-col" style="font-weight:bold; text-align:center;" contenteditable="true" onblur="app.updatePivotRowLabel('curriculum', '\${week}', this.innerText.trim())">\${week}</td>\`;
      this.dynamicCols.curriculum.forEach(sub => {
        const row = this.data.curriculums.find(r => r[1] === week && r[2] === sub);
        const content = row ? row[3] : '';
        headHtml += \`<td contenteditable="true" data-id="\${row?row[0]:''}" data-week="\${week}" data-sub="\${sub}" onblur="app.onCurriculumBlur(this)" onkeydown="app.onKeyDown(event, this)">\${content}</td>\`;
      });
      headHtml += \`</tr>\`;
    });
    headHtml += \`</tbody>\`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, 'curriculum'));
    this.initResizers();
  },

  onCurriculumBlur: function(cell) {
    let newValue = this.getCleanHTML(cell);
    newValue = newValue.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
    if(newValue === '<br>') newValue = '';
    const id = cell.getAttribute('data-id'), week = cell.getAttribute('data-week'), sub = cell.getAttribute('data-sub');
    let rowObj = this.data.curriculums.find(r => (id && r[0] === id) || (r[1] === week && r[2] === sub));
    if (rowObj) { if (rowObj[3] === newValue) return; rowObj[3] = newValue; }
    else { if (!newValue) return; rowObj = ['', week, sub, newValue, '']; this.data.curriculums.push(rowObj); }
    
    this.apiPost('upsertCurriculum', { id: rowObj[0], week, subject: sub, content: newValue }).then(res => {
      if(res.success && res.id) { rowObj[0] = res.id; cell.setAttribute('data-id', res.id); }
    });
  },

  renderTimetablePivot: function() {
    const table = document.querySelector('#view-timetable .excel-table');
    let headHtml = \`<thead><tr><th class="label-col-header fixed-col" style="width:10%;">일자</th><th class="label-col-header fixed-col" style="width:10%;">시작 시간</th><th class="label-col-header fixed-col" style="width:10%;">종료 시간</th>\`;
    this.dynamicCols.timetable.forEach(cls => {
      headHtml += \`<th data-colname="\${cls}">\${cls}</th>\`;
    });
    headHtml += \`</tr></thead><tbody id="tbody-timetable">\`;

    const rowGroups = Array.from(new Set(this.data.timetables.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));

    rowGroups.forEach(grp => {
      const [date, type, start, end] = grp.split('|');
      const isHoliday = (type === '휴일');`;

    const newCode = code.substring(0, match.index) + replacement + code.substring(match.index + match[0].length);
    fs.writeFileSync(path, newCode, 'utf8');
    console.log('Successfully wrote repaired code!');
} else {
    console.log('Regex match not found. Need manual inspection.');
}
