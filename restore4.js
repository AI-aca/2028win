const fs = require('fs');
const path = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/\r\n/g, '\n');

const sIdx = code.indexOf(`  sortTable: function(type, colIdx, iconEl) {`);
const eIdx = code.indexOf(`  addColumn: function(`, sIdx);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = `  sortTable: function(type, colIdx, iconEl) {
    if (this.sortState[type] && this.sortState[type].colIdx === colIdx) {
      this.sortState[type].asc = !this.sortState[type].asc;
    } else {
      this.sortState[type] = { colIdx, asc: true };
    }
    const isAsc = this.sortState[type].asc;
    document.querySelectorAll(\`.sort-icon-\${type}\`).forEach(el => el.innerText = '↕');
    iconEl.innerText = isAsc ? '▲' : '▼';
    
    let dataArray;
    if (type === 'preschedule') dataArray = this.data.preschedules;
    else if (type === 'student') dataArray = this.data.students;
    else if (type === 'instructor') dataArray = this.data.instructors;
    else return;

    dataArray.sort((a, b) => {
      let v1 = a[colIdx+1] || ''; let v2 = b[colIdx+1] || '';
      if(typeof v1 === 'string') v1 = v1.toLowerCase();
      if(typeof v2 === 'string') v2 = v2.toLowerCase();
      if (v1 < v2) return isAsc ? 1 : -1;
      if (v1 > v2) return isAsc ? -1 : 1;
      return 0;
    });
    this.renderView(type);
  },

  renderFlatTable: function(type, dataArray, cols) {
    const tbody = document.getElementById(\`tbody-\${type}\`);
    if (!tbody) return;
    const thead = tbody.previousElementSibling;
    if(thead && thead.querySelector('tr')) {
      let ths = '';
      cols.forEach((c, i) => {
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? (c.idx !== undefined ? c.idx : i+1) : i+1;
        const widthStr = (typeof c === 'object' && c.width) ? \`width:\${c.width};\` : '';
        const fixedClass = (typeof c === 'object' && c.fixed) ? 'fixed-col label-col-header' : '';
        const savedHeader = this.uiSettings['header_view-' + type + '_' + colIdx] || label;
        ths += \`<th class="\${fixedClass}" style="\${widthStr}"><div contenteditable="true" onblur="app.onHeaderBlur(this, 'view-' + type, \${colIdx})" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">\${savedHeader}</div></th>\`;
      });
      thead.querySelector('tr').innerHTML = ths;
    }

    let html = '';
    dataArray.forEach(row => {
      const id = row[0]; html += \`<tr data-id="\${id}">\`;
      for(let i=0; i<cols.length; i++) {
        const c = cols[i];
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? (c.idx !== undefined ? c.idx : i+1) : i+1;
        const isFixed = typeof c === 'object' && c.fixed;
        const cellClassStr = isFixed ? 'class="label-col"' : '';
        const val = row[colIdx] || '';
        const cellKey = \`bg_flat_\${type}_\${id}_\${colIdx}\`;
        const bgStyle = this.uiSettings[cellKey] ? \`background-color:\${this.uiSettings[cellKey]};\` : '';
        
        if (label === '일자') {
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" \${cellClassStr} contenteditable="true" onblur="app.onFlatCellBlur('\${type}', this)" placeholder="날짜 선택" style="text-align:center; \${bgStyle}">\${val}</td>\`;
        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusTxt = isDone ? '🟢 완료' : '🟡 진행 중';
          const txtColor = isDone ? '#10b981' : '#f59e0b';
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" class="status-cell \${isFixed ? 'label-col' : ''}" style="text-align:center; \${bgStyle}"><div style="color:\${txtColor}; font-weight:bold; cursor:pointer;" onclick="app.toggleStatus(this, '\${type}', \${colIdx})">\${statusTxt}</div></td>\`;
        } else {
          let extraEvents = \`onkeydown="app.onKeyDown(event, this)"\`;
          let displayVal = val;
          let placeholder = (label === '학생명' || label === '강사명') ? 'placeholder="이름 입력"' : '';
          
          if ((type === 'student' && (colIdx === 5 || colIdx === 6)) || (type === 'instructor' && colIdx === 4)) {
            extraEvents = \`onfocus="app.handlePhoneFocus(this)" onkeydown="app.handlePhoneKeydown(event, this)"\`;
            placeholder = 'placeholder="숫자 11자리 입력"';
          }
          html += \`<td \${cellClassStr} data-cell-key="\${cellKey}" contenteditable="true" data-col-idx="\${colIdx}" \${placeholder} onblur="app.onFlatCellBlur('\${type}', this)" style="\${bgStyle}" \${extraEvents}>\${displayVal}</td>\`;
        }
      }
      html += \`</tr>\`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
  },

  initResizers: function() {
    document.querySelectorAll('.excel-table').forEach(table => {
      const fixedThs = table.querySelectorAll('th.fixed-col');
      const dynThs = table.querySelectorAll('th:not(.fixed-col)');
      if (dynThs.length === 0) return;
      
      let fixedTotalPct = 0;
      fixedThs.forEach(th => {
        let w = th.style.width;
        if (w && w.includes('%')) fixedTotalPct += parseFloat(w);
        else fixedTotalPct += 10;
      });
      
      const expectedDynTotal = 100 - fixedTotalPct;
      let currentDynTotal = 0;
      let dynWidths = [];
      
      dynThs.forEach((th, i) => {
        const dynIdx = Array.from(th.parentNode.children).indexOf(th);
        const dynId = th.closest('.view-section').id + '-col-' + dynIdx;
        let w = this.uiSettings[dynId];
        let val = (w && w.includes('%')) ? parseFloat(w) : (expectedDynTotal / dynThs.length);
        dynWidths.push(val);
        currentDynTotal += val;
      });
      
      if (Math.abs(currentDynTotal - expectedDynTotal) > 0.1) {
        const scale = expectedDynTotal / currentDynTotal;
        dynThs.forEach((th, i) => {
          const newPct = dynWidths[i] * scale;
          th.style.width = newPct + '%';
        });
      } else {
        dynThs.forEach((th, i) => {
          th.style.width = dynWidths[i] + '%';
        });
      }
    });

    document.querySelectorAll('.excel-table th:not(.fixed-col)').forEach((th) => {
      if (!th.querySelector('.resizer')) {
        const resizer = document.createElement('div');
        resizer.className = 'resizer'; th.appendChild(resizer);
        let x = 0, tableEl = null;
        
        const mouseMoveHandler = (e) => { 
          const tableWidth = tableEl.getBoundingClientRect().width;
          let deltaPx = e.clientX - x;
          let deltaPct = (deltaPx / tableWidth) * 100;
          
          const startPct = parseFloat(th.getAttribute('data-start-pct'));
          const allThs = Array.from(tableEl.querySelectorAll('th:not(.fixed-col)'));
          const myIdx = allThs.indexOf(th);
          const rightThs = allThs.slice(myIdx + 1);
          
          if (rightThs.length === 0) return;
          
          const totalRightPct = rightThs.reduce((sum, col) => sum + parseFloat(col.getAttribute('data-start-pct')), 0);
          const MIN_PCT = 3;
          let newPct = startPct + deltaPct;
          
          if (newPct < MIN_PCT) {
            newPct = MIN_PCT;
            deltaPct = newPct - startPct;
          }
          
          const maxSteal = totalRightPct - (rightThs.length * MIN_PCT);
          if (deltaPct > maxSteal) {
            deltaPct = maxSteal;
            newPct = startPct + deltaPct;
          }
          
          th.style.width = \`\${newPct}%\`;
          
          rightThs.forEach(col => {
            const startRightPct = parseFloat(col.getAttribute('data-start-pct'));
            const stealAmount = (startRightPct / totalRightPct) * deltaPct;
            col.style.width = \`\${startRightPct - stealAmount}%\`;
          });
          
          if (!this.resizeTooltip) {
            this.resizeTooltip = document.createElement('div');
            this.resizeTooltip.className = 'resize-tooltip';
            this.resizeTooltip.style.cssText = 'position: fixed; background: rgba(0,0,0,0.8); color: #06b6d4; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; pointer-events: none; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 1px solid rgba(6,182,212,0.3); transition: none;';
            document.body.appendChild(this.resizeTooltip);
          }
          this.resizeTooltip.style.left = (e.clientX + 15) + 'px';
          this.resizeTooltip.style.top = (e.clientY - 30) + 'px';
          this.resizeTooltip.innerText = Math.round(newPct) + '%';
        };
        const mouseUpHandler = () => {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
          resizer.classList.remove('resizing');
          if (this.resizeTooltip) {
            this.resizeTooltip.remove();
            this.resizeTooltip = null;
          }
          Array.from(tableEl.querySelectorAll('th:not(.fixed-col)')).forEach(col => {
            if (col.style.width && col.style.width.includes('%')) {
               const i = Array.from(col.parentNode.children).indexOf(col);
               const dynId = col.closest('.view-section').id + '-col-' + i;
               this.silentSave('saveUISettings', { key: dynId, value: col.style.width });
               this.uiSettings[dynId] = col.style.width;
            }
          });
        };
        resizer.addEventListener('mousedown', (e) => {
          x = e.clientX; 
          tableEl = th.closest('.excel-table');
          const tableWidth = tableEl.getBoundingClientRect().width;
          
          Array.from(tableEl.querySelectorAll('th:not(.fixed-col)')).forEach(col => {
            const currentW = col.getBoundingClientRect().width;
            const pct = (currentW / tableWidth) * 100;
            col.setAttribute('data-start-pct', pct);
            col.style.width = \`\${pct}%\`;
          });
          
          document.addEventListener('mousemove', mouseMoveHandler);
          document.addEventListener('mouseup', mouseUpHandler);
          resizer.classList.add('resizing');
        });
        resizer.addEventListener('dblclick', (e) => {
          const table = th.closest('.excel-table');
          const allFixedThs = table.querySelectorAll('th.fixed-col');
          const allDynamicThs = table.querySelectorAll('th:not(.fixed-col)');
          
          let fixedTotalPct = 0;
          allFixedThs.forEach(() => fixedTotalPct += 10);
          
          const remainingPct = 100 - fixedTotalPct;
          const targetPct = remainingPct / (allDynamicThs.length || 1);
          
          allDynamicThs.forEach(dynTh => {
            dynTh.style.width = \`\${targetPct}%\`;
            const dynIdx = Array.from(dynTh.parentNode.children).indexOf(dynTh);
            const dynId = dynTh.closest('.view-section').id + '-col-' + dynIdx;
            this.silentSave('saveUISettings', { key: dynId, value: \`\${targetPct}%\` });
            this.uiSettings[dynId] = \`\${targetPct}%\`;
          });
          
          const tooltip = document.createElement('div');
          tooltip.className = 'resize-tooltip';
          tooltip.style.cssText = 'position: fixed; background: rgba(16,185,129,0.9); color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; pointer-events: none; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
          tooltip.innerText = \`모든 열 너비 일괄 적용 완료!\`;
          tooltip.style.left = (e.clientX + 15) + 'px';
          tooltip.style.top = (e.clientY - 30) + 'px';
          document.body.appendChild(tooltip);
          setTimeout(() => tooltip.remove(), 1500);
        });
      }
      if (th.getAttribute('data-colname') && !th.hasAttribute('data-ctx-bound')) {
        th.setAttribute('data-ctx-bound', 'true');
        th.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.ctxTargetColName = th.getAttribute('data-colname');
          let tType = 'timetable';
          if (th.closest('#view-curriculum')) tType = 'curriculum';
          else if (th.closest('#view-curriculum-science')) tType = 'curriculum_science';
          this.ctxTargetType = tType;
          this.showContextMenu(e.pageX, e.pageY, 'col');
        });
      }
    });
  },

  toggleStatus: function(btn, type, colIdx) {
    const isDone = btn.textContent.includes('완료');
    const newStatus = isDone ? '진행 중' : '완료';
    const statusTxt = !isDone ? '🟢 완료' : '🟡 진행 중';
    const txtColor = !isDone ? '#10b981' : '#f59e0b';
    
    btn.textContent = statusTxt;
    btn.style.color = txtColor;
    
    const rowEl = btn.closest('tr');
    const currentId = rowEl.getAttribute('data-id');
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    
    let dataArray = this.data.preschedules;
    let keys = ['date', 'content', 'status', 'note'];
    
    const rowObj = dataArray[rowIndex];
    if (rowObj) {
      const prevValue = rowObj[colIdx];
      rowObj[colIdx] = newStatus;
      const payload = { id: currentId };
      for(let i=0; i<keys.length; i++) payload[keys[i]] = rowObj[i+1];
      
      this.apiPost('upsertPreSchedule', payload).then(res => {
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
  },

  updatePivotRowDate: async function(el, newDate) {
    if(!newDate) return;
    const tr = el.closest('tr');
    const oldGrp = tr.getAttribute('data-grp');
    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    
    let richText = app.getCleanHTML(el);
    richText = richText.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
    const newGrp = [newDate, oldType, oldStart, oldEnd].join('|');
    app.silentSave('saveUISettings', { key: 'tt_fmt_date_' + newGrp, value: richText });
    app.uiSettings['tt_fmt_date_' + newGrp] = richText;
    
    if (oldDate === newDate) return;
    
    const payloadArray = [];
    const rowsToSave = [];
    const rollbackData = [];
    
    this.data.timetables.forEach(r => {
      if (r[1] === oldDate && r[2] === oldType && r[3] === oldStart && r[4] === oldEnd) {
        rollbackData.push({ row: r, oldDate: r[1] });
        r[1] = newDate;
        rowsToSave.push(r);
        payloadArray.push({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] });
      }
    });

    tr.setAttribute('data-grp', newGrp);
    tr.querySelectorAll('.timetable-cell').forEach(c => c.setAttribute('data-date', newDate));
    const h = tr.querySelector('[placeholder="어떠한 휴일인가요? (비고 입력)"]');
    if(h) h.setAttribute('data-date', newDate);

    if (payloadArray.length > 0) {
      try {
        const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
        if (res && res.success) {
          if (res.returnedIds) rowsToSave.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
          const newIds = rowsToSave.map(r => r[0]).join(',');
          tr.setAttribute('data-ids', newIds);
        } else {
          rollbackData.forEach(rb => { rb.row[1] = rb.oldDate; });
          app.renderView('timetable');
        }
      } catch(e) {
        rollbackData.forEach(rb => { rb.row[1] = rb.oldDate; });
        app.renderView('timetable');
      }
    }
  },

  updatePivotRowType: function(oldGrp, newType) {
    if(!newType) return;
    const [oldDate, oldTType, oldStart, oldEnd] = oldGrp.split('|');
    if (oldTType === newType) return;
    this.data.timetables.forEach(r => {
      if (r[1] === oldDate && r[2] === oldTType && r[3] === oldStart && r[4] === oldEnd) {
        r[2] = newType;
        this.silentSave('upsertTimetable', { id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] }).then(res => {
          if (res && res.success && res.id) r[0] = res.id;
        });
      }
    });
    this.renderView('timetable');
  },

  updatePivotRowTime: async function(el, type, newTimeStr) {
    if (newTimeStr) {
      const digits = newTimeStr.replace(/\\D/g, '');
      if (digits.length > 0) {
        let h, m;
        if (digits.length <= 2) { h = parseInt(digits, 10); m = 0; }
        else if (digits.length === 3) { h = parseInt(digits[0], 10); m = parseInt(digits.substring(1), 10); }
        else { h = parseInt(digits.substring(0, 2), 10); m = parseInt(digits.substring(2, 4), 10); }
        if (h > 23) h = 23;
        if (m > 59) m = 59;
        newTimeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      }
    }
    
    let richText = app.getCleanHTML(el);
    const tr = el.closest('tr');
    if(!tr) return;
    const oldGrp = tr.getAttribute('data-grp');
    if(!oldGrp) return;
    
    app.silentSave('saveUISettings', { key: 'tt_fmt_' + type + '_' + oldGrp, value: richText });
    app.uiSettings['tt_fmt_' + type + '_' + oldGrp] = richText;
    
    if(!newTimeStr) return;
    
    const idsStr = tr.getAttribute('data-ids');
    if(!idsStr) return;
    const ids = idsStr.split(',');

    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    
    let newStart = oldStart;
    let newEnd = oldEnd;
    
    if (type === 'start') {
      newStart = newTimeStr;
    } else if (type === 'end') {
      newEnd = newTimeStr;
    }
    
    if (newStart === oldStart && newEnd === oldEnd) return;
    
    const newGrp = [oldDate, oldType, newStart, newEnd].join('|');
    const rowsToSave = [];
    const rollbackData = [];

    this.data.timetables.forEach(r => {
      if (ids.includes(String(r[0])) || ids.includes(String(r[9]))) {
        rollbackData.push({ row: r, oldStart: r[3], oldEnd: r[4] });
        r[3] = newStart;
        r[4] = newEnd;
        rowsToSave.push(r);
      }
    });

    tr.setAttribute('data-grp', newGrp);
    if(type === 'start') {
      tr.querySelectorAll('.timetable-cell').forEach(c => c.setAttribute('data-start', newStart));
    } else {
      tr.querySelectorAll('.timetable-cell').forEach(c => c.setAttribute('data-end', newEnd));
    }

    const payloadArray = rowsToSave.map(r => ({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] }));

    if (payloadArray.length > 0) {
      try {
        const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
        if (res && res.success) {
          if (res.returnedIds) rowsToSave.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
          const newIds = rowsToSave.map(r => r[0]).join(',');
          tr.setAttribute('data-ids', newIds);
        } else {
          rollbackData.forEach(rb => { rb.row[3] = rb.oldStart; rb.row[4] = rb.oldEnd; });
          app.renderView('timetable');
        }
      } catch(e) {
        rollbackData.forEach(rb => { rb.row[3] = rb.oldStart; rb.row[4] = rb.oldEnd; });
        app.renderView('timetable');
      }
    }
  },

  onTimetableHolidayBlur: function(cell) {
    const newValue = cell.innerText.trim();
    const id = cell.getAttribute('data-id');
    const date = cell.getAttribute('data-date');
    let rowObj = this.data.timetables.find(r => (id && r[0] === id) || (r[1] === date && r[2] === '휴일'));
    if (rowObj) {
      if (rowObj[8] === newValue) return;
      rowObj[8] = newValue;
    } else {
      rowObj = ['', date, '휴일', '00:00', '00:00', '전체', '휴일', '', newValue, ''];
      this.data.timetables.push(rowObj);
    }
    this.apiPost('upsertTimetable', { id: rowObj[0], date, type: '휴일', start: '00:00', end: '00:00', className: '전체', subject: '휴일', instructor: '', note: newValue }).then(res => {
      if (res.success && res.id) {
        rowObj[0] = res.id;
        cell.setAttribute('data-id', res.id);
      }
    });
  },

  openTimetableEditor: function(td) {
    if (this.currentDragSource) return;
    this.hideContextMenu();
    const id = td.getAttribute('data-id');
    const date = td.getAttribute('data-date');
    const start = td.getAttribute('data-start');
    const end = td.getAttribute('data-end');
    const cls = td.getAttribute('data-cls');
    
    let row = this.data.timetables.find(r => (id && r[0] === id) || (r[1] === date && r[3] === start && r[4] === end && r[5] === cls));
    if (!row) {
      row = ['', date, '수업', start, end, cls, '', '', '', ''];
    }

    document.getElementById('tt-modal-subject').value = row[6] || '';
    
    const instSelect = document.getElementById('tt-modal-instructor');
    instSelect.innerHTML = '<option value="">선택/입력</option>';
    this.data.instructors.forEach(inst => {
      const name = inst[1];
      if (name) instSelect.innerHTML += \`<option value="\${name}">\${name}</option>\`;
    });
    instSelect.value = row[7] || '';
    
    document.getElementById('tt-modal-note').value = row[8] || '';

    this.currentTimetableEditData = { td, row };
    document.getElementById('modal-container').classList.remove('hidden');
    document.getElementById('timetable-editor-modal').classList.remove('hidden');
  },

  saveTimetableEditor: function() {
    const { td, row } = this.currentTimetableEditData;
    const oldSub = row[6]; const oldInst = row[7]; const oldNote = row[8];
    const newSub = document.getElementById('tt-modal-subject').value.trim();
    const newInst = document.getElementById('tt-modal-instructor').value.trim();
    const newNote = document.getElementById('tt-modal-note').value.trim();

    if (oldSub === newSub && oldInst === newInst && oldNote === newNote) {
      this.closeModal(); return;
    }

    row[6] = newSub; row[7] = newInst; row[8] = newNote;
    let displayStr = newSub || newInst ? \`\${newSub}\${newInst?'('+newInst+')':''}\` : '';
    td.innerText = displayStr;

    if (!row[0]) this.data.timetables.push(row);

    this.apiPost('upsertTimetable', { id: row[0], date: row[1], type: row[2], start: row[3], end: row[4], className: row[5], subject: newSub, instructor: newInst, note: newNote }).then(res => {
      if(res.success && res.id) {
        row[0] = res.id; td.setAttribute('data-id', res.id);
      }
    });
    this.closeModal();
  },

  initFlatpickr: function() {
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

`;
  
  const before = code.substring(0, sIdx);
  const after = code.substring(eIdx); // bindGlobalEvents onwards
  code = before + replacement + after;

  // I will also fix + 일정 추가 -> + 내용 추가 (Line ~338)
  code = code.replace('+ 일정 추가', '+ 내용 추가');
  // I will also fix 상태 width: '10%' -> '5%'
  code = code.replace("{label:'상태', idx:3, fixed:true, width:'10%'}", "{label:'상태', idx:3, fixed:true, width:'5%'}");
  
  fs.writeFileSync(path, code, 'utf8');
  console.log("FINAL FULL RESTORE AND UPDATE COMPLETE!");
} else {
  console.log("INDEX NOT FOUND", sIdx, eIdx);
}
