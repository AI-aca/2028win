// 원장님이 설정하신 GAS 웹앱 배포 주소 (여기로 데이터를 쏘고 받습니다)
const API_URL = "https://script.google.com/macros/s/AKfycby8JE1MRUAIyIyHMi2H7xvW0xKTX8GgFL51SzKBdZvjjJwPCPIq3JxQUMR87cKrCXOM6g/exec";

const app = {
  localMode: false,
  currentView: 'view-dashboard',
  data: { preschedules: [], curriculums: [], timetables: [], students: [], instructors: [] },
  dynamicCols: { curriculum: [], timetable: [] },
  uiSettings: {},
  ctxTargetRow: null, ctxTargetType: null, draggedRow: null, draggedType: null,
  sortState: {},

  init: function() {
    this.bindEvents();
    this.fetchInitialData();
    
    document.addEventListener('mousedown', (e) => {
      const tb = document.getElementById('rich-toolbar');
      if (tb && !tb.contains(e.target) && !e.target.closest('td[contenteditable="true"]')) this.hideToolbar();
      const ctx = document.getElementById('context-menu');
      if (ctx && !ctx.contains(e.target)) this.hideContextMenu();
    });

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) { this.hideToolbar(); return; }
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const td = container.nodeType === 3 ? container.parentElement.closest('td[contenteditable="true"]') : container.closest('td[contenteditable="true"]');
      if (td) {
        const rect = range.getBoundingClientRect();
        this.showToolbar(rect.left + rect.width / 2, rect.top);
      } else { this.hideToolbar(); }
    });
  },

  showLoading: function() { document.getElementById('loadingSpinner').classList.remove('hidden'); },
  hideLoading: function() { document.getElementById('loadingSpinner').classList.add('hidden'); },

  apiPost: async function(action, payloadData) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payloadData })
      });
      return await response.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  apiGet: async function(action) {
    try {
      const response = await fetch(`${API_URL}?action=${action}`);
      return await response.json();
    } catch (e) { return { success: false, error: e.message }; }
  },

  fetchInitialData: async function() {
    this.showLoading();
    const res = await this.apiGet('getInitialData');
    if (res.error || res.success === false) { alert("데이터 로딩 에러: " + (res.error || res.message)); }
    else {
      this.data.preschedules = res['사전준비일정'] || [];
      this.data.curriculums = res['수업진도계획'] || [];
      this.data.timetables = res['시간표'] || [];
      this.data.students = res['학생관리'] || [];
      this.data.instructors = res['강사관리'] || [];
      this.uiSettings = res.uiSettings || {};
      this.extractDynamicCols();
      this.renderAllViews();
    }
    this.hideLoading();
  },

  extractDynamicCols: function() {
    this.dynamicCols.curriculum = Array.from(new Set(this.data.curriculums.map(r => r[2]).filter(x => x)));
    
    this.dynamicCols.timetable = Array.from(new Set(this.data.timetables.map(r => r[5]).filter(x => x)));
  },

  bindEvents: function() {
    document.querySelectorAll('.single-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.single-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetViewId = e.currentTarget.getAttribute('data-target');
        document.getElementById('pageTitle').innerText = e.currentTarget.querySelector('.text').innerText;
        this.switchView(targetViewId);
        this.renderView(targetViewId.replace('view-', ''));
      });
    });
  },

  goHome: function() {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('pageTitle').innerText = '대시보드';
    this.switchView('view-dashboard');
  },

  switchView: function(viewId) {
    const oldView = document.getElementById(this.currentView);
    if (oldView) { oldView.classList.remove('active'); oldView.classList.add('hidden'); }
    const newView = document.getElementById(viewId);
    if (newView) { newView.classList.remove('hidden'); newView.classList.add('active'); }
    this.currentView = viewId;
    
    const headerActions = document.getElementById('top-header-actions');
    if (headerActions) {
      if (viewId === 'view-preschedule') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('preschedule')">+ 일정 추가</button>`;
      } else if (viewId === 'view-curriculum') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('curriculum')">+ 주차 추가</button> <button class="btn btn-primary" style="background:#06b6d4;" onclick="app.addColumn('curriculum')">+ 과목 추가</button>`;
      } else if (viewId === 'view-timetable') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('timetable')">+ 시간 추가</button> <button class="btn btn-primary" style="background:#f43f5e;" onclick="app.addRow('holiday')">+ 휴일 추가</button> <button class="btn btn-primary" style="background:#06b6d4;" onclick="app.addColumn('timetable')">+ 학급 추가</button>`;
      } else if (viewId === 'view-student') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('student')">+ 학생 추가</button>`;
      } else if (viewId === 'view-instructor') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('instructor')">+ 강사 추가</button>`;
      } else {
        headerActions.innerHTML = '';
      }
    }
  },

  renderAllViews: function() {
    this.renderView('preschedule'); this.renderView('curriculum');
    this.renderView('timetable'); this.renderView('student'); this.renderView('instructor');
  },

  renderView: function(viewName) {
    if (viewName === 'preschedule') this.renderFlatTable('preschedule', this.data.preschedules, ['일자', '내용', '상태', '비고']);
    else if (viewName === 'student') this.renderFlatTable('student', this.data.students, [{label:'이름', idx:1}, {label:'센터', idx:2}, {label:'학교', idx:3}, {label:'학년', idx:4}, {label:'학부모 연락처', idx:5}, {label:'학생 연락처', idx:6}, {label:'비고', idx:7}]);
    else if (viewName === 'instructor') this.renderFlatTable('instructor', this.data.instructors, ['강사명', '영역', '과목', '연락처', '지메일', '비고']);
    else if (viewName === 'curriculum') this.renderCurriculumPivot();
    else if (viewName === 'timetable') this.renderTimetablePivot();
    
    if (window.flatpickr) {
      flatpickr('.date-picker-input', { locale: "ko", dateFormat: "Y-m-d (D)" });
      flatpickr('.time-picker-input', { locale: "ko", enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, minuteIncrement: 10 });
    }
  },

  getCleanHTML: function(cell) {
    let val = cell.innerHTML;
    if (val === '<br>' || val === '<br/>') val = '';
    return val.trim();
  },

  onKeyDown: function(e, cell) {
    // 화살표로 셀 간 이동하는 기능 완전 삭제 (글자 사이 커서 이동 기본 기능 복구)
  },

  bindRowEvents: function(tr, type) {
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault(); this.ctxTargetRow = tr; this.ctxTargetType = type;
      this.showContextMenu(e.pageX, e.pageY);
    });
    this.makeDraggable(tr, type);
  },

  makeDraggable: function(tr, type) {
    const handle = tr.querySelector('.drag-handle');
    if(!handle) return;
    handle.addEventListener('mousedown', () => tr.setAttribute('draggable', 'true'));
    handle.addEventListener('mouseup', () => tr.removeAttribute('draggable'));
    tr.addEventListener('dragstart', (e) => {
      this.draggedRow = tr; this.draggedType = type;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => tr.classList.add('dragging-row'), 0);
    });
    tr.addEventListener('dragend', () => {
      tr.classList.remove('dragging-row'); tr.removeAttribute('draggable'); this.draggedRow = null;
    });
    tr.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = tr.getBoundingClientRect();
      const offset = rect.y + (rect.height / 2);
      if (e.clientY < offset) { tr.style.borderTop = "2px solid #10b981"; tr.style.borderBottom = ""; }
      else { tr.style.borderBottom = "2px solid #10b981"; tr.style.borderTop = ""; }
    });
    tr.addEventListener('dragleave', () => { tr.style.borderTop = ""; tr.style.borderBottom = ""; });
    tr.addEventListener('drop', (e) => {
      e.preventDefault(); tr.style.borderTop = ""; tr.style.borderBottom = "";
      if (this.draggedRow && this.draggedRow !== tr && this.draggedType === type) {
        const tbody = tr.parentNode;
        const rect = tr.getBoundingClientRect();
        if (e.clientY < rect.y + (rect.height / 2)) tbody.insertBefore(this.draggedRow, tr);
        else tbody.insertBefore(this.draggedRow, tr.nextSibling);
        this.saveOrder(type, tbody);
      }
    });
  },

  saveOrder: function(type, tbody) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    let orderedIds = [];
    if (type === 'timetable') {
      rows.forEach(tr => {
        tr.querySelectorAll('td[data-id]').forEach(td => {
          const id = td.getAttribute('data-id');
          if (id) orderedIds.push(id);
        });
      });
    } else {
      orderedIds = rows.map(r => r.getAttribute('data-id')).filter(id => id);
    }
    let sheetName = '';
    if (type === 'preschedule') sheetName = '사전준비일정';
    if (type === 'curriculum') sheetName = '수업진도계획';
    if (type === 'timetable') sheetName = '시간표';
    if (type === 'student') sheetName = '학생관리';
    if (type === 'instructor') sheetName = '강사관리';
    if (sheetName && orderedIds.length > 0) {
      this.silentSave('reorderRows', { sheetName, orderedIds }).then(() => {
        setTimeout(() => this.fetchInitialData(), 200);
      });
    }
  },

  renderSortableHeader: function(label, type, colIdx) {
    return `${label} <span class="sort-icon" onclick="app.sortTable('${type}', ${colIdx}, this)">▼</span>`;
  },

  sortTable: function(type, colIdx, iconEl) {
    const isAsc = this.sortState[type + colIdx] === 'asc';
    this.sortState[type + colIdx] = isAsc ? 'desc' : 'asc';
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

  initResizers: function() {
    document.querySelectorAll('.excel-table th').forEach((th, i) => {
      if (!th.querySelector('.resizer')) {
        const resizer = document.createElement('div');
        resizer.className = 'resizer'; th.appendChild(resizer);
        let x = 0, w = 0;
        let startTableWidth = 0;
        let tableEl = null;
        const id = th.closest('.view-section').id + '-col-' + i;
        
        const mouseMoveHandler = (e) => { 
          const newWidthPx = Math.round(Math.max(30, w + e.clientX - x));
          const tableWidth = tableEl.getBoundingClientRect().width;
          const newWidthPct = (newWidthPx / tableWidth) * 100;
          th.style.width = `${newWidthPct}%`; 
          
          if (!this.resizeTooltip) {
            this.resizeTooltip = document.createElement('div');
            this.resizeTooltip.className = 'resize-tooltip';
            this.resizeTooltip.style.cssText = 'position: fixed; background: rgba(0,0,0,0.8); color: #06b6d4; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; pointer-events: none; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 1px solid rgba(6,182,212,0.3); transition: none;';
            document.body.appendChild(this.resizeTooltip);
          }
          this.resizeTooltip.style.left = (e.clientX + 15) + 'px';
          this.resizeTooltip.style.top = (e.clientY - 30) + 'px';
          this.resizeTooltip.innerText = Math.round(newWidthPct) + '%';
        };
        const mouseUpHandler = () => {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
          resizer.classList.remove('resizing');
          if (this.resizeTooltip) {
            this.resizeTooltip.remove();
            this.resizeTooltip = null;
          }
          this.silentSave('saveUISettings', { key: id, value: th.style.width });
          this.uiSettings[id] = th.style.width;
        };
        resizer.addEventListener('mousedown', (e) => {
          x = e.clientX; 
          w = th.getBoundingClientRect().width;
          tableEl = th.closest('.excel-table');
          
          document.addEventListener('mousemove', mouseMoveHandler);
          document.addEventListener('mouseup', mouseUpHandler);
          resizer.classList.add('resizing');
        });
        resizer.addEventListener('dblclick', (e) => {
          const colname = th.getAttribute('data-colname');
          if (colname) {
            const currentWidth = th.style.width || th.getBoundingClientRect().width + 'px';
            const table = th.closest('.excel-table');
            const allDynamicThs = table.querySelectorAll('th[data-colname]');
            allDynamicThs.forEach(dynTh => {
              dynTh.style.width = currentWidth;
              const idx = Array.from(dynTh.parentNode.children).indexOf(dynTh);
              const dynId = dynTh.closest('.view-section').id + '-col-' + idx;
              this.silentSave('saveUISettings', { key: dynId, value: currentWidth });
              this.uiSettings[dynId] = currentWidth;
            });
            const viewId = th.closest('.view-section').id;
            const targetName = viewId === 'view-curriculum' ? '과목' : '반';
            
            const tooltip = document.createElement('div');
            tooltip.className = 'resize-tooltip';
            tooltip.style.cssText = 'position: fixed; background: rgba(16,185,129,0.9); color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; pointer-events: none; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
            tooltip.innerText = `모든 ${targetName} 너비 일괄 적용 완료!`;
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY - 30) + 'px';
            document.body.appendChild(tooltip);
            setTimeout(() => tooltip.remove(), 1500);
          }
        });
        const savedW = this.uiSettings[id];
        if (savedW && savedW.includes('%')) th.style.width = savedW;
        else if (savedW) th.style.width = ''; // ignore legacy px widths to prevent scrollbar
      }
      // Add right-click for column deletion
      if (th.getAttribute('data-colname') && !th.hasAttribute('data-ctx-bound')) {
        th.setAttribute('data-ctx-bound', 'true');
        th.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.ctxTargetColName = th.getAttribute('data-colname');
          this.ctxTargetType = th.closest('#view-curriculum') ? 'curriculum' : 'timetable';
          this.showContextMenu(e.pageX, e.pageY, 'col');
        });
      }
    });
  },

  renderFlatTable: function(type, dataArray, cols) {
    const tbody = document.getElementById(`tbody-${type}`);
    if (!tbody) return;
    const thead = tbody.previousElementSibling;
    if(thead && thead.querySelector('tr')) {
      let ths = '';
      cols.forEach((c) => {
        const label = typeof c === 'object' ? c.label : c;
        ths += `<th>${label}</th>`;
      });
      thead.querySelector('tr').innerHTML = ths;
    }

    let html = '';
    dataArray.forEach(row => {
      const id = row[0]; html += `<tr data-id="${id}">`;
      for(let i=0; i<cols.length; i++) {
        const c = cols[i];
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? c.idx : i + 1;
        const val = row[colIdx] || '';
        const isFirstCol = (i === 0 && (type === 'student' || type === 'instructor'));
        const cellClassStr = isFirstCol ? 'class="label-col"' : '';
        
        if (label === '일자') {
          html += `<td data-col-idx="${colIdx}" class="label-col" style="padding:0; text-align:center;"><input type="text" class="date-picker-input" value="${val}" onchange="app.onFlatCellBlur('${type}', this.parentElement)" placeholder="날짜 선택" style="width:100%; height:100%; min-height:40px; background:transparent; border:none; color:inherit; text-align:center; outline:none; font-family:inherit; font-size:inherit; cursor:pointer; padding:0; margin:0;"></td>`;
        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusTxt = isDone ? '완료' : '진행 중';
          const btnClass = isDone ? 'status-done' : 'status-progress';
          html += `<td data-col-idx="${colIdx}" style="text-align:center;"><button class="status-btn ${btnClass}" onclick="app.toggleStatus(this, '${type}', ${colIdx})">${statusTxt}</button></td>`;
        } else {
          html += `<td ${cellClassStr} contenteditable="true" data-col-idx="${colIdx}" onblur="app.onFlatCellBlur('${type}', this)" onkeydown="app.onKeyDown(event, this)">${val}</td>`;
        }
      }
      html += `</tr>`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
  },
  toggleStatus: function(btn, type, colIdx) {
    const isDone = btn.classList.contains('status-done');
    const newStatus = isDone ? '진행 중' : '완료';
    
    btn.textContent = newStatus;
    btn.className = 'status-btn ' + (isDone ? 'status-progress' : 'status-done');
    
    const rowEl = btn.closest('tr');
    const currentId = rowEl.getAttribute('data-id');
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    
    let dataArray = this.data.preschedules;
    let keys = ['date', 'content', 'status', 'note'];
    
    const rowObj = dataArray[rowIndex];
    if (rowObj) {
      rowObj[colIdx] = newStatus;
      const payload = { id: currentId };
      for(let i=0; i<keys.length; i++) payload[keys[i]] = rowObj[i+1];
      
      this.apiPost('upsertPreSchedule', payload).then(res => {
        if(res.success && res.id) {
          rowObj[0] = res.id; rowEl.setAttribute('data-id', res.id);
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
      newValue = valHtml.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
      if(newValue === '<br>') newValue = '';
    }

    let dataArray, upsertAction, keys;
    if (type === 'preschedule') { dataArray = this.data.preschedules; upsertAction = 'upsertPreSchedule'; keys = ['date', 'content', 'status', 'note']; }
    else if (type === 'student') { dataArray = this.data.students; upsertAction = 'upsertStudent'; keys = ['name', 'center', 'school', 'grade', 'parentPhone', 'studentPhone', 'note']; }
    else if (type === 'instructor') { dataArray = this.data.instructors; upsertAction = 'upsertInstructor'; keys = ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']; }

    const colIdx = parseInt(cell.getAttribute('data-col-idx'));
    const rowEl = cell.closest('tr');
    let currentId = rowEl.getAttribute('data-id');
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    
    const rowObj = dataArray[rowIndex];
    if (!rowObj || rowObj[colIdx] === newValue) return;
    rowObj[colIdx] = newValue;

    const payload = { id: currentId };
    for(let i=0; i<keys.length; i++) payload[keys[i]] = rowObj[i+1];
    
    this.apiPost(upsertAction, payload).then(res => {
      if(res.success && res.id) {
        rowObj[0] = res.id; rowEl.setAttribute('data-id', res.id);
      }
    });
  },

  addRow: function(type) {
    if (['preschedule', 'student', 'instructor'].includes(type)) {
      const arr = type === 'preschedule' ? this.data.preschedules : (type === 'student' ? this.data.students : this.data.instructors);
      const newRow = [''];
      const tbody = document.getElementById(`tbody-${type}`);
      const colCount = tbody.parentElement.querySelectorAll('th').length;
      for(let i=0; i<colCount; i++) newRow.push('');
      arr.push(newRow); this.renderView(type);

      let upsertAction = type === 'preschedule' ? 'upsertPreSchedule' : (type === 'student' ? 'upsertStudent' : 'upsertInstructor');
      let keys = type === 'preschedule' ? ['date', 'content', 'status', 'note'] : (type === 'student' ? ['center', 'name', 'school', 'grade', 'parentPhone', 'studentPhone', 'note'] : ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']);
      let payload = { id: '' };
      for(let i=0; i<keys.length; i++) payload[keys[i]] = '';
      this.apiPost(upsertAction, payload).then(res => {
        if(res.success && res.id) { newRow[0] = res.id; this.renderView(type); }
      });
    } else if (type === 'curriculum') {
      const weeks = new Set(this.data.curriculums.map(r => r[1]).filter(Boolean));
      let nextWeek = `${weeks.size + 1}주차`;
      this.dynamicCols.curriculum.forEach(sub => {
        const rowObj = ['', nextWeek, sub, '', ''];
        this.data.curriculums.push(rowObj);
        this.apiPost('upsertCurriculum', { id: '', week: nextWeek, subject: sub, content: '' }).then(res => {
          if (res.success && res.id) rowObj[0] = res.id;
        });
      });
      this.renderView(type);
    } else if (type === 'timetable') {
      let nextStart = '18:00', nextEnd = '20:00';
      const today = new Date().toISOString().split('T')[0];
      this.dynamicCols.timetable.forEach(cls => {
        const rowObj = ['', today, '수업', nextStart, nextEnd, cls, '', '', '', ''];
        this.data.timetables.push(rowObj);
        this.apiPost('upsertTimetable', { id: '', date: today, type: '수업', start: nextStart, end: nextEnd, className: cls, subject: '', instructor: '', note: '' }).then(res => {
          if (res.success && res.id) rowObj[0] = res.id;
        });
      });
      this.renderView(type);
    } else if (type === 'holiday') {
      const today = new Date().toISOString().split('T')[0];
      const rowObj = ['', today, '휴일', '00:00', '00:00', '전체', '휴일', '', '', ''];
      this.data.timetables.push(rowObj);
      this.apiPost('upsertTimetable', { id: '', date: today, type: '휴일', start: '00:00', end: '00:00', className: '전체', subject: '휴일', instructor: '', note: '' }).then(res => {
        if (res.success && res.id) rowObj[0] = res.id;
      });
      this.renderView('timetable');
    }
  },

  renderCurriculumPivot: function() {
    const table = document.querySelector('#view-curriculum .excel-table');
    let headHtml = `<thead><tr><th style="width:150px;">주차</th>`;
    this.dynamicCols.curriculum.forEach(sub => {
      headHtml += `<th data-colname="${sub}">${sub}</th>`;
    });
    headHtml += `</tr></thead><tbody id="tbody-curriculum">`;

    const weeks = Array.from(new Set(this.data.curriculums.map(r => r[1]).filter(Boolean)));
    if (weeks.length === 0) weeks.push('1주차');

    weeks.forEach(week => {
      headHtml += `<tr>
      <td style="background: rgba(255,255,255,0.05); font-weight:bold; text-align:center;" contenteditable="true" onblur="app.updatePivotRowLabel('curriculum', '${week}', this.innerText.trim())">${week}</td>`;
      this.dynamicCols.curriculum.forEach(sub => {
        const row = this.data.curriculums.find(r => r[1] === week && r[2] === sub);
        const content = row ? row[3] : '';
        headHtml += `<td contenteditable="true" data-id="${row?row[0]:''}" data-week="${week}" data-sub="${sub}" onblur="app.onCurriculumBlur(this)" onkeydown="app.onKeyDown(event, this)">${content}</td>`;
      });
      headHtml += `</tr>`;
    });
    headHtml += `</tbody>`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, 'curriculum'));
    this.initResizers();
  },

  onCurriculumBlur: function(cell) {
    let newValue = this.getCleanHTML(cell);
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
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
    let headHtml = `<thead><tr><th class="label-col-header" style="width:130px;">일자</th><th class="label-col-header" style="width:120px;">시작시간</th><th class="label-col-header" style="width:150px;">종료시간</th>`;
    this.dynamicCols.timetable.forEach(cls => {
      headHtml += `<th data-colname="${cls}">${cls}</th>`;
    });
    headHtml += `</tr></thead><tbody id="tbody-timetable">`;

    const rowGroups = Array.from(new Set(this.data.timetables.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));
    if (rowGroups.length === 0) rowGroups.push('|수업|18:00|20:00');

    rowGroups.forEach(grp => {
      const [date, type, start, end] = grp.split('|');
      const isHoliday = (type === '휴일');
      
      headHtml += `<tr><td class="label-col" style="padding:0; text-align:center;"><input type="text" class="date-picker-input" value="${date}" onchange="app.updatePivotRowDate('${grp}', this.value)" placeholder="날짜 선택" style="width:100%; height:100%; min-height:40px; background:transparent; border:none; color:inherit; text-align:center; outline:none; font-family:inherit; font-size:inherit; cursor:pointer; padding:0; margin:0;"></td>`;

      if (isHoliday) {
        const holidayRow = this.data.timetables.find(r => r[1] === date && r[2] === '휴일');
        const holidayNote = holidayRow ? holidayRow[8] : '';
        const holidayId = holidayRow ? holidayRow[0] : '';
        headHtml += `
          <td colspan="2" class="label-col" style="font-weight:bold; text-align:center; color:#f43f5e; font-size:16px;">🎉 휴일</td>
          <td colspan="${this.dynamicCols.timetable.length}" contenteditable="true" data-id="${holidayId}" data-date="${date}" onblur="app.onTimetableHolidayBlur(this)" onkeydown="app.onKeyDown(event, this)" placeholder="어떠한 휴일인가요? (비고 입력)" style="text-align:center; color:#94a3b8;">${holidayNote}</td>`;
      } else {
        headHtml += `
          <td class="label-col" style="padding:0; text-align:center;"><input type="text" class="time-picker-input" value="${start}" onchange="app.updatePivotRowTime('${grp}', 'start', this.value)" placeholder="00:00" style="width:100%; height:100%; min-height:40px; background:transparent; color:white; border:none; outline:none; text-align:center; font-family:inherit; font-size:inherit; cursor:pointer;" required></td>
          <td class="label-col" style="padding:0; text-align:center;"><input type="text" class="time-picker-input" value="${end}" onchange="app.updatePivotRowTime('${grp}', 'end', this.value)" placeholder="00:00" style="width:100%; height:100%; min-height:40px; background:transparent; color:white; border:none; outline:none; text-align:center; font-family:inherit; font-size:inherit; cursor:pointer;" required></td>`;
        this.dynamicCols.timetable.forEach(cls => {
          const row = this.data.timetables.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end && r[5] === cls);
          let displayStr = row && (row[6] || row[7]) ? `${row[6]||''}${row[7]?'('+row[7]+')':''}` : '';
          displayStr = displayStr.trim();
          headHtml += `<td class="timetable-cell" data-id="${row?row[0]:''}" data-start="${start}" data-end="${end}" data-cls="${cls}" data-date="${date}" onclick="app.openTimetableEditor(this)" style="cursor:pointer;">${displayStr}</td>`;
        });
      }
      headHtml += `</tr>`;
    });
    headHtml += `</tbody>`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, 'timetable'));
    this.initResizers();
  },

  updatePivotRowDate: function(oldGrp, newDate) {
    if(!newDate) return;
    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    if (oldDate === newDate) return;
    this.data.timetables.forEach(r => {
      if (r[1] === oldDate && r[2] === oldType && r[3] === oldStart && r[4] === oldEnd) {
        r[1] = newDate;
        this.silentSave('upsertTimetable', { id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] });
      }
    });
    this.renderView('timetable');
  },

  updatePivotRowTime: function(oldGrp, type, newValue) {
    if(!newValue) return;
    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    const newStart = type === 'start' ? newValue : oldStart;
    const newEnd = type === 'end' ? newValue : oldEnd;
    if (oldStart === newStart && oldEnd === newEnd) return;
    this.data.timetables.forEach(r => {
      if (r[1] === oldDate && r[2] === oldType && r[3] === oldStart && r[4] === oldEnd) {
        r[3] = newStart; r[4] = newEnd;
        this.silentSave('upsertTimetable', { id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] });
      }
    });
    this.renderView('timetable');
  },

  onTimetableHolidayBlur: function(cell) {
    let newValue = this.getCleanHTML(cell);
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    if(newValue === '<br>') newValue = '';
    const id = cell.getAttribute('data-id'), date = cell.getAttribute('data-date');
    let rowObj = this.data.timetables.find(r => (id && r[0] === id) || (r[1] === date && r[2] === '휴일'));
    if (rowObj) {
      if (rowObj[8] === newValue) return;
      rowObj[8] = newValue;
    } else {
      rowObj = ['', date, '휴일', '00:00', '00:00', '전체', '휴일', '', newValue, ''];
      this.data.timetables.push(rowObj);
    }
    
    this.apiPost('upsertTimetable', { id: rowObj[0], date: rowObj[1], type: rowObj[2], start: rowObj[3], end: rowObj[4], className: rowObj[5], subject: rowObj[6], instructor: rowObj[7], note: rowObj[8] }).then(res => {
      if(res.success && res.id) { rowObj[0] = res.id; cell.setAttribute('data-id', res.id); }
    });
  },

  openTimetableEditor: function(cell) {
    const id = cell.getAttribute('data-id');
    const date = cell.getAttribute('data-date');
    const start = cell.getAttribute('data-start');
    const end = cell.getAttribute('data-end');
    const cls = cell.getAttribute('data-cls');
    
    let subject = '', instructor = '';
    const row = this.data.timetables.find(r => r[1] === date && r[2] === '수업' && r[3] === start && r[4] === end && r[5] === cls);
    if (row) {
      subject = row[6] || '';
      instructor = row[7] || '';
    }

    let modal = document.getElementById('timetable-editor-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'timetable-editor-modal';
      modal.className = 'glass-panel';
      modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:10000; padding:20px; border-radius:12px; width:320px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display:flex; flex-direction:column; gap:15px; border: 1px solid var(--border-glass);';
      document.body.appendChild(modal);
    }

    const instructors = Array.from(new Set(this.data.instructors.map(r => {
      let val = r[1] ? String(r[1]) : '';
      if(val.includes('" style=')) val = val.substring(0, val.indexOf('"')).trim();
      const div = document.createElement('div'); div.innerHTML = val;
      return div.innerText.trim();
    }).filter(Boolean)));
    const subjects = Array.from(new Set([...this.data.curriculums.map(r => r[2]), ...this.data.instructors.map(r => r[2])].filter(Boolean)));

    const optStyle = 'background:#1e293b; color:#f8fafc;';
    let instructorOpts = `<option value="" style="${optStyle}">-- 강사 선택 --</option>` + instructors.map(i => `<option value="${i}" style="${optStyle}" ${instructor===i?'selected':''}>${i}</option>`).join('');
    let subjectOpts = `<option value="" style="${optStyle}">-- 과목 선택 --</option>` + subjects.map(s => `<option value="${s}" style="${optStyle}" ${subject===s?'selected':''}>${s}</option>`).join('');

    modal.innerHTML = `
      <h3 style="margin:0; font-size:16px; color:var(--primary); text-align:center;">${cls} 수업 편집</h3>
      <div>
        <label style="font-size:12px; color:var(--text-muted); margin-bottom:5px; display:block;">과목</label>
        <select id="tt-edit-subject" style="width:100%; padding:10px; border-radius:6px; background:var(--bg-card); color:var(--text); border:1px solid var(--border-glass); outline:none;">
          ${subjectOpts}
        </select>
      </div>
      <div>
        <label style="font-size:12px; color:var(--text-muted); margin-bottom:5px; display:block;">담당자</label>
        <select id="tt-edit-instructor" style="width:100%; padding:10px; border-radius:6px; background:var(--bg-card); color:var(--text); border:1px solid var(--border-glass); outline:none;">
          ${instructorOpts}
        </select>
      </div>
      <div style="display:flex; gap:10px; margin-top:15px;">
        <button class="btn" style="flex:1; background:rgba(255,255,255,0.1);" onclick="document.getElementById('timetable-editor-overlay').remove(); document.getElementById('timetable-editor-modal').remove();">취소</button>
        <button class="btn btn-primary" style="flex:1;" onclick="app.saveTimetableEditor('${id}', '${date}', '${start}', '${end}', '${cls}')">저장</button>
      </div>
    `;

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
    newLabel = newLabel.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    if(!newLabel || oldLabel === newLabel) return;
    if(type === 'curriculum') {
      this.data.curriculums.forEach(r => {
        if(r[1] === oldLabel) { r[1] = newLabel; this.silentSave('upsertCurriculum', {id: r[0], week: newLabel, subject: r[2], content: r[3]}); }
      });
    }
    this.renderView(type);
  },

  addColumn: function(type) {
    const title = type === 'curriculum' ? '새 과목(열) 추가' : '새 반이름(열) 추가';
    document.getElementById('generic-modal-title').innerText = title;
    document.getElementById('generic-modal-body').innerHTML = `<div class="form-group"><label>${type === 'curriculum' ? '과목명' : '반이름'}</label><input type="text" id="new-col-input" class="form-control"></div>`;
    document.getElementById('modal-container').classList.remove('hidden'); document.getElementById('generic-modal').classList.remove('hidden');
    this.currentModalAction = () => {
      const val = document.getElementById('new-col-input').value.trim();
      if(val) {
        if(type === 'curriculum' && !this.dynamicCols.curriculum.includes(val)) {
            this.dynamicCols.curriculum.push(val);
            const week = this.data.curriculums.length > 0 ? this.data.curriculums[0][1] : '1주차';
            const rowObj = ['', week, val, '', ''];
            this.data.curriculums.push(rowObj);
            this.apiPost('upsertCurriculum', { id: '', week, subject: val, content: '', note: '' }).then(res => { if(res.success) rowObj[0] = res.id; });
        }
        if(type === 'timetable' && !this.dynamicCols.timetable.includes(val)) {
            this.dynamicCols.timetable.push(val);
            this.data.timetables.forEach(r => {
            const rowObj = ['', r[1], r[2], r[3], r[4], val, '', '', '', ''];
            this.data.timetables.push(rowObj);
            this.apiPost('upsertTimetable', { id: '', date: r[1], type: r[2], start: r[3], end: r[4], className: val, subject: '', instructor: '', note: '' }).then(res => { if(res.success) rowObj[0] = res.id; });
          });
        }
        this.renderView(type);
      }
      this.closeModal();
    };
  },

  removeColumn: function(type, colName) {
    if(!confirm(`'${colName}' 열을 삭제하시겠습니까? (저장된 데이터도 삭제됩니다)`)) return;
    if(type === 'curriculum') {
      this.dynamicCols.curriculum = this.dynamicCols.curriculum.filter(c => c !== colName);
      this.data.curriculums = this.data.curriculums.filter(r => {
        if(r[2] === colName) { if(r[0]) this.silentSave('deleteData', { sheetName: '수업진도계획', id: r[0] }); return false; } return true;
      });
    } else if(type === 'timetable') {
      this.dynamicCols.timetable = this.dynamicCols.timetable.filter(c => c !== colName);
      this.data.timetables = this.data.timetables.filter(r => {
        if(r[5] === colName) { if(r[0]) this.silentSave('deleteData', { sheetName: '시간표', id: r[0] }); return false; } return true;
      });
    }
    this.renderView(type);
  },

  closeModal: function() { document.getElementById('modal-container').classList.add('hidden'); document.getElementById('generic-modal').classList.add('hidden'); },
  saveModalData: function() { if(typeof this.currentModalAction === 'function') this.currentModalAction(); },

  silentSave: function(action, payload) {
    return this.apiPost(action, payload).then(res => {
      if(!res.success) {
        console.error('Silent save failed:', res.message);
        this.showToast('저장 실패: ' + res.message, true);
      } else {
        this.showToast('저장되었습니다.');
      }
      return res;
    });
  },
  
  deleteItem: async function(type, id, rowEl) {
    if(!id || id === 'null') {
      const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
      if (type === 'preschedule') this.data.preschedules.splice(rowIndex, 1);
      if (type === 'student') this.data.students.splice(rowIndex, 1);
      if (type === 'instructor') this.data.instructors.splice(rowIndex, 1);
      this.renderView(type); return;
    }
    if(!confirm("정말 삭제하시겠습니까?")) return;
    let sheetName = type === 'preschedule' ? '사전준비일정' : (type === 'curriculum' ? '수업진도계획' : (type === 'timetable' ? '시간표' : (type === 'student' ? '학생관리' : '강사관리')));
    this.showLoading();
    const res = await this.apiPost('deleteData', { sheetName, id });
    if(res.success) this.fetchInitialData(); else { alert("삭제 실패: " + res.message); this.hideLoading(); }
  },

  // Rich Text Toolbar
  showToolbar: function(x, y) {
    const tb = document.getElementById('rich-toolbar');
    if(!tb) return;
    tb.style.left = `${x}px`; tb.style.top = `${y - 40}px`;
    tb.classList.remove('hidden');
  },
  hideToolbar: function() { const tb = document.getElementById('rich-toolbar'); if(tb) tb.classList.add('hidden'); },
  execCmd: function(cmd, e, val = null) {
    e.preventDefault(); // Prevent losing focus
    document.execCommand(cmd, false, val);
  },

  // Context Menu
  showContextMenu: function(x, y, mode = 'row') {
    const ctx = document.getElementById('context-menu');
    if(!ctx) return;
    
    document.getElementById('ctx-menu-row').classList.add('hidden');
    document.getElementById('ctx-menu-col').classList.add('hidden');
    
    if (mode === 'col') {
      document.getElementById('ctx-menu-col').classList.remove('hidden');
    } else {
      document.getElementById('ctx-menu-row').classList.remove('hidden');
    }

    ctx.style.left = `${x}px`; ctx.style.top = `${y}px`;
    ctx.classList.remove('hidden');
  },
  hideContextMenu: function() { const ctx = document.getElementById('context-menu'); if(ctx) ctx.classList.add('hidden'); },
  ctxInsertRowAbove: function() {
    this.hideContextMenu(); if(!this.ctxTargetRow) return;
    this.addRowToUI(this.ctxTargetType, this.ctxTargetRow, 'above');
  },
  ctxInsertRowBelow: function() {
    this.hideContextMenu(); if(!this.ctxTargetRow) return;
    this.addRowToUI(this.ctxTargetType, this.ctxTargetRow, 'below');
  },
  ctxDeleteRow: function() {
    this.hideContextMenu(); if(!this.ctxTargetRow) return;
    const type = this.ctxTargetType;
    const id = this.ctxTargetRow.getAttribute('data-id');
    
    if (type === 'curriculum' || type === 'timetable') {
      if(!confirm("이 줄에 입력된 모든 데이터가 삭제됩니다. 정말 삭제하시겠습니까?")) return;
      const idCells = this.ctxTargetRow.querySelectorAll('td[data-id]');
      idCells.forEach(c => {
        const itemID = c.getAttribute('data-id');
        if(itemID) {
           let sheetName = type === 'curriculum' ? '수업진도계획' : '시간표';
           this.silentSave('deleteData', { sheetName, id: itemID });
        }
      });
      this.ctxTargetRow.remove();
    } else {
      this.deleteItem(type, id, this.ctxTargetRow);
    }
  },
  ctxDeleteCol: function() {
    this.hideContextMenu(); if(!this.ctxTargetColName) return;
    this.removeColumn(this.ctxTargetType, this.ctxTargetColName);
  },
  addRowToUI: function(type, targetRow, pos) {
    this.addRow(type);
    const tbody = document.getElementById(`tbody-${type}`);
    if(tbody) {
       const newRow = tbody.lastElementChild;
       if(pos === 'above') tbody.insertBefore(newRow, targetRow);
       else tbody.insertBefore(newRow, targetRow.nextSibling);
       this.saveOrder(type, tbody);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
