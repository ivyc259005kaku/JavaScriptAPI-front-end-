/* ======================================================
   calendar-vue.js — Vue 3 + Google Calendar API 連携
   ビルド不要(CDN版Vueで動作)
   ====================================================== */

const CALENDAR_CONFIG = {
  apiKey:     'AIzaSyAu-PBSfK2rN9_F9gPGzVf5Zjpcwpm7wzU',
  calendarId: 'c_7820af2c9ba71eb58b5b387db5c371043bbf75a5c41000aec6378fc7f6c01b6c@group.calendar.google.com',
};

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const WEEK_NAMES  = ['日','月','火','水','木','金','土'];

const CalendarApp = {
  data() {
    const today = new Date();
    return {
      today,
      currentYear:  today.getFullYear(),
      currentMonth: today.getMonth(),
      monthNames:   MONTH_NAMES,
      weekNames:    WEEK_NAMES,
      events:       [],
      statusMsg:    '',
      errorMsg:     '',
      selectedEvent: null,   // クリックされた予定(ポップアップ表示用)
    };
  },

  computed: {
    years() {
      const y = this.today.getFullYear();
      return Array.from({ length: 5 }, (_, i) => y - 2 + i);
    },
    // カレンダーの週×曜日の2次元配列を、eventsが変わるたびに自動で作り直す
    calendarRows() {
      const year  = this.currentYear;
      const month = this.currentMonth;
      const todayStr = this.toDateStr(this.today);
      const firstDay = new Date(year, month, 1).getDay();
      const lastDate = new Date(year, month + 1, 0).getDate();

      const eventMap = {};
      this.events.forEach((ev) => {
        const ds = (ev.start.date || ev.start.dateTime || '').slice(0, 10);
        if (!eventMap[ds]) eventMap[ds] = [];
        eventMap[ds].push(ev);
      });

      const rows = [];
      let day = 1;
      const total = Math.ceil((firstDay + lastDate) / 7) * 7;
      let row = [];
      for (let i = 0; i < total; i++) {
        const dow = i % 7;
        if (i < firstDay || day > lastDate) {
          row.push({ empty: true, dow });
        } else {
          const ds = this.toDateStr(new Date(year, month, day));
          row.push({
            empty: false,
            day, dow, ds,
            isToday: ds === todayStr,
            events: eventMap[ds] || [],
          });
          day++;
        }
        if ((i + 1) % 7 === 0) { rows.push(row); row = []; }
      }
      return rows;
    },
  },

  mounted() {
    this.renderCalendar();
  },

  methods: {
    async renderCalendar() {
      this.statusMsg = '読み込み中…';
      this.errorMsg  = '';
      const year  = this.currentYear;
      const month = this.currentMonth;
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const url = 'https://www.googleapis.com/calendar/v3/calendars/'
        + encodeURIComponent(CALENDAR_CONFIG.calendarId) + '/events'
        + '?key=' + CALENDAR_CONFIG.apiKey
        + '&timeMin=' + encodeURIComponent(timeMin)
        + '&timeMax=' + encodeURIComponent(timeMax)
        + '&singleEvents=true&orderBy=startTime&maxResults=50';

      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('APIエラー: ' + r.status);
        const d = await r.json();
        this.events = d.items || [];
        this.statusMsg = '';
      } catch (e) {
        this.events = [];
        this.statusMsg = '';
        this.errorMsg = e.message;
      }
    },

    toDateStr(d) {
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    },
    colClass(dow) { return dow===0 ? 'col-sun' : dow===6 ? 'col-sat' : ''; },
    dowClass(dow) { return dow===0 ? 'sun' : dow===6 ? 'sat' : ''; },
    pillClass(summary) {
      const s = summary || '';
      if (s.includes('休') || s.includes('中止')) return 'type-closed';
      if (s.includes('審査') || s.includes('演武') || s.includes('大会')) return 'type-event';
      return 'type-gcal';
    },

    // ── 予定クリック時のポップアップ ──
    openEvent(ev) {
      this.selectedEvent = ev;
    },
    closeEvent() {
      this.selectedEvent = null;
    },
    formatEventDate(ev) {
      if (!ev) return '';
      if (ev.start.dateTime) {
        const s = new Date(ev.start.dateTime);
        const e = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : null;
        const dateStr = s.getFullYear() + '年' + (s.getMonth()+1) + '月' + s.getDate() + '日(' + WEEK_NAMES[s.getDay()] + ')';
        const timeStr = String(s.getHours()).padStart(2,'0') + ':' + String(s.getMinutes()).padStart(2,'0')
          + (e ? ' 〜 ' + String(e.getHours()).padStart(2,'0') + ':' + String(e.getMinutes()).padStart(2,'0') : '');
        return dateStr + '　' + timeStr;
      }
      if (ev.start.date) {
        const s = new Date(ev.start.date + 'T00:00:00');
        return s.getFullYear() + '年' + (s.getMonth()+1) + '月' + s.getDate() + '日(' + WEEK_NAMES[s.getDay()] + ')　終日';
      }
      return '';
    },
  },
};

Vue.createApp(CalendarApp).mount('#cal-app');
