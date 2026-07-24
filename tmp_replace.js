const fs = require('fs');
const filePath = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. saveTimetableEditor
content = content.replace(/saveTimetableEditor: function\(id, date, start, end, cls\) \{[\s\S]*?this\.renderView\('timetable'\);\s*\n\s*\}/, `saveTimetableEditor: async function(id, date, start, end, cls) {
    const modal = document.getElementById('timetable-editor-modal');
    if(!modal) return;
    const subject = modal.querySelector('#tt-edit-subject').value;
    const instructor = modal.querySelector('#tt-edit-instructor').value;

    const originalRows = JSON.parse(JSON.stringify(this.data.timetables));
    let rowObj = this.data.timetables.find(r => r[1] === date && r[2] === '수업' && r[3] === start && r[4] === end && r[5] === cls);
    if (!rowObj) {
      rowObj = [id || '', date, '수업', start, end, cls, subject, instructor, '', ''];
      this.data.timetables.push(rowObj);
    } else {
      rowObj[6] = subject;
      rowObj[7] = instructor;
    }

    try {
      const res = await this.apiPost('upsertTimetable', { id: rowObj[0], date: rowObj[1], type: rowObj[2], start: rowObj[3], end: rowObj[4], className: rowObj[5], subject: rowObj[6], instructor: rowObj[7], note: rowObj[8] });
      if(res && res.success && res.id) { rowObj[0] = res.id; }
      else {
        this.data.timetables = originalRows;
        app.showToast('저장 실패: ' + (res ? res.message : '알 수 없는 에러'), true);
      }
    } catch(e) {
      this.data.timetables = originalRows;
      app.showToast('저장 중 예외 발생: ' + e.message, true);
    }

    const overlay = document.getElementById('timetable-editor-overlay');
    if(overlay) overlay.remove();
    modal.remove();
    
    this.renderView('timetable');
  }`);

// 2. updatePivotRowLabel
content = content.replace(/updatePivotRowLabel: function\(type, oldLabel, newLabel\) \{[\s\S]*?this\.renderView\(type\);\s*\n\s*\}/, `updatePivotRowLabel: async function(type, oldLabel, newLabel) {
    newLabel = newLabel.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
    if(!newLabel || oldLabel === newLabel) return;
    if(type === 'curriculum') {
      const originalRows = JSON.parse(JSON.stringify(this.data.curriculums));
      const payloadArray = [];
      this.data.curriculums.forEach(r => {
        if(r[1] === oldLabel) { 
          r[1] = newLabel; 
          payloadArray.push({id: r[0], week: newLabel, subject: r[2], content: r[3], note: ''});
        }
      });
      if (payloadArray.length > 0) {
        try {
          const res = await this.apiPost('upsertMultipleCurriculums', { payloadArray });
          if (!res || !res.success) throw new Error(res ? res.message : '알 수 없는 에러');
        } catch(e) {
          app.showToast('저장 실패: ' + e.message, true);
          this.data.curriculums = originalRows;
        }
      }
    }
    this.renderView(type);
  }`);

// 3. addColumn
content = content.replace(/addColumn: function\(type\) \{[\s\S]*?this\.closeModal\(\);\s*\n\s*\};\s*\n\s*\}/, `addColumn: function(type) {
    const title = type === 'curriculum' ? '새 과목(열) 추가' : '새 반이름(열) 추가';
    document.getElementById('generic-modal-title').innerText = title;
    document.getElementById('generic-modal-body').innerHTML = \`<div class="form-group"><label>\${type === 'curriculum' ? '과목명' : '반이름'}</label><input type="text" id="new-col-input" class="form-control"></div>\`;
    document.getElementById('modal-container').classList.remove('hidden'); document.getElementById('generic-modal').classList.remove('hidden');
    this.currentModalAction = async () => {
      const val = document.getElementById('new-col-input').value.trim();
      if(val) {
        if(type === 'curriculum' && !this.dynamicCols.curriculum.includes(val)) {
            this.dynamicCols.curriculum.push(val);
            const week = this.data.curriculums.length > 0 ? this.data.curriculums[0][1] : '1주차';
            const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
            const rowObj = [newId, week, val, '', ''];
            this.data.curriculums.push(rowObj);
            try {
              const res = await this.apiPost('upsertCurriculum', { id: newId, week, subject: val, content: '', note: '' });
              if(res && res.success) rowObj[0] = res.id;
              else throw new Error(res ? res.message : '알 수 없는 에러');
            } catch(e) {
              app.showToast('저장 실패: ' + e.message, true);
              this.dynamicCols.curriculum.pop();
              this.data.curriculums.pop();
            }
        }
        if(type === 'timetable' && !this.dynamicCols.timetable.includes(val)) {
            this.dynamicCols.timetable.push(val);
            const rowGroups = Array.from(new Set(this.data.timetables.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));
            const payloadArray = [];
            let addedCount = 0;
            rowGroups.forEach(grp => {
              const [date, tType, start, end] = grp.split('|');
              const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
              const rowObj = [newId, date, tType, start, end, val, '', '', '', ''];
              this.data.timetables.push(rowObj);
              payloadArray.push({ id: newId, date, type: tType, start, end, className: val, subject: '', instructor: '', note: '' });
              addedCount++;
            });
            if (payloadArray.length > 0) {
              try {
                const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
                if (res && res.success && res.returnedIds) {
                  this.data.timetables.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
                } else {
                  throw new Error(res ? res.message : '알 수 없는 에러');
                }
              } catch(e) {
                app.showToast('저장 실패: ' + e.message, true);
                this.dynamicCols.timetable.pop();
                this.data.timetables.splice(-addedCount, addedCount);
              }
            }
        }
        this.renderView(type);
      }
      this.closeModal();
    };
  }`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete.');
