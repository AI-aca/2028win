const fs = require('fs');
const filePath = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let content = fs.readFileSync(filePath, 'utf8');

const brokenRegex = /<select id=\"tt-edit-instructor\" style=\"width:100%; padding:10px; border-radius:6px; background:var\(--bg-card\); color:var\(--text\); border:1px solid var\(--border-glass\); outline:none;\">\s*\${instructorOpts}\s*<\/select>\s*rowGroups\.forEach\(grp => \{/;

if (brokenRegex.test(content)) {
    content = content.replace(brokenRegex, `<select id="tt-edit-instructor" style="width:100%; padding:10px; border-radius:6px; background:var(--bg-card); color:var(--text); border:1px solid var(--border-glass); outline:none;">
          \${instructorOpts}
        </select>
      </div>
      <div style="display:flex; gap:10px; margin-top:15px;">
        <button class="btn" style="flex:1; background:rgba(255,255,255,0.1);" onclick="document.getElementById('timetable-editor-overlay').remove(); document.getElementById('timetable-editor-modal').remove();">취소</button>
        <button class="btn btn-primary" style="flex:1;" onclick="app.saveTimetableEditor('\${id}', '\${date}', '\${start}', '\${end}', '\${cls}')">저장</button>
      </div>
    \`;

    let overlay = document.getElementById('timetable-editor-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'timetable-editor-overlay';
      overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; backdrop-filter:blur(3px); cursor:pointer;';
      overlay.onclick = () => { overlay.remove(); modal.remove(); };
      document.body.appendChild(overlay);
    }
  },

  saveTimetableEditor: function(id, date, start, end, cls) {
    const modal = document.getElementById('timetable-editor-modal');
    if(!modal) return;
    const subject = modal.querySelector('#tt-edit-subject').value;
    const instructor = modal.querySelector('#tt-edit-instructor').value;

    let rowObj = this.data.timetables.find(r => r[1] === date && r[2] === '수업' && r[3] === start && r[4] === end && r[5] === cls);
    if (!rowObj) {
      rowObj = [id || '', date, '수업', start, end, cls, subject, instructor, '', ''];
      this.data.timetables.push(rowObj);
    } else {
      rowObj[6] = subject;
      rowObj[7] = instructor;
    }

    this.apiPost('upsertTimetable', { id: rowObj[0], date: rowObj[1], type: rowObj[2], start: rowObj[3], end: rowObj[4], className: rowObj[5], subject: rowObj[6], instructor: rowObj[7], note: rowObj[8] }).then(res => {
      if(res.success && res.id) { rowObj[0] = res.id; }
    });

    document.getElementById('timetable-editor-overlay').remove();
    modal.remove();
    
    this.renderView('timetable');
  },

  updatePivotRowLabel: function(type, oldLabel, newLabel) {
    newLabel = newLabel.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
    if(!newLabel || oldLabel === newLabel) return;
    if(type === 'curriculum') {
      const payloadArray = [];
      this.data.curriculums.forEach(r => {
        if(r[1] === oldLabel) { 
          r[1] = newLabel; 
          payloadArray.push({id: r[0], week: newLabel, subject: r[2], content: r[3], note: ''});
        }
      });
      if (payloadArray.length > 0) {
        this.apiPost('upsertMultipleCurriculums', { payloadArray });
      }
    }
    this.renderView(type);
  },

  addColumn: function(type) {
    const title = type === 'curriculum' ? '새 과목(열) 추가' : '새 반이름(열) 추가';
    document.getElementById('generic-modal-title').innerText = title;
    document.getElementById('generic-modal-body').innerHTML = \`<div class="form-group"><label>\${type === 'curriculum' ? '과목명' : '반이름'}</label><input type="text" id="new-col-input" class="form-control"></div>\`;
    document.getElementById('modal-container').classList.remove('hidden'); document.getElementById('generic-modal').classList.remove('hidden');
    this.currentModalAction = () => {
      const val = document.getElementById('new-col-input').value.trim();
      if(val) {
        if(type === 'curriculum' && !this.dynamicCols.curriculum.includes(val)) {
            this.dynamicCols.curriculum.push(val);
            const week = this.data.curriculums.length > 0 ? this.data.curriculums[0][1] : '1주차';
            const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
            const rowObj = [newId, week, val, '', ''];
            this.data.curriculums.push(rowObj);
            this.apiPost('upsertCurriculum', { id: newId, week, subject: val, content: '', note: '' }).then(res => { if(res.success) rowObj[0] = res.id; });
        }
        if(type === 'timetable' && !this.dynamicCols.timetable.includes(val)) {
            this.dynamicCols.timetable.push(val);
            const rowGroups = Array.from(new Set(this.data.timetables.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));
            const payloadArray = [];
            rowGroups.forEach(grp => {`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Restored');
} else {
    console.log('Not found');
}
