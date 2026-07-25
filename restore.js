const fs = require('fs');
const path = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let code = fs.readFileSync(path, 'utf8');

// The exact string in the file (normalizing newlines to avoid \r\n issues)
code = code.replace(/\r\n/g, '\n');

const brokenStart = `      });
    }
          const id = row ? row[0] : '';
          let bgStyle = 'cursor:pointer;';
          if (id && this.uiSettings['cell_bg_' + id]) bgStyle += \` background-color:\${this.uiSettings['cell_bg_' + id]};\`;
          headHtml += \`<td class="timetable-cell" data-id="\${id}" data-start="\${start}" data-end="\${end}" data-cls="\${cls}" data-date="\${date}" onclick="app.openTimetableEditor(this)" style="\${bgStyle}">\${displayStr}</td>\`;
        });
      }
      headHtml += \`</tr>\`;
    });
    headHtml += \`</tbody>\`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, 'timetable'));
    this.initResizers();
  },`;

const replacement = `      });
    }
  },

  onFlatCellBlur: function(type, cell) {
    let newValue = '';
    const input = cell.querySelector('input');
    if (input) {
      newValue = input.value.trim();
    } else {
      const valHtml = this.getCleanHTML(cell);
      newValue = valHtml.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
      if(newValue === '<br>') newValue = '';
    }

    let dataArray, upsertAction, keys;
    if (type === 'preschedule') { dataArray = this.data.preschedules; upsertAction = 'upsertPreSchedule'; keys = ['date', 'content', 'status', 'note']; }
    else if (type === 'student') { dataArray = this.data.students; upsertAction = 'upsertStudent'; keys = ['name', 'center', 'school', 'grade', 'parentPhone', 'studentPhone', 'note']; }
    else if (type === 'instructor') { dataArray = this.data.instructors; upsertAction = 'upsertInstructor'; keys = ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']; } 

    const colIdx = parseInt(cell.getAttribute('data-col-idx'));
    
    if ((type === 'student' && (colIdx === 5 || colIdx === 6)) || (type === 'instructor' && colIdx === 4)) {
      newValue = app.formatPhone(newValue);
      cell.innerHTML = newValue;
    }

    const rowEl = cell.closest('tr');
    let currentId = rowEl.getAttribute('data-id');
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    
    const rowObj = dataArray[rowIndex];
    if (!rowObj || rowObj[colIdx] === newValue) return;
    const prevValue = rowObj[colIdx];
    rowObj[colIdx] = newValue;

    const payload = { id: currentId };
    for(let i=0; i<keys.length; i++) payload[keys[i]] = rowObj[i+1];
    
    this.apiPost(upsertAction, payload).then(res => {
      if(res.success && res.id) {
        rowObj[0] = res.id; 
        const tr = document.querySelector(\`tr[data-id="\${currentId}"]\`);
        if (tr) tr.setAttribute('data-id', res.id);
      } else {
        rowObj[colIdx] = prevValue;
        app.showToast('저장 실패: ' + (res.message || '오류 발생'), true);
        app.renderView(type);
      }
    });
  },

  addRow: function(type, insertIndex = -1) {
    if (['preschedule', 'student', 'instructor'].includes(type)) {
      const arr = type === 'preschedule' ? this.data.preschedules : (type === 'student' ? this.data.students : this.data.instructors);
      const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      const newRow = [newId];
      const tbody = document.getElementById(\`tbody-\${type}\`);
      const colCount = tbody.parentElement.querySelectorAll('th').length;
      for(let i=0; i<colCount; i++) newRow.push('');
      
      let actualInsertIndex = arr.length;
      const isSorted = Object.values(this.sortState).some(v => v !== undefined);
      if (insertIndex >= 0 && insertIndex <= arr.length && !isSorted) {
        actualInsertIndex = insertIndex;
        arr.splice(actualInsertIndex, 0, newRow);
      } else {
        if (isSorted && insertIndex >= 0) app.showToast('정렬 중에는 맨 뒤에 추가됩니다.');
        arr.push(newRow);
        actualInsertIndex = arr.length - 1;
      }
      this.renderView(type);

      let upsertAction = type === 'preschedule' ? 'upsertPreSchedule' : (type === 'student' ? 'upsertStudent' : 'upsertInstructor');
      let keys = type === 'preschedule' ? ['date', 'content', 'status', 'note'] : (type === 'student' ? ['center', 'name', 'school', 'grade', 'parentPhone', 'studentPhone', 'note'] : ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']);
      let payload = { id: newId, insertIndex: actualInsertIndex };
      for(let i=0; i<keys.length; i++) payload[keys[i]] = '';
      this.apiPost(upsertAction, payload).then(res => {
        if(res.success && res.id) { 
          newRow[0] = res.id; 
          const trs = tbody.querySelectorAll('tr');
          const newRowTr = trs[actualInsertIndex];
          if (newRowTr) newRowTr.setAttribute('data-id', res.id);
        }
      });
    } else if (type === 'curriculum' || type === 'curriculum_science') {
      const dataArr = type === 'curriculum' ? this.data.curriculums : this.data.curriculums_science;
      const dynCols = type === 'curriculum' ? this.dynamicCols.curriculum : this.dynamicCols.curriculum_science;
      const action = type === 'curriculum' ? 'upsertMultipleCurriculums' : 'upsertMultipleCurriculumSciences';

      if (dynCols.length === 0) dynCols.push('새 과목');
      const weeks = new Set(dataArr.map(r => r[1]).filter(Boolean));
      let maxWeek = 0;
      weeks.forEach(w => {
        const m = w.match(/\\d+/);
        if (m) maxWeek = Math.max(maxWeek, parseInt(m[0], 10));
      });
      let nextWeek = \`\${maxWeek + 1}주차\`;
      
      let actualInsertIndex = dataArr.length;
      if (insertIndex >= 0 && insertIndex <= dataArr.length) {
        actualInsertIndex = insertIndex;
      }
      
      let i = 0;
      const tasks = [];
      dynCols.forEach(sub => {
        const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
        const rowObj = [newId, nextWeek, sub, '', ''];
        if (insertIndex >= 0) {
          dataArr.splice(actualInsertIndex + i, 0, rowObj);
        } else {
          dataArr.push(rowObj);
        }
        const payloadInsertIdx = insertIndex >= 0 ? actualInsertIndex + i : -1;
        tasks.push({ rowObj, sub, payloadInsertIdx });
        i++;
      });
      this.renderView(type);

      const payloadArray = tasks.map(t => ({ id: t.rowObj[0], insertIndex: t.payloadInsertIdx, week: nextWeek, subject: t.sub, content: '', note: '' }));
      this.apiPost(action, { payloadArray }).then(res => {
        if (res && res.success) {
          if (res.returnedIds) dataArr.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
          app.renderView(type);
        }
      });
    } else if (type === 'timetable') {
      if (this.dynamicCols.timetable.length === 0) this.dynamicCols.timetable.push('새 학급');
      let nextStart = '', nextEnd = '';
      const tmpDate = 'tmp-' + Date.now() + Math.random().toString(36).substr(2, 5);
      
      let actualInsertIndex = this.data.timetables.length;
      if (insertIndex >= 0 && insertIndex <= this.data.timetables.length) {
        actualInsertIndex = insertIndex;
      }
      
      let i = 0;
      const tasks = [];
      this.dynamicCols.timetable.forEach(cls => {
        const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
        const rowObj = [newId, tmpDate, '수업', nextStart, nextEnd, cls, '', '', '', ''];
                if (insertIndex >= 0) {
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
          const tr = document.querySelector(\`tr[data-grp^="\${tmpDate}|"]\`);
          if (tr) {
            const newIds = this.data.timetables.filter(r => r[1] === tmpDate).map(r => r[0]).join(',');
            tr.setAttribute('data-ids', newIds);
          }
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

  renderCurriculumPivot: function(type = 'curriculum') {
    const isSci = type === 'curriculum_science';
    const viewId = isSci ? 'view-curriculum-science' : 'view-curriculum';
    const table = document.querySelector(\`#\${viewId} .excel-table\`);
    const dynCols = isSci ? this.dynamicCols.curriculum_science : this.dynamicCols.curriculum;
    const dataArr = isSci ? this.data.curriculums_science : this.data.curriculums;

    let weekHeader = this.uiSettings['header_' + viewId + '_0'] || '주차';
    let headHtml = \`<thead><tr><th class="label-col-header fixed-col" style="width:10%;"><div contenteditable="true" onblur="app.onHeaderBlur(this, '\${viewId}', 0)" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">\${weekHeader}</div></th><th class="label-col-header fixed-col" style="width:5%;">회차</th>\`;
    dynCols.forEach((sub, i) => {
      const dynHeader = this.uiSettings['header_' + viewId + '_' + (i+1)] || sub;
      headHtml += \`<th data-colname="\${sub}"><div contenteditable="true" onblur="app.onHeaderBlur(this, '\${viewId}', \${i+1})" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">\${dynHeader}</div></th>\`;
    });
    headHtml += \`</tr></thead><tbody id="tbody-\${isSci ? 'curriculum-science' : 'curriculum'}">\`;

    const weeks = Array.from(new Set(dataArr.map(r => r[1]).filter(Boolean)));

    weeks.forEach(week => {
      const savedSess = this.uiSettings['curr_sess_' + type + '_' + week] || '';
      headHtml += \`<tr data-week="\${week}">
      <td class="label-col" style="font-weight:bold; text-align:center;" contenteditable="true" onblur="app.updatePivotRowLabel('\${type}', '\${week}', this.innerText.trim())">\${week}</td>
      <td class="label-col" style="font-weight:bold; text-align:center;" contenteditable="true" onblur="app.silentSave('saveUISettings', {key: 'curr_sess_\${type}_\${week}', value: this.innerText.trim()}); app.uiSettings['curr_sess_\${type}_\${week}'] = this.innerText.trim();">\${savedSess}</td>\`;
      dynCols.forEach(sub => {
        const row = dataArr.find(r => r[1] === week && r[2] === sub);
        const content = row ? row[3] : '';
        const id = row ? row[0] : '';
        let bgStyle = id && this.uiSettings['cell_bg_' + id] ? \`background-color:\${this.uiSettings['cell_bg_' + id]};\` : '';
        headHtml += \`<td contenteditable="true" data-id="\${id}" data-week="\${week}" data-sub="\${sub}" onblur="app.onCurriculumBlur(this, '\${type}')" onkeydown="app.onKeyDown(event, this)" style="\${bgStyle}">\${content}</td>\`;
      });
      headHtml += \`</tr>\`;
    });
    headHtml += \`</tbody>\`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
  },

  onCurriculumBlur: function(cell, type = 'curriculum') {
    let newValue = this.getCleanHTML(cell);
    newValue = newValue.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
    if(newValue === '<br>') newValue = '';
    const id = cell.getAttribute('data-id'), week = cell.getAttribute('data-week'), sub = cell.getAttribute('data-sub');
    const isSci = type === 'curriculum_science';
    const dataArr = isSci ? this.data.curriculums_science : this.data.curriculums;
    const action = isSci ? 'upsertCurriculumScience' : 'upsertCurriculum';

    let rowObj = dataArr.find(r => (id && r[0] === id) || (r[1] === week && r[2] === sub));
    if (rowObj) { if (rowObj[3] === newValue) return; rowObj[3] = newValue; }
    else { if (!newValue) return; rowObj = ['', week, sub, newValue, '']; dataArr.push(rowObj); }
    
    this.apiPost(action, { id: rowObj[0], week, subject: sub, content: newValue }).then(res => {
      if(res.success && res.id) { rowObj[0] = res.id; cell.setAttribute('data-id', res.id); }
    });
  },

  editTimetableClassName: function(oldName) {
    document.getElementById('generic-modal-title').innerText = '반 이름 수정';
    document.getElementById('generic-modal-body').innerHTML = \`<div class="form-group"><label>반이름</label><input type="text" id="new-col-input" class="form-control" value="\${oldName}"></div>\`;
    document.getElementById('modal-container').classList.remove('hidden'); 
    document.getElementById('generic-modal').classList.remove('hidden');
    
    this.currentModalAction = async () => {
      const newName = document.getElementById('new-col-input').value.trim();
      if (!newName || newName === oldName) {
        this.closeModal();
        return;
      }
      
      const payloadArray = [];
      this.data.timetables.forEach(r => {
        if (r[5] === oldName) {
          r[5] = newName;
          payloadArray.push({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] });
        }
      });
      
      if (payloadArray.length > 0) {
        try {
          const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
          if (!res || !res.success) throw new Error(res ? res.message : '알 수 없는 에러');
        } catch(e) {
          app.showToast('저장 실패: ' + e.message, true);
          this.data.timetables.forEach(r => { if (r[5] === newName) r[5] = oldName; });
          this.closeModal();
          return;
        }
      }
      
      const idx = this.dynamicCols.timetable.indexOf(oldName);
      if (idx !== -1) this.dynamicCols.timetable[idx] = newName;
      
      this.renderView('timetable');
      this.closeModal();
    };
  },

  renderTimetablePivot: function() {
    const table = document.querySelector('#view-timetable .excel-table');
    let headHtml = \`<thead><tr><th class="label-col-header fixed-col" style="width:10%;">일자</th><th class="label-col-header fixed-col" style="width:5%;">주차</th><th class="label-col-header fixed-col" style="width:5%;">회차</th><th class="label-col-header fixed-col" style="width:6%;">시작 시간</th><th class="label-col-header fixed-col" style="width:6%;">종료 시간</th>\`;
    this.dynamicCols.timetable.forEach(cls => {
      headHtml += \`<th data-colname="\${cls}" onclick="app.editTimetableClassName('\${cls}')" style="cursor:pointer;" title="클릭하여 반 이름 수정">\${cls}</th>\`;
    });
    headHtml += \`</tr></thead><tbody id="tbody-timetable">\`;

    const rowGroups = Array.from(new Set(this.data.timetables.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));

    rowGroups.forEach(grp => {
      const [date, type, start, end] = grp.split('|');
      const isHoliday = (type === '휴일');
      const isTmpDate = date.startsWith('tmp-');
      const displayDate = isTmpDate ? '' : (this.uiSettings['tt_fmt_date_' + grp] || date);
      
      const idsForGrp = this.data.timetables.filter(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end).map(r => r[0]).join(',');
      const savedWeek = this.uiSettings['tt_week_' + grp] || '';
      const savedSess = this.uiSettings['tt_sess_' + grp] || '';
      
      headHtml += \`<tr data-ids="\${idsForGrp}" data-grp="\${grp}">
        <td class="fixed-col label-col tt-date-cell" data-cell-key="bg_tt_date_\${grp}" contenteditable="true" onblur="app.updatePivotRowDate(this, this.innerText.trim())" placeholder="날짜 선택" style="text-align:center; \${this.uiSettings['bg_tt_date_'+grp]?('background-color:'+this.uiSettings['bg_tt_date_'+grp]+';'):''}"><span class="drag-handle"></span>\${displayDate}</td>
        <td class="fixed-col label-col tt-week-cell" data-cell-key="bg_tt_week_\${grp}" contenteditable="true" onblur="app.silentSave('saveUISettings', {key: 'tt_week_\${grp}', value: this.innerText.trim()}); app.uiSettings['tt_week_\${grp}'] = this.innerText.trim();" style="text-align:center; \${this.uiSettings['bg_tt_week_'+grp]?('background-color:'+this.uiSettings['bg_tt_week_'+grp]+';'):''}">\${savedWeek}</td>
        <td class="fixed-col label-col tt-sess-cell" data-cell-key="bg_tt_sess_\${grp}" contenteditable="true" onblur="app.silentSave('saveUISettings', {key: 'tt_sess_\${grp}', value: this.innerText.trim()}); app.uiSettings['tt_sess_\${grp}'] = this.innerText.trim();" style="text-align:center; \${this.uiSettings['bg_tt_sess_'+grp]?('background-color:'+this.uiSettings['bg_tt_sess_'+grp]+';'):''}">\${savedSess}</td>\`;
      
      if (isHoliday) {
        const holidayRow = this.data.timetables.find(r => r[1] === date && r[2] === '휴일');
        const holidayNote = holidayRow ? (holidayRow[8] || '') : '';
        headHtml += \`<td colspan="2" class="fixed-col label-col" style="text-align:center; color:var(--text-muted); font-style:italic;">🏖️ 휴일</td>\`;
        headHtml += \`<td colspan="\${this.dynamicCols.timetable.length}" class="timetable-cell" data-id="\${holidayRow?holidayRow[0]:''}" data-date="\${date}" contenteditable="true" onblur="app.onTimetableHolidayBlur(this)" style="text-align:center; background:rgba(255,255,255,0.05); color:var(--text-muted); font-style:italic;">\${holidayNote || '휴일/특이사항 입력'}</td>\`;
      } else {
        const fmtStart = this.uiSettings['tt_fmt_start_' + grp] || start;
        const fmtEnd = this.uiSettings['tt_fmt_end_' + grp] || end;
        headHtml += \`<td class="fixed-col label-col tt-time-cell" data-time-type="start" data-cell-key="bg_tt_start_\${grp}" contenteditable="true" onblur="app.updatePivotRowTime(this, 'start', this.innerText.trim())" placeholder="00:00" style="text-align:center; \${this.uiSettings['bg_tt_start_'+grp]?('background-color:'+this.uiSettings['bg_tt_start_'+grp]+';'):''}">\${fmtStart}</td>
        <td class="fixed-col label-col tt-time-cell" data-time-type="end" data-cell-key="bg_tt_end_\${grp}" contenteditable="true" onblur="app.updatePivotRowTime(this, 'end', this.innerText.trim())" placeholder="00:00" style="text-align:center; \${this.uiSettings['bg_tt_end_'+grp]?('background-color:'+this.uiSettings['bg_tt_end_'+grp]+';'):''}">\${fmtEnd}</td>\`;
        this.dynamicCols.timetable.forEach(cls => {
          const row = this.data.timetables.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end && r[5] === cls);
          let displayStr = row && (row[6] || row[7]) ? \`\${row[6]||''}\${row[7]?'('+row[7]+')':''}\` : '';
          displayStr = displayStr.trim();
          const id = row ? row[0] : '';
          let bgStyle = 'cursor:pointer;';
          if (id && this.uiSettings['cell_bg_' + id]) bgStyle += \` background-color:\${this.uiSettings['cell_bg_' + id]};\`;
          headHtml += \`<td class="timetable-cell" data-id="\${id}" data-start="\${start}" data-end="\${end}" data-cls="\${cls}" data-date="\${date}" onclick="app.openTimetableEditor(this)" style="\${bgStyle}">\${displayStr}</td>\`;
        });
      }
      headHtml += \`</tr>\`;
    });
    headHtml += \`</tbody>\`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, 'timetable'));
    this.initResizers();
    app.initFlatpickr(); // 초기화
  }`;

