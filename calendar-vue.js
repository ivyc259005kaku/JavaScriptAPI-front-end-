const CALENDAR_CONFIG = {
  apiKey:     'AIzaSyAu-PBSfK2rN9_F9gPGzVf5Zjpcwpm7wzU',
  calendarId: 'c_7820af2c9ba71eb58b5b387db5c371043bbf75a5c41000aec6378fc7f6c01b6c@group.calendar.google.com',
};

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const WEEK_NAMES  = ['日','月','火','水','木','金','土'];
const WEATHER_CODES = {
  0:'快晴',1:'晴れ',2:'一部曇り',3:'曇り',
  45:'霧',48:'霧',
  51:'小雨',53:'雨',55:'強雨',
  61:'小雨',63:'雨',65:'強雨',
  71:'小雪',73:'雪',75:'大雪',
  80:'にわか雨',81:'にわか雨',82:'強いにわか雨',
  95:'雷雨',96:'雷雨',99:'激しい雷雨',
};
const WEATHER_ICONS = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',
  45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌧️',55:'🌧️',
  61:'🌦️',63:'🌧️',65:'🌧️',
  71:'🌨️',73:'❄️',75:'❄️',
  80:'🌦️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️',
};

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
      selectedEvent: null,
      weather: null,        // 今日の天気
      weatherError: '',
    };
  },

  computed: {
    years() {
      const y = this.today.getFullYear();
      return Array.from({ length: 5 }, (_, i) => y - 2 + i);
    },
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
            empty: false, day, dow, ds,
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
    this.fetchWeather();
  },

  methods: {
    // ── Google Calendar API ──
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

    // ── Open-Meteo 天気API（宇佐市）──
    async fetchWeather() {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast'
          + '?latitude=33.53&longitude=131.36'
          + '&current=temperature_2m,weathercode'
          + '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
          + '&timezone=Asia%2FTokyo&forecast_days=7';
        const r = await fetch(url);
        if (!r.ok) throw new Error('天気APIエラー');
        const d = await r.json();
        this.weather = {
          temp: Math.round(d.current.temperature_2m),
          code: d.current.weathercode,
          daily: d.daily.time.map((date, i) => ({
            date,
            code: d.daily.weathercode[i],
            max:  Math.round(d.daily.temperature_2m_max[i]),
            min:  Math.round(d.daily.temperature_2m_min[i]),
            rain: d.daily.precipitation_probability_max[i],
          })),
        };
      } catch (e) {
        this.weatherError = e.message;
      }
    },

    weatherIcon(code) { return WEATHER_ICONS[code] || '🌡️'; },
    weatherLabel(code) { return WEATHER_CODES[code] || '不明'; },
    formatDate(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return (d.getMonth()+1) + '/' + d.getDate() + '(' + WEEK_NAMES[d.getDay()] + ')';
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
    openEvent(ev) { this.selectedEvent = ev; },
    closeEvent()  { this.selectedEvent = null; },
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