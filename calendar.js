/* ======================================================
   calendar.js — Google Calendar API 連携
   ダウンロード後、このファイルを「calendar.js」にリネームしてください
   ======================================================

   【設定方法】
   CALENDAR_CONFIG の apiKey と calendarId を書き換えるだけでOKです

   ====================================================== */
const CALENDAR_CONFIG = {
  apiKey:     'AIzaSyAu-PBSfK2rN9\_F9gPGzVf5Zjpcwpm7wzU',   /* ← Google Cloud で発行した APIキー */
  calendarId: 'c\_7820af2c9ba71eb58b5b387db5c371043bbf75a5c41000aec6378fc7f6c01b6c@group.calendar.google.com',   /* ← カレンダーID（xxx@group.calendar.google.com） */
};

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const today = new Date();
let currentYear  = today.getFullYear();
let currentMonth = today.getMonth();

document.addEventListener('DOMContentLoaded', function () {
  buildSelects();
  renderCalendar(currentYear, currentMonth);
});

function buildSelects() {
  const yearSel  = document.getElementById('cal-year');
  const monthSel = document.getElementById('cal-month');
  if (!yearSel || !monthSel) return;
  for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '年';
    if (y === currentYear) opt.selected = true;
    yearSel.appendChild(opt);
  }
  MONTH_NAMES.forEach(function (m, i) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m;
    if (i === currentMonth) opt.selected = true;
    monthSel.appendChild(opt);
  });
  yearSel.addEventListener('change', function () { currentYear = parseInt(this.value); renderCalendar(currentYear, currentMonth); });
  monthSel.addEventListener('change', function () { currentMonth = parseInt(this.value); renderCalendar(currentYear, currentMonth); });
}

function renderCalendar(year, month) {
  const hasConfig = CALENDAR_CONFIG.apiKey && CALENDAR_CONFIG.calendarId;
  if (hasConfig) {
    fetchEvents(year, month, function (events, error) {
      drawGrid(year, month, events || []);
      if (error) showError(error);
    });
  } else {
    showSetupGuide();
    drawGrid(year, month, []);
  }
}

function drawGrid(year, month, events) {
  const tbody    = document.getElementById('cal-body');
  const todayStr = toDateStr(today);
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const eventMap = {};
  events.forEach(function (ev) {
    const ds = (ev.start.date || ev.start.dateTime || '').slice(0, 10);
    if (!eventMap[ds]) eventMap[ds] = [];
    eventMap[ds].push(ev);
  });
  let html = '';
  let day = 1;
  const total = Math.ceil((firstDay + lastDate) / 7) * 7;
  for (let i = 0; i < total; i++) {
    if (i % 7 === 0) html += '<tr>';
    const dow = i % 7;
    if (i < firstDay || day > lastDate) {
      html += '<td class="other-month ' + colClass(dow) + '"><span class="cal-day-num"></span></td>';
      if (i >= firstDay) day++;
    } else {
      const ds = toDateStr(new Date(year, month, day));
      const isToday = ds === todayStr;
      const evs = eventMap[ds] || [];
      html += '<td class="' + colClass(dow) + '">';
      html += '<span class="cal-day-num ' + (isToday ? 'today' : dowClass(dow)) + '">' + day + '</span>';
      evs.forEach(function (ev) {
        const t = (ev.summary || '').replace(/</g, '&lt;');
        html += '<span class="cal-pill ' + pillClass(ev.summary || '') + '">' + t + '</span>';
      });
      html += '</td>';
      day++;
    }
    if ((i + 1) % 7 === 0) html += '</tr>';
  }
  tbody.innerHTML = html;
}

function fetchEvents(year, month, callback) {
  document.getElementById('cal-status').textContent = '読み込み中…';
  hideError();
  const timeMin = new Date(year, month, 1).toISOString();
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const url = 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(CALENDAR_CONFIG.calendarId) + '/events'
    + '?key=' + CALENDAR_CONFIG.apiKey
    + '&timeMin=' + encodeURIComponent(timeMin)
    + '&timeMax=' + encodeURIComponent(timeMax)
    + '&singleEvents=true&orderBy=startTime&maxResults=50';
  fetch(url)
    .then(function (r) { if (!r.ok) throw new Error('APIエラー: ' + r.status); return r.json(); })
    .then(function (d) { document.getElementById('cal-status').textContent = ''; callback(d.items || [], null); })
    .catch(function (e) { document.getElementById('cal-status').textContent = ''; callback([], e.message); });
}

function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function colClass(dow) { return dow===0?'col-sun':dow===6?'col-sat':''; }
function dowClass(dow) { return dow===0?'sun':dow===6?'sat':''; }
function pillClass(s) {
  if (s.includes('休') || s.includes('中止')) return 'type-closed';
  if (s.includes('審査') || s.includes('演武') || s.includes('大会')) return 'type-event';
  return 'type-gcal';
}
function showStatus(m) { const e=document.getElementById('cal-status'); if(e) e.textContent=m; }
function showError(m) {
  const e=document.getElementById('cal-error'); const me=document.getElementById('cal-error-msg');
  if(e) e.style.display='flex'; if(me) me.textContent=m;
}
function hideError() { const e=document.getElementById('cal-error'); if(e) e.style.display='none'; }
function retryCalendar() { renderCalendar(currentYear, currentMonth); }
function showSetupGuide() {
  const g=document.getElementById('setup-guide'); const b=document.getElementById('cal-demo-badge');
  if(g) g.style.display='block'; if(b) b.style.display='inline-block';
}
function toggleGuide(btn) {
  const body=document.getElementById('guide-body');
  const open=btn.getAttribute('aria-expanded')==='true';
  btn.setAttribute('aria-expanded',String(!open));
  if(body) body.classList.toggle('open',!open);
}