if (code.includes(brokenStart)) {
  code = code.replace(brokenStart, replacement);
  // I will also fix + 일정 추가 -> + 내용 추가 (Line ~338)
  code = code.replace('+ 일정 추가', '+ 내용 추가');
  // I will also fix 상태 width: '10%' -> '5%'
  code = code.replace("{label:'상태', idx:3, fixed:true, width:'10%'}", "{label:'상태', idx:3, fixed:true, width:'5%'}");

  // inject initFlatpickr
  if (!code.includes('initFlatpickr:')) {
    code = code.replace('bindGlobalEvents: function() {', `initFlatpickr: function() {
    if (window.flatpickr) {
      flatpickr(".tt-date-cell, td[placeholder='날짜 선택']", {
        dateFormat: "y-m-d (D)",
        locale: "ko",
        onChange: function(selectedDates, dateStr, instance) {
          const cell = instance.element;
          if(cell.getAttribute('data-cell-key')) {
             if(cell.classList.contains('tt-date-cell')) {
                app.updatePivotRowDate(cell, dateStr);
             } else {
                app.onFlatCellBlur(cell.closest('.view-section').id.replace('view-',''), cell);
             }
          }
        }
      });
      // Time dropdown logic
      const times = [];
      for(let h=10; h<=22; h++) {
        ['00', '30'].forEach(m => {
          if (h===22 && m==='30') return;
          times.push(\`\${String(h).padStart(2,'0')}:\${m}\`);
        });
      }
      document.querySelectorAll(".tt-time-cell").forEach(cell => {
         cell.addEventListener('dblclick', (e) => {
           let select = document.createElement('select');
           select.className = 'time-dropdown dark-dropdown';
           select.innerHTML = '<option value="">선택</option>' + times.map(t => \`<option value="\${t}">\${t}</option>\`).join('');
           select.value = cell.innerText.trim();
           select.onchange = () => {
             app.updatePivotRowTime(cell, cell.getAttribute('data-time-type'), select.value);
             select.remove();
           };
           cell.innerHTML = '';
           cell.appendChild(select);
         });
      });
    }
  },

  bindGlobalEvents: function() {`);
  }
  
  fs.writeFileSync(path, code, 'utf8');
  console.log("RESTORED AND UPDATED!");
} else {
  console.log("BROKEN START NOT FOUND");
}
