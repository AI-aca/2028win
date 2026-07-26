// Supabase 설정
const SUPABASE_URL = "https://lkqvaovxiohkzgjsuwcd.supabase.co";
const SUPABASE_KEY = "sb_publishable_ePWcQ0S9-DDaNRUdsyTG-g__3Jz6ziX";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


const app = {
  localMode: false,
  currentTerm: 1,
  currentView: 'view-dashboard',
  data: { preschedules: [], curriculums: [], curriculums_science: [], timetables: [], students: [], instructors: [] },
  dynamicCols: { curriculum: [], curriculum_science: [], timetable: [] },
  uiSettings: {},
  ctxTargetRow: null, ctxTargetType: null, draggedRow: null, draggedType: null,
  sortState: {},
  pendingRequests: 0, failedRequests: 0,

  openInstructorSelectModal: function(td, mode) {
    document.getElementById('generic-modal-title').innerText = mode === 'area' ? '영역 선택' : '과목 선택';
    let defaultText = mode === 'area' ? '영역 선택' : '과목 선택';
    let optsHtml = `<option value="">${defaultText}</option>`;
    if (mode === 'area') {
      optsHtml += '<option value="수학">수학</option><option value="과학">과학</option>';
    } else {
      if (app.managedSubjects && Array.isArray(app.managedSubjects)) {
        app.managedSubjects.forEach(s => {
          optsHtml += `<option value="${s.name}" data-category="${s.category}">${s.emoji} ${s.name}</option>`;
        });
      }
    }
    
    document.getElementById('generic-modal-body').innerHTML = `
      <div class="form-group">
        <label>${mode === 'area' ? '영역' : '과목'}</label>
        <select id="instructor-modal-select" class="form-control">
          ${optsHtml}
        </select>
      </div>
    `;
    
    document.getElementById('modal-container').classList.remove('hidden');
    document.getElementById('generic-modal').classList.remove('hidden');
    
    app.currentModalAction = () => {
      const select = document.getElementById('instructor-modal-select');
      td.innerHTML = select.value;
      app.closeModal();
      app.onFlatCellBlur('instructor', td);
    };
  },

  init: function() {
    this.bindEvents();
    window.addEventListener('beforeunload', (e) => {
      if (this.pendingRequests > 0) {
        e.preventDefault();
        e.returnValue = "아직 서버에 저장 중인 데이터가 있습니다. 정말 창을 닫으시겠습니까?";
      }
    });
    if (sessionStorage.getItem('auth_pass')) {
      document.getElementById('login-overlay').style.display = 'none';
      document.getElementById('main-app').style.display = 'flex';
      this.fetchInitialData();
    }
    
    document.addEventListener('mousedown', (e) => {
      const tb = document.getElementById('rich-toolbar');
      if (tb && !tb.contains(e.target) && !e.target.closest('[contenteditable="true"]')) this.hideToolbar();
      const ctx = document.getElementById('context-menu');
      if (ctx && !ctx.contains(e.target)) this.hideContextMenu();
    });

    // 달력/시간 입력창 우클릭 시 플랫피커 팝업 반응 강제 차단 (깜빡임 방지)
    document.addEventListener('mousedown', (e) => {
      if (e.button === 2 && e.target && e.target.classList.contains('date-picker-input')) {
        e.preventDefault();
      }
    }, true);

    document.addEventListener('dblclick', (e) => {
      const td = e.target.closest('td');
      if (!td) return;
      const key = td.getAttribute('data-cell-key') || '';
      if (key.includes('bg_tt_date_')) {
        app.openDatePicker(td);
      } else if (key.includes('bg_tt_start_')) {
        app.openTimePicker(td, 'start');
      } else if (key.includes('bg_tt_end_')) {
        app.openTimePicker(td, 'end');
      }
    });

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) { this.hideToolbar(); return; }
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const td = container.nodeType === 3 ? container.parentElement.closest('[contenteditable="true"]') : container.closest('[contenteditable="true"]');
      if (td) {
        const rect = range.getBoundingClientRect();
        this.showToolbar(rect.left + rect.width / 2, rect.top);
      } else { this.hideToolbar(); }
    });
  },

  showLoading: function() { document.getElementById('loadingSpinner').classList.remove('hidden'); },
  hideLoading: function() { document.getElementById('loadingSpinner').classList.add('hidden'); },

  formatPhone: function(val) {
    if (!val) return '';
    let num = val.replace(/[^0-9]/g, '');
    if (num.length === 11) return num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (num.length === 10) return num.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return num; // 그 외는 발라낸 숫자 그대로
  },

  handlePhoneFocus: function(el) {
    // 하이픈 제거하고 순수 숫자로 바꿈
    el.innerText = el.innerText.replace(/[^0-9]/g, '');
  },

  handlePhoneKeydown: function(e, el) {
    // 허용 키: 백스페이스(8), 탭(9), 엔터(13), 좌우방향키(37,39), 딜리트(46), 숫자(48-57, 96-105)
    const key = e.keyCode || e.which;
    const isControlKey = key === 8 || key === 9 || key === 13 || key === 46 || (key >= 37 && key <= 40);
    const isNumberKey = (key >= 48 && key <= 57) || (key >= 96 && key <= 105);
    // Ctrl, Cmd, Shift, Alt 등의 조합도 허용 (복붙 등)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (!isControlKey && !isNumberKey) {
      e.preventDefault();
      return;
    }
    // 11자리 글자수 제한 (블록 씌워진 상태면 입력 허용)
    if (isNumberKey && !window.getSelection().toString()) {
      let num = el.innerText.replace(/[^0-9]/g, '');
      if (num.length >= 11) {
        e.preventDefault();
      }
    }
  },

  updateSyncStatus: function() {
    const indicator = document.getElementById('sync-status-indicator');
    if (!indicator) return;
    
    const icon = indicator.querySelector('.sync-icon');
    const text = indicator.querySelector('.sync-text');
    
    if (this.pendingRequests === 0) {
      if (this.failedRequests > 0) {
        indicator.style.color = '#ef4444'; // 빨간색
        indicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        icon.innerHTML = '❌';
        icon.style.display = 'inline-block';
        icon.style.animation = 'none';
        text.innerText = '저장 실패 항목 있음 (새로고침 요망)';
      } else {
        indicator.style.color = '#10b981'; // 녹색
        indicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        icon.innerHTML = '✓';
        icon.style.display = 'inline-block';
        icon.style.animation = 'none';
        text.innerText = '모든 변경사항 저장됨';
      }
    } else {
      indicator.style.color = '#ef4444'; // 빨간색
      indicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      icon.innerHTML = '↻';
      icon.style.display = 'inline-block';
      icon.style.animation = 'spin 1s linear infinite';
      text.innerText = `저장 중... (${this.pendingRequests}건 대기)`;
    }
  },

  apiPost: async function(action, payloadData) {
    this.pendingRequests++;
    this.updateSyncStatus();
    
    try {
      let table = '';
      let data = {};
      
      if (payloadData) {
        for (let key in payloadData) {
          data[key.toLowerCase()] = payloadData[key];
        }
      }

      switch(action) {
        case 'upsertPreSchedule': table = 'preschedules'; break;
        case 'upsertCurriculum': case 'upsertMultipleCurriculums': table = 'curriculums'; break;
        case 'upsertCurriculumScience': case 'upsertMultipleCurriculumSciences': table = 'curriculums_science'; break;
        case 'upsertTimetable': case 'upsertMultipleTimetables': table = 'timetables'; break;
        case 'upsertStudent': table = 'students'; break;
        case 'upsertInstructor': table = 'instructors'; break;
        case 'saveUISettings': 
          table = 'ui_settings'; 
          if (!data.id && data.key) data.id = data.key;
          break;
        case 'deleteData': case 'deleteMultipleData': 
          let delTable = '';
          const sn = payloadData.sheetName;
          if (sn === '사전준비일정') delTable = 'preschedules';
          else if (sn === '수업진도계획') delTable = 'curriculums';
          else if (sn === '과학진도계획') delTable = 'curriculums_science';
          else if (sn === '시간표') delTable = 'timetables';
          else if (sn === '학생관리') delTable = 'students';
          else if (sn === '강사관리') delTable = 'instructors';
          
          if (action === 'deleteData') {
            const { error } = await supabaseClient.from(delTable).delete().eq('id', payloadData.id);
            if (error) throw error;
          } else {
            const { error } = await supabaseClient.from(delTable).delete().in('id', payloadData.ids);
            if (error) throw error;
          }
          return { success: true };
      }

      if (table) {
        if (action.includes('Multiple')) {
          const arrData = payloadData.payloadArray.map(obj => {
            let lowerObj = {};
            for (let k in obj) {
              if (['action', 'authpass', 'payloadarray', 'insertindex', 'regtime'].includes(k.toLowerCase())) continue;
              lowerObj[k.toLowerCase()] = obj[k];
            }
            if (['curriculums', 'curriculums_science', 'timetables', 'preschedules'].includes(table)) {
              lowerObj.term = app.currentTerm;
            }
            return lowerObj;
          });
          const { error } = await supabaseClient.from(table).upsert(arrData);
          if (error) throw error;
        } else {
          let lowerData = {};
          for (let k in data) {
            if (['action', 'authpass', 'payloadarray', 'insertindex', 'regtime'].includes(k.toLowerCase())) continue;
            lowerData[k.toLowerCase()] = data[k];
          }
          if (['curriculums', 'curriculums_science', 'timetables', 'preschedules'].includes(table)) {
            lowerData.term = app.currentTerm;
          }
          const { error } = await supabaseClient.from(table).upsert(lowerData);
          if (error) throw error;
        }
        return { success: true, id: data.id };
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      this.failedRequests++;
      return { success: false, message: e.message };
    } finally {
      this.pendingRequests--;
      this.updateSyncStatus();
    }
  },

  login: async function() {
    const pw = document.getElementById('login-password').value;
    if (!pw) return;
    this.showLoading();
    if (pw === '2028w!' || pw === 'weiz2028' || pw === '2028ㅈ!') {
      sessionStorage.setItem('auth_pass', pw);
      document.getElementById('login-error').classList.add('hidden');
      document.getElementById('login-overlay').style.display = 'none';
      document.getElementById('main-app').style.display = 'flex';
      await this.fetchInitialData();
    } else {
      document.getElementById('login-error').classList.remove('hidden');
      this.hideLoading();
    }
  },

  fetchInitialData: async function() {
    this.showLoading();
    try {
      const term = this.currentTerm || 1;
      const [preRes, curRes, curSciRes, ttRes, stuRes, insRes, uiRes] = await Promise.all([
        supabaseClient.from('preschedules').select('*').eq('term', term).order('date', { ascending: true }),
        supabaseClient.from('curriculums').select('*').eq('term', term).order('week', { ascending: true }),
        supabaseClient.from('curriculums_science').select('*').eq('term', term).order('week', { ascending: true }),
        supabaseClient.from('timetables').select('*').eq('term', term).order('date', { ascending: true }).order('start', { ascending: true }),
        supabaseClient.from('students').select('*').order('name', { ascending: true }),
        supabaseClient.from('instructors').select('*').order('instructorname', { ascending: true }),
        supabaseClient.from('ui_settings').select('*')
      ]);

      let uiMap = {};
      if (uiRes && uiRes.data) {
        uiRes.data.forEach(r => { uiMap[r.key] = r.value; });
      }

      const res = {
        '사전준비일정': (preRes.data || []).map(r => [r.id, r.date, r.content, r.status, r.note]),
        '수업진도계획': (curRes.data || []).map(r => [r.id, r.week, r.subject, r.content, r.note]),
        '과학진도계획': (curSciRes.data || []).map(r => [r.id, r.week, r.subject, r.content, r.note]),
        '시간표': (ttRes.data || []).map(r => [r.id, r.date, r.type, r.start, r.end, r.classname, r.subject, r.instructor, r.note, r.regtime]),
        '학생관리': (stuRes.data || []).map(r => [r.id, r.name, r.center, r.school, r.grade, r.parentphone, r.studentphone, r.note, r.class_name, r.pre_score]),
        '강사관리': (insRes.data || []).map(r => [r.id, r.instructorname, r.subject, r.subsubject, r.phone, r.email, r.note]),
        'uiSettings': uiMap
      };
      
      this.processInitialData(res);
    } catch (e) {
      alert("데이터 로딩 에러: " + e.message);
      this.hideLoading();
    }
  },

  processInitialData: function(res) {
    const cleanDate = (arr) => arr.map(r => r.map(c => {
      if (typeof c === 'string') {
        if (c.match(/^\d{4}-\d{2}-\d{2}T/)) {
          const d = new Date(c);
          const days = ['일','월','화','수','목','금','토'];
          const yy = String(d.getFullYear()).slice(-2);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yy}-${mm}-${dd} (${days[d.getDay()]})`;
        }
        return c.replace(/^20(\d{2}-\d{2}-\d{2})/, '$1');
      }
      return c;
    }));
    this.data.preschedules = cleanDate(res['사전준비일정'] || []);
    const sortByWeekNum = (a, b) => {
      const numA = parseInt((a[1] || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b[1] || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a[1] || '').localeCompare(b[1] || '');
    };
    this.data.curriculums = cleanDate(res['수업진도계획'] || []).sort(sortByWeekNum);
    this.data.curriculums_science = cleanDate(res['과학진도계획'] || []).sort(sortByWeekNum);
    
    let ttData = cleanDate(res['시간표'] || []);
    ttData.forEach(r => {
      if (!r[1]) {
        const regTimeStr = r[9] || '';
        const safeRegTime = regTimeStr.replace(/[^a-zA-Z0-9]/g, '');
        r[1] = 'tmp-' + safeRegTime;
      }
    });
    this.data.timetables = ttData;
    
    this.data.students = res['학생관리'] || [];
    this.data.instructors = res['강사관리'] || [];
    
    this.uiSettings = res.uiSettings || {};
    
    if (!this.uiSettings.managed_subjects) {
      this.uiSettings.managed_subjects = JSON.stringify([
        { name: '기하', category: '수학', emoji: '📐' },
        { name: '조합', category: '수학', emoji: '🎲' },
        { name: '대수', category: '수학', emoji: '🧮' },
        { name: '정수', category: '수학', emoji: '🔢' },
        { name: '기타(수학)', category: '수학', emoji: '➕' },
        { name: '물리', category: '과학', emoji: '🍎' },
        { name: '화학', category: '과학', emoji: '🧪' },
        { name: '생명과학', category: '과학', emoji: '🧬' },
        { name: '지구과학', category: '과학', emoji: '🌍' },
        { name: '기타(과학)', category: '과학', emoji: '🔬' }
      ]);
    }
    this.managedSubjects = JSON.parse(this.uiSettings.managed_subjects);
    
    if (!this.uiSettings.managed_classes) {
      this.uiSettings.managed_classes = JSON.stringify(['A반', 'B반', 'C반']);
    }
    this.managedClasses = JSON.parse(this.uiSettings.managed_classes);
    
    this.extractDynamicCols();
    this.renderAllViews();
    this.hideLoading();
  },

  extractDynamicCols: function() {
    const sortByManaged = (a, b) => {
      if (!this.managedSubjects) return 0;
      const idxA = this.managedSubjects.findIndex(s => s.name === a);
      const idxB = this.managedSubjects.findIndex(s => s.name === b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    };
    this.dynamicCols.curriculum = Array.from(new Set(this.data.curriculums.map(r => r[2]).filter(x => x))).sort(sortByManaged);
    this.dynamicCols.curriculum_science = Array.from(new Set(this.data.curriculums_science.map(r => r[2]).filter(x => x))).sort(sortByManaged);
    
    this.dynamicCols.timetable = Array.from(new Set(this.data.timetables.map(r => r[5]).filter(x => x && x !== '전체')));
  },

  openDatePicker: function(td) {
    const input = document.createElement('input');
    input.style.position = 'absolute';
    input.style.opacity = '0';
    const rect = td.getBoundingClientRect();
    input.style.left = rect.left + 'px';
    input.style.top = (rect.top + window.scrollY) + 'px';
    document.body.appendChild(input);
    const fp = flatpickr(input, {
      locale: "ko",
      theme: "dark",
      disableMobile: true,
      defaultDate: new Date(),
      onChange: function(selectedDates, dateStr, instance) {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const date = selectedDates[0];
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const day = days[date.getDay()];
        const formatted = `${yy}-${mm}-${dd} (${day})`;
        
        const div = td.querySelector('div[contenteditable="true"]');
        if (div) {
          div.innerText = formatted;
          div.style.removeProperty('color');
        } else {
          td.innerHTML = formatted;
        }
        if(app.updatePivotRowDate) app.updatePivotRowDate(td, formatted);
        setTimeout(() => { fp.destroy(); input.remove(); }, 100);
      },
      onClose: function() {
        setTimeout(() => { fp.destroy(); input.remove(); }, 100);
      }
    });
    fp.open();
  },

  openDayPicker: function(td) {
    let dropdown = document.getElementById('day-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'day-dropdown';
      dropdown.style.position = 'absolute';
      dropdown.style.backgroundColor = '#1f2937';
      dropdown.style.border = '1px solid #374151';
      dropdown.style.borderRadius = '8px';
      dropdown.style.padding = '5px 0';
      dropdown.style.zIndex = '10000';
      dropdown.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.5)';
      document.body.appendChild(dropdown);
    }
    
    dropdown.innerHTML = '';
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    days.forEach(d => {
      const div = document.createElement('div');
      div.innerText = d;
      div.style.padding = '8px 16px';
      div.style.cursor = 'pointer';
      div.style.color = '#f3f4f6';
      div.style.fontSize = '14px';
      div.onmouseover = () => div.style.backgroundColor = '#374151';
      div.onmouseout = () => div.style.backgroundColor = 'transparent';
      div.onclick = () => {
        const textDiv = td.querySelector('div[contenteditable="true"]');
        if (textDiv) {
          textDiv.innerText = d;
          textDiv.style.color = '';
        }
        else td.innerHTML = d;
        if(app.updatePivotRowDate) app.updatePivotRowDate(td, d);
        dropdown.classList.add('hidden');
      };
      dropdown.appendChild(div);
    });
    
    const rect = td.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;
    dropdown.classList.remove('hidden');
    
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && e.target !== td) {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 10);
  },

  openTimePicker: function(td, field) {
    let dropdown = document.getElementById('time-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'time-dropdown';
      dropdown.style.position = 'absolute';
      dropdown.style.backgroundColor = '#1f2937';
      dropdown.style.border = '1px solid #374151';
      dropdown.style.borderRadius = '8px';
      dropdown.style.padding = '5px 0';
      dropdown.style.maxHeight = '200px';
      dropdown.style.overflowY = 'auto';
      dropdown.style.zIndex = '10000';
      dropdown.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.5)';
      document.body.appendChild(dropdown);
    }
    
    dropdown.innerHTML = '';
    const times = [];
    for(let h=10; h<=22; h++) {
      times.push(`${String(h).padStart(2,'0')}:00`);
      if(h !== 22) times.push(`${String(h).padStart(2,'0')}:30`);
    }
    
    times.forEach(t => {
      const div = document.createElement('div');
      div.innerText = t;
      div.style.padding = '8px 16px';
      div.style.cursor = 'pointer';
      div.style.color = '#f3f4f6';
      div.style.fontSize = '14px';
      div.style.fontWeight = '500';
      div.onmouseover = () => div.style.backgroundColor = '#374151';
      div.onmouseout = () => div.style.backgroundColor = 'transparent';
      div.onclick = () => {
        const textDiv = td.querySelector('div[contenteditable="true"]');
        if (textDiv) {
          textDiv.innerText = t;
        } else {
          td.innerHTML = t;
        }
        if(app.updatePivotRowTime) app.updatePivotRowTime(td, field, t);
        dropdown.classList.add('hidden');
      };
      dropdown.appendChild(div);
    });

    const rect = td.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;
    dropdown.classList.remove('hidden');
    
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && e.target !== td) {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 10);
  },

  bindEvents: function() {
    document.addEventListener('paste', (e) => {
      const td = e.target.closest('td[contenteditable="true"]');
      if (td) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      }
    });

    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.accordion-item');
        item.classList.toggle('open');
      });
    });

    document.querySelectorAll('.sub-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        document.querySelectorAll('.single-item, .sub-item, .accordion-header').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');
        e.currentTarget.closest('.accordion-item').querySelector('.accordion-header').classList.add('active');
        
        const targetViewId = e.currentTarget.getAttribute('data-target');
        const term = parseInt(e.currentTarget.getAttribute('data-term'), 10);
        
        let termChanged = false;
        if (app.currentTerm !== term) {
          app.currentTerm = term;
          termChanged = true;
        }

        const parentText = e.currentTarget.closest('.accordion-item').querySelector('.text').innerText;
        document.getElementById('pageTitle').innerText = parentText + ` [${term}차]`;
        
        app.switchView(targetViewId);
        
        if (termChanged) {
          await app.fetchInitialData();
        } else {
          app.renderView(targetViewId.replace('view-', ''));
        }
      });
    });

    document.querySelectorAll('.single-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.single-item, .sub-item, .accordion-header').forEach(el => el.classList.remove('active'));
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
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('preschedule')">+ 내용 추가</button>`;
      } else if (viewId === 'view-curriculum') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('curriculum')">+ 주차 추가</button> <button class="btn btn-primary" onclick="app.addColumn('curriculum')">+ 과목 추가</button>`;
      } else if (viewId === 'view-curriculum-science') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('curriculum_science')">+ 주차 추가</button> <button class="btn btn-primary" onclick="app.addColumn('curriculum_science')">+ 과목 추가</button>`;
      } else if (viewId === 'view-timetable-summary') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('timetable_summary')">+ 요일 추가</button> <button class="btn btn-primary" onclick="app.addColumn('timetable')">+ 학급 추가</button>`;
      } else if (viewId === 'view-timetable') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('timetable')">+ 시간 추가</button> <button class="btn btn-primary" onclick="app.addRow('holiday')">+ 휴일 추가</button> <button class="btn btn-primary" onclick="app.addColumn('timetable')">+ 학급 추가</button>`;
      } else if (viewId === 'view-student') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('student')">+ 학생 추가</button> <button class="btn btn-primary" onclick="app.openClassManagerModal()">+ 학급 관리</button>`;
      } else if (viewId === 'view-instructor') {
        headerActions.innerHTML = `<button class="btn btn-primary" onclick="app.addRow('instructor')">+ 강사 추가</button> <button class="btn btn-primary" onclick="app.openSubjectManagerModal()">+ 과목 관리</button>`;
      } else {
        headerActions.innerHTML = '';
      }
    }
  },

  renderAllViews: function() {
    this.renderView('preschedule'); this.renderView('curriculum'); this.renderView('curriculum_science');
    this.renderView('timetable'); this.renderView('timetable_summary'); this.renderView('student'); this.renderView('instructor');
  },

  renderView: function(viewName) {
    if (viewName === 'preschedule') this.renderFlatTable('preschedule', this.data.preschedules, [{label:'일자', idx:1, fixed:true, width:'12%', left:'0'}, {label:'상태', idx:3, fixed:true, width:'10%', left:'12%'}, {label:'내용', idx:2}, {label:'비고', idx:4}]);
    else if (viewName === 'student') this.renderFlatTable('student', this.data.students, [{label:'학생명', idx:1, fixed:true, width:'8%', left:'0'}, {label:'학급', idx:8}, {label:'사전 평가점수', idx:9}, {label:'센터', idx:2}, {label:'학교', idx:3}, {label:'학년', idx:4}, {label:'학부모 연락처', idx:5}, {label:'학생 연락처', idx:6}, {label:'비고', idx:7}]);
    else if (viewName === 'instructor') this.renderFlatTable('instructor', this.data.instructors, [{label:'강사명', idx:1, fixed:true, width:'8%', left:'0'}, {label:'영역', idx:2}, {label:'과목', idx:3}, {label:'연락처', idx:4}, {label:'지메일', idx:5}, {label:'비고', idx:6}]);
    else if (viewName === 'curriculum') this.renderCurriculumPivot('curriculum');
    else if (viewName === 'curriculum_science') this.renderCurriculumPivot('curriculum_science');
    else if (viewName === 'timetable') this.renderTimetablePivot(false);
    else if (viewName === 'timetable_summary' || viewName === 'timetable-summary') this.renderTimetablePivot(true);
  },

  getCleanHTML: function(cell) {
    let html = cell.innerHTML;
    // 엔터(div)를 br로 변환하여 줄바꿈 유지
    html = html.replace(new RegExp('<div>', 'gi'), '<br>').replace(new RegExp('</div>', 'gi'), '');
    // 색상, 굵기 등 안전한 태그만 남기고 전부 삭제
    html = html.replace(/<\/?(?!(span|div|font|b|i|u|br)\b)[^>]*>/gi, '');
    // 딜리미터 충돌 방지
    let val = html.replace(/\|/g, '／');
    val = val.trim();
    val = val.replace(/^(?:<br>\s*)+|(?:<br>\s*)+$/gi, '');
    return val;
  },

  onKeyDown: function(e, cell) {
    // 화살표로 셀 간 이동하는 기능 완전 삭제 (글자 사이 커서 이동 기본 기능 복구)
  },

  bindRowEvents: function(tr, type) {
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault(); 
      this.ctxTargetRow = tr; 
      this.ctxTargetType = type;
      this.ctxTargetCell = e.target.closest('td');
      this.showContextMenu(e.pageX, e.pageY);
    });
  },



  renderSortableHeader: function(label, type, colIdx) {
    return `${label} <span class="sort-icon" onclick="app.sortTable('${type}', ${colIdx})" style="cursor:pointer; margin-left:4px; user-select:none;">▼</span>`;
  },

  sortTable: function(type, colIdx) {
    const isAsc = this.sortState[type + colIdx] === 'asc';
    this.sortState[type + colIdx] = isAsc ? 'desc' : 'asc';
    
    let dataArray;
    if (type === 'preschedule') dataArray = this.data.preschedules;
    else if (type === 'student') dataArray = this.data.students;
    else if (type === 'instructor') dataArray = this.data.instructors;
    else return;

    dataArray.sort((a, b) => {
      let v1 = a[colIdx] || ''; let v2 = b[colIdx] || '';
      if (!isNaN(v1) && !isNaN(v2) && v1 !== '' && v2 !== '') {
        v1 = Number(v1); v2 = Number(v2);
      } else {
        if(typeof v1 === 'string') v1 = v1.toLowerCase();
        if(typeof v2 === 'string') v2 = v2.toLowerCase();
      }
      if (v1 < v2) return isAsc ? 1 : -1;
      if (v1 > v2) return isAsc ? -1 : 1;
      return 0;
    });
    this.renderView(type);
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
        const idx = Array.from(th.parentNode.children).indexOf(th);
        const id = th.closest('.view-section').id + '-col-' + idx;
        
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
          
          th.style.width = `${newPct}%`;
          
          rightThs.forEach(col => {
            const startRightPct = parseFloat(col.getAttribute('data-start-pct'));
            const stealAmount = (startRightPct / totalRightPct) * deltaPct;
            col.style.width = `${startRightPct - stealAmount}%`;
          });
          
          if (!this.resizeTooltip) {
            this.resizeTooltip = document.createElement('div');
            this.resizeTooltip.className = 'resize-tooltip';
            this.resizeTooltip.style.cssText = 'position: fixed; background: rgba(0,0,0,0.8); color: #06b6d4; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: 600; pointer-events: none; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 1px solid rgba(6,182,212,0.3); transition: none;';
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
            col.style.width = `${pct}%`;
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
            dynTh.style.width = `${targetPct}%`;
            const dynIdx = Array.from(dynTh.parentNode.children).indexOf(dynTh);
            const dynId = dynTh.closest('.view-section').id + '-col-' + dynIdx;
            this.silentSave('saveUISettings', { key: dynId, value: `${targetPct}%` });
            this.uiSettings[dynId] = `${targetPct}%`;
          });
          
          const tooltip = document.createElement('div');
          tooltip.className = 'resize-tooltip';
          tooltip.style.cssText = 'position: fixed; background: rgba(16,185,129,0.9); color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; pointer-events: none; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
          tooltip.innerText = `모든 열 너비 일괄 적용 완료!`;
          tooltip.style.left = (e.clientX + 15) + 'px';
          tooltip.style.top = (e.clientY - 30) + 'px';
          document.body.appendChild(tooltip);
          setTimeout(() => tooltip.remove(), 1500);
        });
      }
      // Add right-click for column deletion
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

  renderFlatTable: function(type, dataArray, cols) {
    const tbody = document.getElementById(`tbody-${type}`);
    if (!tbody) return;
    const thead = tbody.previousElementSibling;
    if(thead && thead.querySelector('tr')) {
      let ths = '';
      cols.forEach((c, i) => {
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? (c.idx !== undefined ? c.idx : i+1) : i+1;
        const widthStr = (typeof c === 'object' && c.width) ? `width:${c.width};` : '';
        const fixedClass = (typeof c === 'object' && c.fixed) ? 'fixed-col label-col-header' : '';
        const leftStr = (typeof c === 'object' && c.left) ? `left:${c.left};`: '';
        let displayHeader = this.uiSettings['header_view-' + type + '_' + colIdx] || label;
        if (['학생명', '센터', '학교', '학년', '강사명', '영역', '학급', '사전 평가점수'].includes(label)) {
          displayHeader = app.renderSortableHeader(displayHeader, type, colIdx);
        }
        ths += `<th class="${fixedClass}" style="${widthStr} ${leftStr}"><div onblur="app.onHeaderBlur(this, 'view-' + type, ${colIdx})" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">${displayHeader}</div></th>`;
      });
      thead.querySelector('tr').innerHTML = ths;
    }

    let html = '';
    dataArray.forEach(row => {
      const id = row[0]; html += `<tr data-id="${id}">`;
      for(let i=0; i<cols.length; i++) {
        const c = cols[i];
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? (c.idx !== undefined ? c.idx : i+1) : i+1;
        const isFixed = typeof c === 'object' && c.fixed;
        const leftStr = (typeof c === 'object' && c.left) ? `left:${c.left};`: '';
        const cellClassStr = isFixed ? `class="fixed-col label-col" style="${leftStr}"` : '';
        const val = row[colIdx] || '';
        
        if (label === '일자') {
          const dateTxt = val || '날짜 선택';
          const colorStyle = dateTxt.includes('날짜 선택') ? 'color:var(--text-muted);' : '';
          html += `<td data-col-idx="${colIdx}" ${cellClassStr} style="${leftStr}" data-cell-key="tt_fmt_date_${type}_${id}"><div contenteditable="true" onblur="app.onFlatCellBlur('${type}', this)" style="display:inline-block; outline:none; min-width:40px; ${colorStyle}">${dateTxt}</div> <span class="date-picker-icon" onclick="app.openDatePicker(this.closest('td'))" style="cursor:pointer;" title="달력 열기">📅</span></td>`;
        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusTxt = isDone ? '🟢 완료' : '🟡 진행 중';
          const txtColor = isDone ? '#10b981' : '#ffffff';
          const fw = isDone ? '600' : 'normal';
          html += `<td data-col-idx="${colIdx}" class="status-cell ${isFixed ? 'fixed-col label-col' : ''}" style="text-align:center; cursor:pointer; ${leftStr}" onclick="app.toggleStatus(this.querySelector('span'), '${type}', ${colIdx})"><span style="font-weight:${fw}; color:${txtColor}; font-size:13px; user-select:none; transition:all 0.2s; padding:4px 8px; border-radius:4px;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.05)'" onmouseout="this.style.backgroundColor='transparent'">${statusTxt}</span></td>`;
        } else if (type === 'student' && colIdx === 8) {
          html += `<td ${cellClassStr} data-col-idx="${colIdx}" onclick="app.openClassSelectModal(this)" style="cursor:pointer; text-align:center;">${val}</td>`;
        } else if (type === 'instructor' && colIdx === 2) {
          html += `<td ${cellClassStr} data-col-idx="${colIdx}" onclick="app.openInstructorSelectModal(this, 'area')" style="cursor:pointer; text-align:center;">${val}</td>`;
        } else if (type === 'instructor' && colIdx === 3) {
          let displayVal = val;
          if (val && app.managedSubjects && Array.isArray(app.managedSubjects)) {
            const matchedSub = app.managedSubjects.find(s => s.name === val);
            if (matchedSub && matchedSub.emoji) {
              displayVal = `${matchedSub.emoji} ${val}`;
            }
          }
          html += `<td ${cellClassStr} data-col-idx="${colIdx}" onclick="app.openInstructorSelectModal(this, 'subject')" style="cursor:pointer; text-align:center;">${displayVal}</td>`;
        } else {
          let extraEvents = `onkeydown="app.onKeyDown(event, this)"`;
          let displayVal = val;
          let placeholder = (label === '학생명' || label === '강사명') ? 'placeholder="이름 입력"' : '';
          
          if ((type === 'student' && (colIdx === 5 || colIdx === 6)) || (type === 'instructor' && colIdx === 4)) {
            extraEvents = `onfocus="app.handlePhoneFocus(this)" onkeydown="app.handlePhoneKeydown(event, this)"`;
            placeholder = 'placeholder="숫자 11자리 입력"';
          }
          html += `<td ${cellClassStr} contenteditable="true" data-col-idx="${colIdx}" ${placeholder} onblur="app.onFlatCellBlur('${type}', this)" ${extraEvents}>${displayVal}</td>`;
        }
      }
      html += `</tr>`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
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
          const tr = document.querySelector(`tr[data-id="${currentId}"]`);
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
      newValue = valHtml.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
      if(newValue === '<br>') newValue = '';
    }

    let dataArray, upsertAction, keys;
    if (type === 'preschedule') { dataArray = this.data.preschedules; upsertAction = 'upsertPreSchedule'; keys = ['date', 'content', 'status', 'note']; }
    else if (type === 'student') { dataArray = this.data.students; upsertAction = 'upsertStudent'; keys = ['name', 'center', 'school', 'grade', 'parentPhone', 'studentPhone', 'note', 'class_name', 'pre_score']; }
    else if (type === 'instructor') { dataArray = this.data.instructors; upsertAction = 'upsertInstructor'; keys = ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']; } // 시트컬럼: 강사명, 영역, 과목, 연락처, 지메일, 비고

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
        const tr = document.querySelector(`tr[data-id="${currentId}"]`);
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
      const tbody = document.getElementById(`tbody-${type}`);
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
      let keys = type === 'preschedule' ? ['date', 'content', 'status', 'note'] : (type === 'student' ? ['name', 'center', 'school', 'grade', 'parentPhone', 'studentPhone', 'note', 'class_name', 'pre_score'] : ['instructorName', 'subject', 'subSubject', 'phone', 'email', 'note']);
      let payload = { id: newId };
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
        const m = w.match(/\d+/);
        if (m) maxWeek = Math.max(maxWeek, parseInt(m[0], 10));
      });
      let nextWeek = `${maxWeek + 1}주차`;
      
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

      const payloadArray = tasks.map(t => ({ id: t.rowObj[0], week: nextWeek, subject: t.sub, content: '', note: '' }));
      this.apiPost(action, { payloadArray }).then(res => {
        if (res && res.success) {
          if (res.returnedIds) dataArr.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
          app.renderView(type);
        }
      });
    } else if (type === 'timetable' || type === 'timetable_summary') {
      if (this.dynamicCols.timetable.length === 0) this.dynamicCols.timetable.push('새 학급');
      let nextStart = '', nextEnd = '';
      const tmpDate = 'tmp-' + Date.now() + Math.random().toString(36).substr(2, 5);
      
      let actualInsertIndex = this.data.timetables.length;
      if (insertIndex >= 0 && insertIndex <= this.data.timetables.length) {
        actualInsertIndex = insertIndex;
      }
      
      let i = 0;
      const tasks = [];
      const rowType = (type === 'timetable_summary' || type === 'timetable-summary') ? '요약' : '수업';
      this.dynamicCols.timetable.forEach(cls => {
        const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
        const rowObj = [newId, tmpDate, rowType, nextStart, nextEnd, cls, '', '', '', ''];
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
      
      const payloadArray = tasks.map(t => ({ id: t.rowObj[0], date: tmpDate, type: rowType, start: nextStart, end: nextEnd, className: t.cls, subject: '', instructor: '', note: '' }));
      this.apiPost('upsertMultipleTimetables', { payloadArray }).then(res => {
        if (res && res.success && res.returnedIds) {
          this.data.timetables.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
          const tr = document.querySelector(`tr[data-grp^="${tmpDate}|"]`);
          if (tr) {
            const newIds = this.data.timetables.filter(r => r[1] === tmpDate).map(r => r[0]).join(',');
            tr.setAttribute('data-ids', newIds);
          }
        }
      });
    } else if (type === 'holiday') {
      const tmpDate = 'tmp-' + Date.now() + Math.random().toString(36).substr(2, 5);
      const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      const rowObj = [newId, tmpDate, '휴일', '00:00', '00:00', '전체', '휴일', '', '', ''];
      this.data.timetables.push(rowObj);
      this.apiPost('upsertTimetable', { id: newId, date: tmpDate, type: '휴일', start: '00:00', end: '00:00', className: '전체', subject: '휴일', instructor: '', note: '' }).then(res => {
        if (res.success && res.id) {
          rowObj[0] = res.id;
          const td = document.querySelector(`td[data-date="${tmpDate}"]`);
          if (td) td.setAttribute('data-id', res.id);
        }
      });
      this.renderView('timetable');
    }
  },

  renderCurriculumPivot: function(type = 'curriculum') {
    const isSci = type === 'curriculum_science';
    const viewId = isSci ? 'view-curriculum-science' : 'view-curriculum';
    const table = document.querySelector(`#${viewId} .excel-table`);
    const dynCols = isSci ? this.dynamicCols.curriculum_science : this.dynamicCols.curriculum;
    const dataArr = isSci ? this.data.curriculums_science : this.data.curriculums;

    let weekHeader = this.uiSettings['header_' + viewId + '_0'] || '주차';
    let headHtml = `<thead><tr><th class="label-col-header fixed-col" style="width:5%; left:0;"><div onblur="app.onHeaderBlur(this, '${viewId}', '0')" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">${weekHeader}</div></th>`;
    headHtml += `<th class="label-col-header fixed-col" style="width:5%; left:5%;">회차</th>`;
    dynCols.forEach((sub, i) => {
      const matchedSub = this.managedSubjects.find(s => s.name === sub);
      let dynHeader = this.uiSettings['header_' + viewId + '_' + sub] || sub;
      if (matchedSub && matchedSub.emoji && !dynHeader.includes(matchedSub.emoji)) {
        dynHeader = matchedSub.emoji + ' ' + dynHeader;
      }
      headHtml += `<th data-colname="${sub}"><div onblur="app.onHeaderBlur(this, '${viewId}', '${sub}')" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">${dynHeader}</div></th>`;
    });
    headHtml += `</tr></thead><tbody id="tbody-${isSci ? 'curriculum-science' : 'curriculum'}">`;

    const grps = Array.from(new Set(dataArr.map(r => r[1] + '|' + (r[4] || '') + '|' + r[0]).filter(g => !g.startsWith('|'))));
    
    grps.sort((a, b) => {
      const [weekA, hoichaA] = a.split('|');
      const [weekB, hoichaB] = b.split('|');
      const wA = parseInt(weekA) || 999;
      const wB = parseInt(weekB) || 999;
      if (wA !== wB) return wA - wB;
      const hA = parseInt(hoichaA) || 999;
      const hB = parseInt(hoichaB) || 999;
      return hA - hB;
    });

    const processedGrps = new Set();
    grps.forEach(grp => {
      const [week, hoicha, rowId] = grp.split('|');
      const logicalGrp = week + '|' + hoicha;
      if (processedGrps.has(logicalGrp)) return;
      processedGrps.add(logicalGrp);
      const richWeek = this.uiSettings['curr_wk_' + type + '_' + week] || week;
      headHtml += `<tr data-week="${week}">
      <td class="fixed-col label-col" data-cell-key="tt_fmt_curr_wk_${logicalGrp}" style="font-weight:bold; text-align:center; left:0;" contenteditable="true" onblur="app.updatePivotRowLabel('${type}', '${week}', '${hoicha}', this.innerText.trim())">${richWeek}</td>`;
      const firstRow = dataArr.find(r => r[1] === week && (r[4] || '') === hoicha);
      headHtml += `<td class="fixed-col label-col" data-cell-key="tt_fmt_curr_hc_${logicalGrp}" style="text-align:center; left:5%;" contenteditable="true" data-id="${firstRow ? firstRow[0] : ''}" data-week="${week}" data-sub="hoicha" onblur="app.onCurriculumHoichaBlur(this, '${type}', '${week}', '${hoicha}')">${hoicha}</td>`;
      dynCols.forEach(sub => {
        const row = dataArr.find(r => r[1] === week && r[2] === sub && (r[4] || '') === hoicha);
        const content = row ? row[3] : '';
        const id = row ? row[0] : '';
        let bgStyle = id && this.uiSettings['cell_bg_' + id] ? `background-color:${this.uiSettings['cell_bg_' + id]};` : '';
        headHtml += `<td contenteditable="true" data-cell-key="cell_bg_${id}" data-id="${id}" data-week="${week}" data-sub="${sub}" onblur="app.onCurriculumBlur(this, '${type}')" onkeydown="app.onKeyDown(event, this)" style="${bgStyle}">${content}</td>`;
      });
      headHtml += `</tr>`;
    });
    headHtml += `</tbody>`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
  },

  onCurriculumBlur: function(cell, type = 'curriculum') {
    let newValue = cell.innerText.trim();
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
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

  onCurriculumHoichaBlur: function(cell, type, oldWeek, oldHoicha) {
    let newValue = cell.innerText.trim();
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    if (newValue === (oldHoicha || '')) return;

    const isSci = type === 'curriculum_science';
    const dataArr = isSci ? this.data.curriculums_science : this.data.curriculums;
    const action = isSci ? 'upsertMultipleCurriculumSciences' : 'upsertMultipleCurriculums';

    // 해당 주차의 모든 행에 note 필드를 업데이트하여 회차 저장
    const rows = dataArr.filter(r => r[1] === oldWeek && (r[4] || '') === oldHoicha);
    if (rows.length === 0) return;
    
    const payloadArray = [];
    rows.forEach(r => {
      r[4] = newValue;
      payloadArray.push({ id: r[0], week: r[1], subject: r[2], content: r[3], note: newValue });
    });
    
    // 전체 행을 서버로 업데이트
    this.apiPost(action, { payloadArray }).then(res => {
      if(res && res.success && res.returnedIds) {
        rows.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
        if (res.returnedIds[rows[0][0]]) {
          cell.setAttribute('data-id', res.returnedIds[rows[0][0]]);
        }
      }
    });
  },

  editTimetableClassName: function(oldName) {
    document.getElementById('generic-modal-title').innerText = '반 이름 수정';
    document.getElementById('generic-modal-body').innerHTML = `<div class="form-group"><label>반이름</label><input type="text" id="new-col-input" class="form-control" value="${oldName}"></div>`;
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

  renderTimetablePivot: function(isSummary = false) {
    const tableId = isSummary ? '#view-timetable-summary .excel-table' : '#view-timetable .excel-table';
    const tbodyId = isSummary ? 'tbody-timetable-summary' : 'tbody-timetable';
    const table = document.querySelector(tableId);
    if (!table) return;
    
    const targetData = isSummary ? this.data.timetables.filter(r => r[2] === '요약') : this.data.timetables.filter(r => r[2] !== '요약');
    
    let headHtml = `<thead><tr><th class="label-col-header fixed-col" style="width:12%; left:0;">${isSummary ? '요일' : '일자'}</th>`;
    
    if (!isSummary) {
      headHtml += `<th class="label-col-header fixed-col" style="width:5%; left:12%;">주차</th><th class="label-col-header fixed-col" style="width:5%; left:17%;">회차</th>`;
    }
    
    const startLeft = isSummary ? '12%' : '22%';
    const endLeft = isSummary ? '20%' : '30%';
    
    headHtml += `<th class="label-col-header fixed-col" style="width:8%; left:${startLeft};">시작 시간</th><th class="label-col-header fixed-col" style="width:8%; left:${endLeft};">종료 시간</th>`;
    
    this.dynamicCols.timetable.forEach(cls => {
      headHtml += `<th data-colname="${cls}" onclick="app.editTimetableClassName('${cls}')" style="cursor:pointer;" title="클릭하여 반 이름 수정">${cls}</th>`;
    });
    headHtml += `</tr></thead><tbody id="${tbodyId}">`;

    const rowGroups = Array.from(new Set(targetData.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));
    
    rowGroups.sort((a, b) => {
      const [dateA, , startA] = a.split('|');
      const [dateB, , startB] = b.split('|');
      const cleanA = dateA.replace(/\u200B/g, '').trim();
      const cleanB = dateB.replace(/\u200B/g, '').trim();
      
      if (isSummary) { 
        const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
        const idxA = days.findIndex(d => cleanA.includes(d));
        const idxB = days.findIndex(d => cleanB.includes(d));
        const finalIdxA = idxA !== -1 ? idxA : 99;
        const finalIdxB = idxB !== -1 ? idxB : 99;
        if (finalIdxA !== finalIdxB) return finalIdxA - finalIdxB;
      } else { 
        if (cleanA !== cleanB) {
          if (cleanA.startsWith('tmp-') && !cleanB.startsWith('tmp-')) return 1;
          if (!cleanA.startsWith('tmp-') && cleanB.startsWith('tmp-')) return -1;
          return cleanA.localeCompare(cleanB);
        }
      }
      const sA = startA || '24:00';
      const sB = startB || '24:00';
      return sA.localeCompare(sB);
    });

    rowGroups.forEach(grp => {
      const [date, type, start, end] = grp.split('|');
      const isHoliday = (type === '휴일');
      const isTmpDate = date.startsWith('tmp-');
      const displayDate = isTmpDate ? '' : date;
      let richDate = this.uiSettings['tt_fmt_date_' + grp] || displayDate || (isSummary ? '요일 선택' : '날짜 선택');
      if (richDate.includes('date-picker-icon')) {
        richDate = richDate.replace(/<span class="date-picker-icon"[^>]*>.*?<\/span>/g, '').trim();
      }
      if (richDate === '-- 날짜 선택 --') richDate = isSummary ? '요일 선택' : '날짜 선택';
      
      const idsForGrp = targetData.filter(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end).map(r => r[0]).join(',');
      const colorStyle = (richDate.includes('날짜 선택') || richDate.includes('요일 선택')) ? 'color:var(--text-muted);' : '';
      
      headHtml += `<tr data-ids="${idsForGrp}" data-grp="${grp}">
        <td class="fixed-col label-col" style="text-align:center;" data-cell-key="tt_fmt_date_${grp}"><span class="drag-handle"></span><div contenteditable="true" style="display:inline-block; outline:none; min-width:30px; ${colorStyle}" onblur="app.updatePivotRowDate(this.closest('td'), this.innerText.trim())">${richDate}</div> <span class="date-picker-icon" onclick="${isSummary ? "app.openDayPicker(this.closest('td'))" : "app.openDatePicker(this.closest('td'))"}" style="cursor:pointer;" title="클릭하여 ${isSummary ? '요일' : '달력'} 선택">📅</span></td>`;
      
      const firstRow = targetData.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end);

      if (isHoliday) {
        const holidayRow = targetData.find(r => r[1] === date && r[2] === '휴일');
        const holidayNote = holidayRow ? (holidayRow[8] || '') : '';
        const colspanSize = isSummary ? 2 : 4;
        headHtml += `<td colspan="${colspanSize}" class="fixed-col label-col" data-cell-key="tt_fmt_hol_${grp}" style="text-align:center; left:${startLeft}; color:var(--danger);">🏖️ 휴일</td>`;
        headHtml += `<td colspan="${this.dynamicCols.timetable.length}" class="timetable-cell" data-id="${holidayRow?holidayRow[0]:''}" data-date="${date}" contenteditable="true" onblur="app.onTimetableHolidayBlur(this)" style="text-align:center; background:rgba(255,255,255,0.05); color:var(--text-muted);">${holidayNote || '휴일/특이사항 입력'}</td>`;
      } else {
        const hoicha = firstRow ? (firstRow[8] || '') : '';
        const weekVal = this.uiSettings['tt_week_' + grp] || '';
        
        if (!isSummary) {
          headHtml += `<td class="fixed-col label-col" data-cell-key="tt_fmt_ttwk_${grp}" style="text-align:center; left:12%;" contenteditable="true" onblur="app.updateTimetableWeek(this, '${grp}')">${weekVal}</td>`;
          headHtml += `<td class="fixed-col label-col" data-cell-key="tt_fmt_tthc_${grp}" style="text-align:center; left:17%;" contenteditable="true" onblur="app.updateTimetableHoicha(this, '${grp}')">${hoicha}</td>`;
        }
        
        headHtml += `<td class="fixed-col label-col" style="left:${startLeft}; white-space:nowrap; text-align:center; vertical-align:middle; font-weight:normal;" data-cell-key="tt_fmt_st_${grp}"><div contenteditable="true" onblur="app.updatePivotRowTime(this.closest('td'), 'start', this.innerText.trim())" style="display:inline-block; outline:none; min-width:30px; font-weight:normal;">${start || '00:00'}</div> <span onclick="app.openTimePicker(this.closest('td'), 'start')" style="cursor:pointer;" title="시간 선택">🕒</span></td><td class="fixed-col label-col" style="left:${endLeft}; white-space:nowrap; text-align:center; vertical-align:middle; font-weight:normal;" data-cell-key="tt_fmt_et_${grp}"><div contenteditable="true" onblur="app.updatePivotRowTime(this.closest('td'), 'end', this.innerText.trim())" style="display:inline-block; outline:none; min-width:30px; font-weight:normal;">${end || '00:00'}</div> <span onclick="app.openTimePicker(this.closest('td'), 'end')" style="cursor:pointer;" title="시간 선택">🕒</span></td>`;
        this.dynamicCols.timetable.forEach(cls => {
          const row = targetData.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end && r[5] === cls);
          let subject = row && row[6] ? row[6] : '';
          if (subject) {
            const matchedSub = this.managedSubjects.find(s => s.name === subject);
            if (matchedSub && matchedSub.emoji) subject = matchedSub.emoji + ' ' + subject;
          }
          let displayStr = row && (subject || row[7]) ? `${subject}${row[7]?'('+row[7]+')':''}` : '';
          displayStr = displayStr.trim();
          const id = row ? row[0] : '';
          let bgStyle = 'cursor:pointer;';
          if (id && this.uiSettings['cell_bg_' + id]) bgStyle += ` background-color:${this.uiSettings['cell_bg_' + id]};`;
          headHtml += `<td class="timetable-cell" data-id="${id}" data-cell-key="cell_bg_${id}" data-start="${start}" data-end="${end}" data-cls="${cls}" data-date="${date}" onclick="app.openTimetableEditor(this)" style="${bgStyle}">${displayStr}</td>`;
        });
      }
      headHtml += `</tr>`;
    });
    headHtml += `</tbody>`; table.innerHTML = headHtml;
    const bindType = isSummary ? 'timetable_summary' : 'timetable';
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, bindType));
    this.initResizers();
  },

  updatePivotRowDate: async function(el, newDate) {
    if(!newDate) return;
    const tr = el.closest('tr');
    const oldGrp = tr.getAttribute('data-grp');
    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    
    // 서식 저장 로직 추가 (DB 키인 newDate와 별개로)
    let richText = app.getCleanHTML(el.querySelector('div[contenteditable]') || el);
    richText = richText.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    const newGrp = [newDate, oldType, oldStart, oldEnd].join('|');
    app.silentSave('saveUISettings', { key: 'tt_fmt_date_' + newGrp, value: richText });
    app.uiSettings['tt_fmt_date_' + newGrp] = richText;
    
    if (oldDate === newDate) return;
    
    let uniqueDate = newDate;
    while (this.data.timetables.some(r => r[1] === uniqueDate && r[2] === oldType && String(r[3]) === String(oldStart) && String(r[4]) === String(oldEnd) && r[1] !== oldDate)) {
      uniqueDate += '\u200B';
    }
    newDate = uniqueDate;

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

  updateTimetableWeek: function(cell, grp) {
    let newValue = cell.innerText.trim();
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    if(newValue === '<br>') newValue = '';
    const key = 'tt_week_' + grp;
    if (this.uiSettings[key] !== newValue) {
      this.uiSettings[key] = newValue;
      this.silentSave('saveUISettings', { key, value: newValue });
    }
  },
  
  updateTimetableHoicha: function(cell, grp) {
    let newValue = cell.innerText.trim();
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    const [date, type, start, end] = grp.split('|');
    const rows = this.data.timetables.filter(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end);
    if (rows.length === 0) return;
    
    let isChanged = false;
    rows.forEach(r => { if(r[8] !== newValue) { r[8] = newValue; isChanged = true; } });
    if (!isChanged) return;

    const payloadArray = rows.map(r => ({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] }));
    this.apiPost('upsertMultipleTimetables', { payloadArray }).then(res => {
      if (res && res.success) {
         if (res.returnedIds) rows.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
      } else {
         app.showToast('회차 저장 실패');
      }
    });
  },

  updatePivotRowType: function(oldGrp, newType) {
    if(!newType) return;
    const [oldDate, oldTType, oldStart, oldEnd] = oldGrp.split('|');
    if (oldTType === newType) return;
    
    let uniqueType = newType;
    while (this.data.timetables.some(r => r[1] === oldDate && r[2] === uniqueType && String(r[3]) === String(oldStart) && String(r[4]) === String(oldEnd) && r[2] !== oldTType)) {
      uniqueType += '\u200B';
    }
    newType = uniqueType;

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
    // 자동 포맷: 숫자만 추출 후 HH:MM (24시간) 변환
    if (newTimeStr) {
      const digits = newTimeStr.replace(/\D/g, '');
      if (digits.length > 0) {
        let h, m;
        if (digits.length <= 2) { h = parseInt(digits, 10); m = 0; }
        else if (digits.length === 3) { h = parseInt(digits[0], 10); m = parseInt(digits.substring(1), 10); }
        else { h = parseInt(digits.substring(0, 2), 10); m = parseInt(digits.substring(2, 4), 10); }
        if (h > 23) h = 23;
        if (m > 59) m = 59;
        newTimeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        el.value = newTimeStr;
      }
    }
    if(!newTimeStr) return;
    const tr = el.closest('tr');
    if(!tr) return;
    
    const idsStr = tr.getAttribute('data-ids');
    if(!idsStr) return;
    const ids = idsStr.split(',');

    const oldGrp = tr.getAttribute('data-grp');
    if(!oldGrp) return;
    
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
        r[3] = newStart; r[4] = newEnd;
        rowsToSave.push(r);
      }
    });

    if (rowsToSave.length === 0) return;

    tr.setAttribute('data-grp', newGrp);
    tr.querySelectorAll('.timetable-cell').forEach(c => {
      c.setAttribute('data-start', newStart);
      c.setAttribute('data-end', newEnd);
    });

    const payloadArray = rowsToSave.map(r => ({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] }));
    try {
      const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
      if (res && res.success) {
        if (res.returnedIds) rowsToSave.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
        const newIds = rowsToSave.map(r => r[0]).join(',');
        tr.setAttribute('data-ids', newIds);
      } else {
        app.showToast('저장 실패: ' + (res ? res.message : '알 수 없는 에러'), true);
        rollbackData.forEach(rb => { rb.row[3] = rb.oldStart; rb.row[4] = rb.oldEnd; });
        app.renderView(app.currentView.replace('view-', ''));
      }
    } catch(e) {
      app.showToast('저장 중 예외 발생: ' + e.message, true);
      rollbackData.forEach(rb => { rb.row[3] = rb.oldStart; rb.row[4] = rb.oldEnd; });
      app.renderView(app.currentView.replace('view-', ''));
    }
  },

  onTimetableHolidayBlur: function(cell) {
    let newValue = cell.innerText.trim();
    newValue = newValue.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    if(newValue === '<br>') newValue = '';
    const id = cell.getAttribute('data-id'), date = cell.getAttribute('data-date');
    let rowObj = this.data.timetables.find(r => (id && r[0] === id) || (r[1] === date && r[2] === '휴일'));
    if (rowObj) {
      if (rowObj[8] === newValue) return;
      rowObj[8] = newValue;
    } else {
      const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      rowObj = [newId, date, '휴일', '00:00', '00:00', '전체', '휴일', '', newValue, ''];
      this.data.timetables.push(rowObj);
    }
    
    this.apiPost('upsertTimetable', { id: rowObj[0], date: rowObj[1], type: rowObj[2], start: rowObj[3], end: rowObj[4], className: rowObj[5], subject: rowObj[6], instructor: rowObj[7], note: rowObj[8] }).then(res => {
      if(res.success && res.id) { rowObj[0] = res.id; cell.setAttribute('data-id', res.id); }
    });
  },

  
  openSubjectManagerModal: function() {
    this.renderSubjectManagerList();
    document.getElementById('subject-manager-modal').classList.remove('hidden');
  },
  renderSubjectManagerList: function() {
    const container = document.getElementById('subject-list-container');
    if (!container) return;
    let html = '';
    this.managedSubjects.forEach((sub, idx) => {
      html += `<div style="display:flex; align-items:center; background:rgba(255,255,255,0.1); padding:5px 10px; border-radius:20px; font-size:13px;">
        ${sub.emoji} ${sub.name} <span style="font-size:13px; margin-left:5px; opacity:0.6;">(${sub.category})</span>
        <button style="background:transparent; border:none; color:#ff6b6b; margin-left:8px; cursor:pointer; font-weight:bold;" onclick="app.removeSubject(${idx})">✖</button>
      </div>`;
    });
    container.innerHTML = html;
  },
  addNewSubject: function() {
    const name = document.getElementById('new-subject-name').value.trim();
    const category = document.getElementById('new-subject-category').value;
    if (!name) return alert('과목명을 입력하세요.');
    if (this.managedSubjects.find(s => s.name === name)) return alert('이미 존재하는 과목명입니다.');
    
    // 자동 이모지 매핑 로직 (추론)
    let emoji = '📌';
    if (name.includes('물리')) emoji = '🍎';
    else if (name.includes('화학')) emoji = '🧪';
    else if (name.includes('생명') || name.includes('생물')) emoji = '🧬';
    else if (name.includes('지구')) emoji = '🌍';
    else if (name.includes('기하')) emoji = '📐';
    else if (name.includes('조합') || name.includes('확통')) emoji = '🎲';
    else if (name.includes('대수')) emoji = '🧮';
    else if (name.includes('정수')) emoji = '🔢';
    else if (category === '수학') emoji = '📘';
    else if (category === '과학') emoji = '🔬';

    this.managedSubjects.push({ name, category, emoji });
    this.silentSave('saveUISettings', { key: 'managed_subjects', value: JSON.stringify(this.managedSubjects) });
    document.getElementById('new-subject-name').value = '';
    this.renderSubjectManagerList();
  },
  removeSubject: function(idx) {
    if(confirm(this.managedSubjects[idx].name + ' 과목을 리스트에서 삭제하시겠습니까?\n(이미 등록된 데이터의 이름이 바뀌진 않습니다)')) {
      this.managedSubjects.splice(idx, 1);
      this.silentSave('saveUISettings', { key: 'managed_subjects', value: JSON.stringify(this.managedSubjects) });
      this.renderSubjectManagerList();
    }
  },

  openClassManagerModal: function() {
    this.renderClassManagerList();
    document.getElementById('class-manager-modal').classList.remove('hidden');
  },
  renderClassManagerList: function() {
    const container = document.getElementById('class-list-container');
    if (!container) return;
    let html = '';
    (this.managedClasses || []).forEach((cls, idx) => {
      html += `<div style="display:flex; align-items:center; background:rgba(255,255,255,0.1); padding:5px 10px; border-radius:20px; font-size:13px; margin-bottom:5px;">
        ${cls}
        <button style="background:transparent; border:none; color:#ff6b6b; margin-left:auto; cursor:pointer; font-weight:bold;" onclick="app.removeClass(${idx})">✖</button>
      </div>`;
    });
    container.innerHTML = html;
  },
  addNewClass: function() {
    const name = document.getElementById('new-class-name').value.trim();
    if (!name) return alert('학급명을 입력하세요.');
    if (!this.managedClasses) this.managedClasses = [];
    if (this.managedClasses.includes(name)) return alert('이미 존재하는 학급명입니다.');
    
    this.managedClasses.push(name);
    this.silentSave('saveUISettings', { key: 'managed_classes', value: JSON.stringify(this.managedClasses) });
    document.getElementById('new-class-name').value = '';
    this.renderClassManagerList();
  },
  removeClass: function(idx) {
    if(confirm(this.managedClasses[idx] + ' 학급을 삭제하시겠습니까?\n(이미 등록된 학생의 학급 데이터가 지워지진 않습니다)')) {
      this.managedClasses.splice(idx, 1);
      this.silentSave('saveUISettings', { key: 'managed_classes', value: JSON.stringify(this.managedClasses) });
      this.renderClassManagerList();
    }
  },
  openClassSelectModal: function(td) {
    if (td.querySelector('select')) return;
    const currentVal = td.innerText.trim();
    let optsHtml = '<option value="">선택 안함</option>';
    if (this.managedClasses && Array.isArray(this.managedClasses)) {
      this.managedClasses.forEach(c => {
        optsHtml += `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`;
      });
    }
    td.innerHTML = `<select class="form-control" style="width:100%; height:100%; min-width:80px; background:var(--bg-color, #1f2937); color:var(--text-color, #fff); border:1px solid #4b5563; border-radius:4px;" onblur="this.parentElement.innerText=this.value; app.onFlatCellBlur('student', this.parentElement);" onchange="this.blur();">${optsHtml}</select>`;
    const select = td.querySelector('select');
    select.focus();
  },

  openTimetableEditor: function(td) {
    const id = td.getAttribute('data-id'), start = td.getAttribute('data-start'), end = td.getAttribute('data-end'), cls = td.getAttribute('data-cls'), date = td.getAttribute('data-date');
    let subject = '', instructor = '';
    const rowObj = this.data.timetables.find(r => r[1] === date && r[2] === '수업' && r[3] === start && r[4] === end && r[5] === cls);
    if(rowObj) { subject = rowObj[6]; instructor = rowObj[7]; }

    const instructors = Array.from(new Set(this.data.instructors.map(r => {
      let val = r[1] ? String(r[1]) : '';
      if(val.includes('" style=')) val = val.substring(0, val.indexOf('"')).trim();
      const div = document.createElement('div'); div.innerHTML = val;
      return div.innerText.trim();
    }).filter(Boolean)));
    const subjects = this.managedSubjects.map(s => s.name);

    let instructorOptsStr = `<option value="">선택 안함</option>` + instructors.map(i => `<option value="${i}" ${instructor===i?'selected':''}>${i}</option>`).join('');
    let subjectOptsStr = `<option value="">선택 안함</option>` + this.managedSubjects.map(s => {
      const sel = subject === s.name ? 'selected' : '';
      return `<option value="${s.name}" ${sel}>${s.emoji} ${s.name} (${s.category})</option>`;
    }).join('');

    const existing = document.getElementById('timetable-editor-overlay');
    if (existing) existing.remove();

    const rect = td.getBoundingClientRect();
    const modal = document.createElement('div');
    modal.id = 'timetable-editor-overlay';
    modal.style.position = 'absolute';
    modal.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
    modal.style.top = `${rect.bottom + window.scrollY + 5}px`;
    modal.style.width = '300px';
    modal.style.background = '#1f2937';
    modal.style.border = '1px solid #374151';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.5)';
    modal.style.zIndex = '9999';
    modal.style.padding = '0';
    document.body.appendChild(modal);

    modal.innerHTML = `
      <div class="modal-header">
        <h3 style="margin:0; font-size:16px; color:var(--primary); text-align:left;">${cls} 수업 편집</h3>
        <button class="close-btn" onclick="document.getElementById('timetable-editor-overlay').remove();">&times;</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:15px;">
        <div class="form-group">
          <label>과목</label>
          <select id="tt-edit-subject" class="form-control" style="width:100%;">
            ${subjectOptsStr}
          </select>
        </div>
        <div class="form-group">
          <label>담당자</label>
          <select id="tt-edit-instructor" class="form-control" style="width:100%;">
            ${instructorOptsStr}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="document.getElementById('timetable-editor-overlay').remove();">취소</button>
        <button class="btn btn-primary" onclick="app.saveTimetableEditor('${id}', '${date}', '${start}', '${end}', '${cls}')">저장</button>
      </div>
    `;
  },

  saveTimetableEditor: async function(id, date, start, end, cls) {
    const modal = document.getElementById('timetable-editor-modal');
    if(!modal) return;
    const subject = modal.querySelector('#tt-edit-subject').value;
    const instructor = modal.querySelector('#tt-edit-instructor').value;

    let rowObj = this.data.timetables.find(r => r[1] === date && r[2] === '수업' && r[3] === start && r[4] === end && r[5] === cls);
    const rollbackData = {};
    let isNew = false;
    
    if (!rowObj) {
      const newId = id || 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      rowObj = [newId, date, '수업', start, end, cls, subject, instructor, '', new Date().toLocaleString()];
      this.data.timetables.push(rowObj);
      isNew = true;
    } else {
      rollbackData.oldSubject = rowObj[6];
      rollbackData.oldInstructor = rowObj[7];
      rowObj[6] = subject;
      rowObj[7] = instructor;
    }

    try {
      const res = await this.apiPost('upsertTimetable', { id: rowObj[0], date: rowObj[1], type: rowObj[2], start: rowObj[3], end: rowObj[4], className: rowObj[5], subject: rowObj[6], instructor: rowObj[7], note: rowObj[8] });
      if(res && res.success && res.id) { rowObj[0] = res.id; }
      else {
        if (isNew) { this.data.timetables.pop(); } 
        else { rowObj[6] = rollbackData.oldSubject; rowObj[7] = rollbackData.oldInstructor; }
        app.showToast('저장 실패: ' + (res ? res.message : '알 수 없는 에러'), true);
      }
    } catch(e) {
      if (isNew) { this.data.timetables.pop(); } 
      else { rowObj[6] = rollbackData.oldSubject; rowObj[7] = rollbackData.oldInstructor; }
      app.showToast('저장 중 예외 발생: ' + e.message, true);
    }

    const overlay = document.getElementById('timetable-editor-overlay');
    if(overlay) overlay.remove();
    modal.remove();
    
    this.renderView('timetable');
  },

  updatePivotRowLabel: async function(type, oldLabel, oldHoicha, newLabel) {
    try {
      let cellHtml = app.getCleanHTML(window.event ? window.event.target : document.querySelector(':focus'));
      app.silentSave('saveUISettings', { key: 'curr_wk_' + type + '_' + newLabel, value: cellHtml });
      app.uiSettings['curr_wk_' + type + '_' + newLabel] = cellHtml;
    } catch (e) {}
    newLabel = newLabel.replace(/<span class="drag-handle">.*?<\/span>/g, '').trim();
    if(!newLabel || oldLabel === newLabel) return;
    if(type === 'curriculum' || type === 'curriculum_science') {
      const isSci = type === 'curriculum_science';
      const dataArr = isSci ? this.data.curriculums_science : this.data.curriculums;
      const action = isSci ? 'upsertMultipleCurriculumSciences' : 'upsertMultipleCurriculums';
      const payloadArray = [];
      const rollbackData = [];
      
      let uniqueWeek = newLabel;
      while (dataArr.some(r => r[1] === uniqueWeek && r[1] !== oldLabel)) {
        uniqueWeek += '\u200B';
      }
      newLabel = uniqueWeek;

      dataArr.forEach(r => {
        if(r[1] === oldLabel && (r[4] || '') === oldHoicha) { 
          rollbackData.push({ row: r, oldWeek: r[1] });
          r[1] = newLabel; 
          payloadArray.push({id: r[0], week: newLabel, subject: r[2], content: r[3], note: r[4]});
        }
      });
      if (payloadArray.length > 0) {
        try {
          const res = await this.apiPost(action, { payloadArray });
          if (!res || !res.success) throw new Error(res ? res.message : '알 수 없는 에러');
        } catch(e) {
          app.showToast('저장 실패: ' + e.message, true);
          rollbackData.forEach(rb => { rb.row[1] = rb.oldWeek; rb.row[4] = rb.oldHoicha; });
        }
      }
    }
    this.renderView(type);
  },

  addColumn: function(type) {
    const isCurriculum = (type === 'curriculum' || type === 'curriculum_science');
    const title = isCurriculum ? '새 과목(열) 추가' : '새 반이름(열) 추가';
    document.getElementById('generic-modal-title').innerText = title;
    
    if (isCurriculum) {
      const isSci = type === 'curriculum_science';
      const category = isSci ? '과학' : '수학';
      const filteredSubjects = this.managedSubjects.filter(s => s.category === category);
      let optionsHtml = '<option value="">과목 선택</option>' + filteredSubjects.map(s => `<option value="${s.name}">${s.emoji} ${s.name}</option>`).join('');
      document.getElementById('generic-modal-body').innerHTML = `<div class="form-group"><label>과목 선택 (${category})</label><select id="new-col-input" class="form-control">${optionsHtml}</select></div>`;
    } else {
      if ((this.managedClasses || []).length > 0) {
        let optionsHtml = '<option value="">학급 선택</option>' + this.managedClasses.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        document.getElementById('generic-modal-body').innerHTML = `<div class="form-group"><label>반이름 선택</label><select id="new-col-input" class="form-control">${optionsHtml}</select></div>`;
      } else {
        document.getElementById('generic-modal-body').innerHTML = `<div class="form-group"><label>반이름</label><input type="text" id="new-col-input" class="form-control" placeholder="학급 관리를 통해 반을 등록해주세요" readonly></div>`;
      }
    }
    
    document.getElementById('modal-container').classList.remove('hidden'); document.getElementById('generic-modal').classList.remove('hidden');
    this.currentModalAction = async () => {
      const val = document.getElementById('new-col-input').value.trim();
      if(val) {
        if(type === 'curriculum' || type === 'curriculum_science') {
            const isSci = type === 'curriculum_science';
            const dynCols = isSci ? this.dynamicCols.curriculum_science : this.dynamicCols.curriculum;
            const dataArr = isSci ? this.data.curriculums_science : this.data.curriculums;
            const action = isSci ? 'upsertCurriculumScience' : 'upsertCurriculum';

            if(!dynCols.includes(val)) {
              dynCols.push(val);
              const week = dataArr.length > 0 ? dataArr[0][1] : '1주차';
              const newId = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
              const rowObj = [newId, week, val, '', ''];
              dataArr.push(rowObj);
              try {
                const res = await this.apiPost(action, { id: newId, week, subject: val, content: '', note: '' });
                if(res && res.success) rowObj[0] = res.id;
                else throw new Error(res ? res.message : '알 수 없는 에러');
              } catch(e) {
                app.showToast('저장 실패: ' + e.message, true);
                dynCols.pop();
                dataArr.pop();
              }
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
                if (res && res.success) {
                  if (res.returnedIds) this.data.timetables.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
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
  },

  removeColumn: async function(type, colName) {
    if(!confirm(`'${colName}' 열을 삭제하시겠습니까? (저장된 데이터도 삭제됩니다)`)) return;
    
    if(type === 'curriculum' || type === 'curriculum_science') {
      const isSci = type === 'curriculum_science';
      const sheetName = isSci ? '과학진도계획' : '수업진도계획';
      if (isSci) {
        this.dynamicCols.curriculum_science = this.dynamicCols.curriculum_science.filter(c => c !== colName);
        const toDelete = this.data.curriculums_science.filter(r => r[2] === colName);
        this.data.curriculums_science = this.data.curriculums_science.filter(r => r[2] !== colName);
        const ids = toDelete.map(r => r[0]).filter(Boolean);
        if (ids.length > 0) this.silentSave('deleteMultipleData', { sheetName, ids: ids });
      } else {
        this.dynamicCols.curriculum = this.dynamicCols.curriculum.filter(c => c !== colName);
        const toDelete = this.data.curriculums.filter(r => r[2] === colName);
        this.data.curriculums = this.data.curriculums.filter(r => r[2] !== colName);
        const ids = toDelete.map(r => r[0]).filter(Boolean);
        if (ids.length > 0) this.silentSave('deleteMultipleData', { sheetName, ids: ids });
      }
      this.renderView(type);
    } else if(type === 'timetable' || type === 'timetable_summary' || type === 'timetable-summary') {
      this.dynamicCols.timetable = this.dynamicCols.timetable.filter(c => c !== colName);
      const toDelete = this.data.timetables.filter(r => r[5] === colName);
      this.data.timetables = this.data.timetables.filter(r => r[5] !== colName);
      this.renderView(type);
      const ids = toDelete.map(r => r[0]).filter(Boolean);
      if (ids.length > 0) this.silentSave('deleteMultipleData', { sheetName: '시간표', ids: ids });
    }
  },

  closeModal: function() { document.getElementById('modal-container').classList.add('hidden'); document.getElementById('generic-modal').classList.add('hidden'); },
  saveModalData: function() { if(typeof this.currentModalAction === 'function') this.currentModalAction(); },

  silentSave: function(action, payload) {
    return this.apiPost(action, payload).then(res => {
      if(!res.success) {
        console.error('Silent save failed:', res.message);
        this.showToast('저장 실패: ' + res.message, true);
      } else {
        // this.showToast('저장되었습니다.'); // Optional: uncomment if you want success toasts
      }
      return res;
    });
  },

  showToast: function(msg, isError = false) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-msg';
      toast.style.cssText = 'position:fixed; bottom:20px; right:20px; padding:10px 20px; border-radius:5px; color:white; z-index:9999; font-weight:bold; transition: opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? '#ef4444' : '#10b981';
    toast.innerText = msg;
    toast.style.opacity = '1';
    toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.style.display='none', 300); }, 3000);
  },
  
  deleteItem: async function(type, id, rowEl) {
    if(!confirm("정말 삭제하시겠습니까?")) return;
    
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    if (type === 'preschedule') this.data.preschedules.splice(rowIndex, 1);
    if (type === 'student') this.data.students.splice(rowIndex, 1);
    if (type === 'instructor') this.data.instructors.splice(rowIndex, 1);
    this.renderView(type); 

    if(!id || id === 'null') return;

    let sheetName = type === 'preschedule' ? '사전준비일정' : (type === 'curriculum' ? '수업진도계획' : (type === 'timetable' ? '시간표' : (type === 'student' ? '학생관리' : '강사관리')));
    this.silentSave('deleteData', { sheetName, id });
  },

  // Rich Text Toolbar
  showToolbar: function(x, y) {
    const tb = document.getElementById('rich-toolbar');
    if(!tb) return;
    tb.style.left = `${x}px`; tb.style.top = `${y - 40}px`;
    tb.classList.remove('hidden');
  },
  hideToolbar: function() { const tb = document.getElementById('rich-toolbar'); if(tb) tb.classList.add('hidden'); },
  setCellBgColor: function(color) {
    this.hideContextMenu();
    if (!this.ctxTargetCell) return;
    const td = this.ctxTargetCell;
    const cellKey = td.getAttribute('data-cell-key');
    if (cellKey) {
      const finalColor = color === 'transparent' ? '' : color;
      if (finalColor === '') {
        td.style.removeProperty('background-color');
      } else {
        td.style.setProperty('background-color', finalColor, 'important');
      }
      this.silentSave('saveUISettings', { key: cellKey, value: finalColor });
      this.uiSettings[cellKey] = finalColor;
    } else {
      app.showToast('배경색을 적용할 수 없는 셀입니다.', true);
    }
  },
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

    ctx.style.visibility = 'hidden';
    ctx.classList.remove('hidden');
    const rect = ctx.getBoundingClientRect();
    let px = Math.min(x, window.innerWidth - rect.width - 10);
    let py = Math.min(y, window.innerHeight - rect.height - 10);
    ctx.style.left = `${px}px`; ctx.style.top = `${py}px`;
    ctx.style.visibility = 'visible';
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
  ctxDeleteRow: async function() {
    this.hideContextMenu(); if(!this.ctxTargetRow) return;
    const type = this.ctxTargetType;
    const id = this.ctxTargetRow.getAttribute('data-id');
    
    if (type === 'curriculum' || type === 'curriculum_science') {
      if(!confirm("이 줄에 입력된 모든 데이터가 삭제됩니다. 정말 삭제하시겠습니까?")) return;
      const isSci = type === 'curriculum_science';
      const sheetName = isSci ? '과학진도계획' : '수업진도계획';
      const week = this.ctxTargetRow.getAttribute('data-week');
      if (isSci) {
        const toDelete = this.data.curriculums_science.filter(r => r[1] === week);
        this.data.curriculums_science = this.data.curriculums_science.filter(r => r[1] !== week);
        const ids = toDelete.map(r => r[0]).filter(Boolean);
        if (ids.length > 0) this.silentSave('deleteMultipleData', { sheetName, ids: ids });
      } else {
        const toDelete = this.data.curriculums.filter(r => r[1] === week);
        this.data.curriculums = this.data.curriculums.filter(r => r[1] !== week);
        const ids = toDelete.map(r => r[0]).filter(Boolean);
        if (ids.length > 0) this.silentSave('deleteMultipleData', { sheetName, ids: ids });
      }
      this.renderView(type);
    } else if (type === 'timetable' || type === 'timetable_summary' || type === 'timetable-summary') {
      if(!confirm("이 줄에 입력된 모든 데이터가 삭제됩니다. 정말 삭제하시겠습니까?")) return;
      const grp = this.ctxTargetRow.getAttribute('data-grp');
      if (grp) {
        const [date, tType, start, end] = grp.split('|');
        const toDelete = this.data.timetables.filter(r => r[1] === date && r[2] === tType && String(r[3]) === String(start) && r[4] === end);
        this.data.timetables = this.data.timetables.filter(r => !(r[1] === date && r[2] === tType && String(r[3]) === String(start) && r[4] === end));
        this.renderView('timetable');
        this.renderView('timetable_summary');
        
        const ids = toDelete.map(r => r[0]).filter(Boolean);
        if (ids.length > 0) this.silentSave('deleteMultipleData', { sheetName: '시간표', ids: ids });
      }
    } else {
      this.deleteItem(type, id, this.ctxTargetRow);
    }
  },
  ctxDeleteCol: function() {
    this.hideContextMenu(); if(!this.ctxTargetColName) return;
    this.removeColumn(this.ctxTargetType, this.ctxTargetColName);
  },
  addRowToUI: function(type, targetRow, pos) {
    let insertIndex = -1;
    if (['preschedule', 'student', 'instructor'].includes(type) && targetRow && targetRow.parentElement) {
      insertIndex = Array.from(targetRow.parentElement.children).indexOf(targetRow);
      if (pos === 'below') insertIndex += 1;
    } else if ((type === 'timetable' || type === 'timetable_summary' || type === 'timetable-summary') && targetRow) {
      const grp = targetRow.getAttribute('data-grp');
      if (grp) {
        const [date, tType, start, end] = grp.split('|');
        const firstIdx = this.data.timetables.findIndex(r => r[1] === date && r[2] === tType && r[3] === start && r[4] === end);
        if (firstIdx !== -1) {
          let lastIdx = firstIdx;
          while (lastIdx < this.data.timetables.length && this.data.timetables[lastIdx][1] === date && this.data.timetables[lastIdx][2] === tType && this.data.timetables[lastIdx][3] === start && this.data.timetables[lastIdx][4] === end) {
            lastIdx++;
          }
          insertIndex = pos === 'below' ? lastIdx : firstIdx;
        }
      }
    } else if (type === 'curriculum' && targetRow) {
      const week = targetRow.getAttribute('data-week');
      if (week) {
        const firstIdx = this.data.curriculums.findIndex(r => r[1] === week);
        if (firstIdx !== -1) {
          let lastIdx = firstIdx;
          while (lastIdx < this.data.curriculums.length && this.data.curriculums[lastIdx][1] === week) {
            lastIdx++;
          }
          insertIndex = pos === 'below' ? lastIdx : firstIdx;
        }
      }
    }
    this.addRow(type, insertIndex);
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
