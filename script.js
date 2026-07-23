// 원장님이 설정하신 GAS 웹앱 배포 주소 (여기로 데이터를 쏘고 받습니다)
const API_URL = "https://script.google.com/macros/s/AKfycbwpaok_qECmrmprAikJuFIBOe-xOzu-3X3d9qNgrxBpFBmDAKG9TbU5D6rGPdLYvPuW/exec";

const app = {
  currentView: 'view-dashboard',
  data: {
    preschedules: [],
    curriculums: [],
    timetables: [],
    students: [],
    instructors: []
  },
  
  // To store dynamic columns for pivot tables
  dynamicCols: {
    curriculum: [], // list of 과목
    timetable: [] // list of 반이름
  },

  init: function() {
    this.bindEvents();
    this.fetchInitialData();
  },

  showLoading: function() { document.getElementById('loadingSpinner').classList.remove('hidden'); },
  hideLoading: function() { document.getElementById('loadingSpinner').classList.add('hidden'); },

  apiPost: async function(action, payloadData) {
    try {
      const payload = { action, ...payloadData };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  apiGet: async function(action) {
    try {
      const response = await fetch(`${API_URL}?action=${action}`);
      return await response.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  fetchInitialData: async function() {
    this.showLoading();
    const res = await this.apiGet('getInitialData');
    if (res.error || res.success === false) {
      alert("데이터 로딩 에러: " + (res.error || res.message));
    } else {
      this.data.preschedules = res['사전준비일정'] || [];
      this.data.curriculums = res['수업진도계획'] || [];
      this.data.timetables = res['시간표'] || [];
      this.data.students = res['학생관리'] || [];
      this.data.instructors = res['강사관리'] || [];
      this.extractDynamicCols();
      this.renderAllViews();
    }
    this.hideLoading();
  },

  extractDynamicCols: function() {
    // Extract unique subjects for curriculum
    const currSubjects = new Set(this.data.curriculums.map(r => r[2]).filter(Boolean));
    this.dynamicCols.curriculum = Array.from(currSubjects);
    if(this.dynamicCols.curriculum.length === 0) this.dynamicCols.curriculum = ['수학', '과학']; // default

    // Extract unique class names for timetable
    const timeClasses = new Set(this.data.timetables.map(r => r[4]).filter(Boolean));
    this.dynamicCols.timetable = Array.from(timeClasses);
    if(this.dynamicCols.timetable.length === 0) this.dynamicCols.timetable = ['노바반', '퀀텀반']; // default
  },

  bindEvents: function() {
    const singleItems = document.querySelectorAll('.single-item');
    singleItems.forEach(item => {
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

  switchView: function(viewId) {
    const oldView = document.getElementById(this.currentView);
    if (oldView) {
      oldView.classList.remove('active');
      oldView.classList.add('hidden');
    }
    const newView = document.getElementById(viewId);
    if (newView) {
      newView.classList.remove('hidden');
      newView.classList.add('active');
    }
    this.currentView = viewId;
  },

  renderAllViews: function() {
    this.renderView('preschedule');
    this.renderView('curriculum');
    this.renderView('timetable');
    this.renderView('student');
    this.renderView('instructor');
  },

  renderView: function(viewName) {
    if (viewName === 'preschedule') this.renderFlatTable('preschedule', this.data.preschedules, ['일자', '내용', '비고']);
    else if (viewName === 'student') this.renderFlatTable('student', this.data.students, ['이름', '학교', '학년', '학부모연락처', '학생연락처', '비고']);
    else if (viewName === 'instructor') this.renderFlatTable('instructor', this.data.instructors, ['강사명', '과목', '세부과목', '연락처', '지메일', '비고']);
    else if (viewName === 'curriculum') this.renderCurriculumPivot();
    else if (viewName === 'timetable') this.renderTimetablePivot();
  },

  // -------------------------
  // Flat Tables (Auto-save)
  // -------------------------
  renderFlatTable: function(type, dataArray, cols) {
    const tbody = document.getElementById(`tbody-${type}`);
    if (!tbody) return;
    
    let html = '';
    dataArray.forEach(row => {
      const id = row[0];
      html += `<tr data-id="${id}">`;
      for(let i=0; i<cols.length; i++) {
        const val = row[i+1] || '';
        html += `<td contenteditable="true" data-col-idx="${i+1}" onblur="app.onFlatCellBlur('${type}', this)">${val}</td>`;
      }
      html += `<td style="text-align:center;"><button class="btn btn-danger" style="padding: 4px 8px; font-size:12px;" onclick="app.deleteItem('${type}', '${id}', this)">삭제</button></td>`;
      html += `</tr>`;
    });
    tbody.innerHTML = html;
  },

  onFlatCellBlur: function(type, cell) {
    const newValue = cell.innerText.trim();
    let dataArray, upsertAction;
    let keys = [];
    
    if (type === 'preschedule') { dataArray = this.data.preschedules; upsertAction = 'upsertPreSchedule'; keys = ['date', 'content', 'note']; }
    else if (type === 'student') { dataArray = this.data.students; upsertAction = 'upsertStudent'; keys = ['name', 'school', 'grade', 'parentPhone', 'studentPhone', 'note']; }
    else if (type === 'instructor') { dataArray = this.data.instructors; upsertAction = 'upsertInstructor'; keys = ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']; }

    const colIdx = parseInt(cell.getAttribute('data-col-idx'));
    
    const rowEl = cell.closest('tr');
    let currentId = rowEl.getAttribute('data-id');
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    
    const rowObj = dataArray[rowIndex];
    if (!rowObj) return;

    if (rowObj[colIdx] == newValue) return; // no change
    rowObj[colIdx] = newValue;

    const payload = { id: currentId };
    for(let i=0; i<keys.length; i++) {
      payload[keys[i]] = rowObj[i+1];
    }
    
    this.apiPost(upsertAction, payload).then(res => {
      if(res.success && res.id) {
        rowObj[0] = res.id;
        rowEl.setAttribute('data-id', res.id);
        const btn = rowEl.querySelector('button.btn-danger');
        if(btn) btn.setAttribute('onclick', `app.deleteItem('${type}', '${res.id}', this)`);
      }
    });
  },

  addRow: function(type) {
    if (type === 'preschedule' || type === 'student' || type === 'instructor') {
      let dataArray;
      if (type === 'preschedule') dataArray = this.data.preschedules;
      if (type === 'student') dataArray = this.data.students;
      if (type === 'instructor') dataArray = this.data.instructors;
      
      const newRow = ['']; // ID is empty
      const tbody = document.getElementById(`tbody-${type}`);
      const colCount = tbody.parentElement.querySelectorAll('th').length - 1;
      for(let i=0; i<colCount; i++) newRow.push('');
      dataArray.push(newRow);
      this.renderView(type);
    } else if (type === 'curriculum' || type === 'timetable') {
      if (type === 'curriculum') {
        const weeks = new Set(this.data.curriculums.map(r => r[1]).filter(Boolean));
        let nextWeek = `${weeks.size + 1}주차`;
        this.dynamicCols.curriculum.forEach(sub => {
          this.data.curriculums.push(['', nextWeek, sub, '', '']);
        });
      } else {
        const timePairs = new Set(this.data.timetables.map(r => r[3] + '|' + r[4]).filter(t => t !== '|'));
        let nextStart = '18:00';
        let nextEnd = '20:00';
        this.dynamicCols.timetable.forEach(cls => {
          this.data.timetables.push(['', '', '', nextStart, nextEnd, cls, '', '', '', '']); 
        });
      }
      this.renderView(type);
    }
  },

  // -------------------------
  // Pivot Tables (Auto-save)
  // -------------------------
  renderCurriculumPivot: function() {
    const table = document.querySelector('#view-curriculum .excel-table');
    const subjects = this.dynamicCols.curriculum;
    let headHtml = `<thead><tr><th>주차 <button class="btn" style="padding:2px 4px;font-size:10px;margin-left:5px;" onclick="app.addColumn('curriculum')">+</button></th>`;
    subjects.forEach(sub => headHtml += `<th>${sub}</th>`);
    headHtml += `</tr></thead>`;

    const weeks = Array.from(new Set(this.data.curriculums.map(r => r[1]).filter(Boolean)));
    if (weeks.length === 0) weeks.push('1주차');

    let bodyHtml = `<tbody id="tbody-curriculum">`;
    weeks.forEach(week => {
      bodyHtml += `<tr><td style="background: rgba(255,255,255,0.05); font-weight:bold; text-align:center;" contenteditable="true" onblur="app.updatePivotRowLabel('curriculum', '${week}', this.innerText.trim())">${week}</td>`;
      subjects.forEach(sub => {
        const row = this.data.curriculums.find(r => r[1] === week && r[2] === sub);
        const id = row ? row[0] : '';
        const content = row ? row[3] : '';
        bodyHtml += `<td contenteditable="true" data-id="${id}" data-week="${week}" data-sub="${sub}" onblur="app.onCurriculumBlur(this)">${content}</td>`;
      });
      bodyHtml += `</tr>`;
    });
    bodyHtml += `</tbody>`;
    table.innerHTML = headHtml + bodyHtml;
  },

  onCurriculumBlur: function(cell) {
    const newValue = cell.innerText.trim();
    const id = cell.getAttribute('data-id');
    const week = cell.getAttribute('data-week');
    const sub = cell.getAttribute('data-sub');

    let rowObj = this.data.curriculums.find(r => (id && r[0] === id) || (r[1] === week && r[2] === sub));
    
    if (rowObj) {
      if (rowObj[3] == newValue) return; // no change
      rowObj[3] = newValue;
    } else {
      if (!newValue) return;
      rowObj = ['', week, sub, newValue, ''];
      this.data.curriculums.push(rowObj);
    }

    const payload = { id: rowObj[0], week: week, subject: sub, content: newValue };
    
    this.apiPost('upsertCurriculum', payload).then(res => {
      if(res.success && res.id) {
        rowObj[0] = res.id;
        cell.setAttribute('data-id', res.id);
      }
    });
  },

  renderTimetablePivot: function() {
    const table = document.querySelector('#view-timetable .excel-table');
    const classes = this.dynamicCols.timetable;
    let headHtml = `<thead><tr><th>시작시간</th><th>종료시간 <button class="btn" style="padding:2px 4px;font-size:10px;margin-left:5px;" onclick="app.addColumn('timetable')">+</button></th>`;
    classes.forEach(cls => headHtml += `<th>${cls}</th>`);
    headHtml += `</tr></thead>`;

    const timePairs = Array.from(new Set(this.data.timetables.map(r => r[3] + '|' + r[4]).filter(t => t !== '|')));
    if (timePairs.length === 0) timePairs.push('18:00|20:00');

    let bodyHtml = `<tbody id="tbody-timetable">`;
    timePairs.forEach(pair => {
      const [start, end] = pair.split('|');
      bodyHtml += `<tr>
        <td style="background: rgba(255,255,255,0.05); text-align:center;">
          <input type="time" value="${start}" onblur="app.updatePivotRowTime('${pair}', 'start', this.value)" style="background:transparent; color:white; border:none; outline:none; text-align:center; cursor:pointer;" required>
        </td>
        <td style="background: rgba(255,255,255,0.05); text-align:center;">
          <input type="time" value="${end}" onblur="app.updatePivotRowTime('${pair}', 'end', this.value)" style="background:transparent; color:white; border:none; outline:none; text-align:center; cursor:pointer;" required>
        </td>`;
      classes.forEach(cls => {
        const row = this.data.timetables.find(r => r[3] === start && r[4] === end && r[5] === cls);
        const id = row ? row[0] : '';
        let displayStr = '';
        if (row && (row[6] || row[7])) {
          displayStr = `${row[6] || ''}${row[7] ? '('+row[7]+')' : ''}`;
        }
        bodyHtml += `<td contenteditable="true" data-id="${id}" data-start="${start}" data-end="${end}" data-cls="${cls}" onblur="app.onTimetableBlur(this)" placeholder="과목(담당자)">${displayStr}</td>`;
      });
      bodyHtml += `</tr>`;
    });
    bodyHtml += `</tbody>`;
    table.innerHTML = headHtml + bodyHtml;
  },

  updatePivotRowTime: function(oldPair, type, newValue) {
    if(!newValue) return;
    const [oldStart, oldEnd] = oldPair.split('|');
    const newStart = type === 'start' ? newValue : oldStart;
    const newEnd = type === 'end' ? newValue : oldEnd;
    if (oldStart === newStart && oldEnd === newEnd) return;
    
    this.data.timetables.forEach(r => {
      if (r[3] === oldStart && r[4] === oldEnd) {
        r[3] = newStart;
        r[4] = newEnd;
        this.silentSave('upsertTimetable', {
          id: r[0], date: r[1], day: r[2], start: r[3], end: r[4], 
          className: r[5], subject: r[6], instructor: r[7], note: r[8]
        });
      }
    });
    this.renderView('timetable');
  },

  onTimetableBlur: function(cell) {
    const newValue = cell.innerText.trim();
    const id = cell.getAttribute('data-id');
    const start = cell.getAttribute('data-start');
    const end = cell.getAttribute('data-end');
    const cls = cell.getAttribute('data-cls');

    let subject = newValue;
    let instructor = '';
    const match = newValue.match(/(.*?)\((.*?)\)/);
    if(match) {
      subject = match[1].trim();
      instructor = match[2].trim();
    }

    let rowObj = this.data.timetables.find(r => (id && r[0] === id) || (r[3] === start && r[4] === end && r[5] === cls));
    
    if (rowObj) {
      if (rowObj[6] == subject && rowObj[7] == instructor) return; // no change
      rowObj[6] = subject;
      rowObj[7] = instructor;
    } else {
      if (!newValue) return;
      rowObj = ['', '', '', start, end, cls, subject, instructor, '', ''];
      this.data.timetables.push(rowObj);
    }

    const payload = { id: rowObj[0], date: '', day: '', start: start, end: end, className: cls, subject: subject, instructor: instructor, note: '' };
    
    this.apiPost('upsertTimetable', payload).then(res => {
      if(res.success && res.id) {
        rowObj[0] = res.id;
        cell.setAttribute('data-id', res.id);
      }
    });
  },

  updatePivotRowLabel: function(type, oldLabel, newLabel) {
    if(!newLabel || oldLabel === newLabel) return;
    if(type === 'curriculum') {
      this.data.curriculums.forEach(r => { 
        if(r[1] === oldLabel) { 
          r[1] = newLabel; 
          this.silentSave('upsertCurriculum', {id: r[0], week: newLabel, subject: r[2], content: r[3]}); 
        } 
      });
    }
    this.renderView(type);
  },

  // -------------------------
  // Column additions (Modal)
  // -------------------------
  addColumn: function(type) {
    const title = type === 'curriculum' ? '새 과목(열) 추가' : '새 반이름(열) 추가';
    document.getElementById('generic-modal-title').innerText = title;
    document.getElementById('generic-modal-body').innerHTML = `
      <div class="form-group">
        <label>${type === 'curriculum' ? '과목명' : '반이름'}</label>
        <input type="text" id="new-col-input" class="form-control">
      </div>
    `;
    document.getElementById('modal-container').classList.remove('hidden');
    document.getElementById('generic-modal').classList.remove('hidden');
    
    this.currentModalAction = () => {
      const val = document.getElementById('new-col-input').value.trim();
      if(val) {
        if(type === 'curriculum' && !this.dynamicCols.curriculum.includes(val)) this.dynamicCols.curriculum.push(val);
        if(type === 'timetable' && !this.dynamicCols.timetable.includes(val)) this.dynamicCols.timetable.push(val);
        this.renderView(type);
      }
      this.closeModal();
    };
  },

  closeModal: function() {
    document.getElementById('modal-container').classList.add('hidden');
    document.getElementById('generic-modal').classList.add('hidden');
  },

  saveModalData: function() {
    if(typeof this.currentModalAction === 'function') this.currentModalAction();
  },

  // -------------------------
  // Shared
  // -------------------------
  silentSave: function(action, payload) {
    this.apiPost(action, payload).then(res => {
      if(!res.success) console.error("Auto-save failed:", res.message);
    });
  },

  deleteItem: async function(type, id, btn) {
    if(!id) {
      const rowEl = btn.closest('tr');
      const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
      if (type === 'preschedule') this.data.preschedules.splice(rowIndex, 1);
      if (type === 'student') this.data.students.splice(rowIndex, 1);
      if (type === 'instructor') this.data.instructors.splice(rowIndex, 1);
      this.renderView(type);
      return;
    }

    if(!confirm("정말 삭제하시겠습니까?")) return;
    
    let sheetName;
    if (type === 'preschedule') sheetName = '사전준비일정';
    if (type === 'curriculum') sheetName = '수업진도계획';
    if (type === 'timetable') sheetName = '시간표';
    if (type === 'student') sheetName = '학생관리';
    if (type === 'instructor') sheetName = '강사관리';

    this.showLoading();
    const res = await this.apiPost('deleteData', { sheetName, id });
    if(res.success) {
      this.fetchInitialData();
    } else {
      alert("삭제 실패: " + res.message);
      this.hideLoading();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
