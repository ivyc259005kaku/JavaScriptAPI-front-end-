<script setup>
import { ref, onMounted } from 'vue'

const CALENDAR_CONFIG = {
  apiKey: 'AIzaSyAu-PBSfK2rN9_F9gPGzVf5Zjpcwpm7wzU',
  calendarId: 'c_7820af2c9ba71eb58b5b387db5c371043bbf75a5c41000aec6378fc7f6c01b6c@group.calendar.google.com',
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const today = new Date()

const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const calendarRows = ref([])
const statusMsg    = ref('')
const errorMsg     = ref('')

const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i)

function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}
function colClass(dow) { return dow===0?'col-sun':dow===6?'col-sat':'' }
function dowClass(dow) { return dow===0?'sun':dow===6?'sat':'' }
function pillClass(s) {
  if (s.includes('休') || s.includes('中止')) return 'type-closed'
  if (s.includes('審査') || s.includes('演武') || s.includes('大会')) return 'type-event'
  return 'type-gcal'
}

async function fetchEvents(year, month) {
  statusMsg.value = '読み込み中…'
  errorMsg.value  = ''
  const timeMin = new Date(year, month, 1).toISOString()
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  const url = 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(CALENDAR_CONFIG.calendarId) + '/events'
    + '?key=' + CALENDAR_CONFIG.apiKey
    + '&timeMin=' + encodeURIComponent(timeMin)
    + '&timeMax=' + encodeURIComponent(timeMax)
    + '&singleEvents=true&orderBy=startTime&maxResults=50'
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error('APIエラー: ' + r.status)
    const d = await r.json()
    statusMsg.value = ''
    return d.items || []
  } catch(e) {
    statusMsg.value = ''
    errorMsg.value  = e.message
    return []
  }
}

async function renderCalendar() {
  const year  = currentYear.value
  const month = currentMonth.value
  const events = await fetchEvents(year, month)
  const todayStr = toDateStr(today)
  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()

  const eventMap = {}
  events.forEach(ev => {
    const ds = (ev.start.date || ev.start.dateTime || '').slice(0, 10)
    if (!eventMap[ds]) eventMap[ds] = []
    eventMap[ds].push(ev)
  })

  const rows = []
  let day = 1
  const total = Math.ceil((firstDay + lastDate) / 7) * 7
  let row = []
  for (let i = 0; i < total; i++) {
    const dow = i % 7
    if (i < firstDay || day > lastDate) {
      row.push({ empty: true, dow })
    } else {
      const ds = toDateStr(new Date(year, month, day))
      row.push({
        empty: false,
        day,
        dow,
        ds,
        isToday: ds === todayStr,
        events: eventMap[ds] || []
      })
      day++
    }
    if ((i + 1) % 7 === 0) {
      rows.push(row)
      row = []
    }
  }
  calendarRows.value = rows
}

onMounted(() => renderCalendar())
</script>

<template>
  <div class="card">
    <h2 class="section-title">稽古カレンダー</h2>

    <!-- 年月セレクト -->
    <div class="cal-controls">
      <select v-model="currentYear" @change="renderCalendar" class="cal-select">
        <option v-for="y in years" :key="y" :value="y">{{ y }}年</option>
      </select>
      <select v-model="currentMonth" @change="renderCalendar" class="cal-select">
        <option v-for="(m, i) in MONTH_NAMES" :key="i" :value="i">{{ m }}</option>
      </select>
      <span class="cal-status">{{ statusMsg }}</span>
    </div>

    <!-- エラー -->
    <div v-if="errorMsg" class="cal-error">
      {{ errorMsg }}
      <button class="cal-retry-btn" @click="renderCalendar">再試行</button>
    </div>

    <!-- カレンダー表 -->
    <div class="cal-table-wrap">
      <table class="cal-table">
        <thead>
          <tr>
            <th class="sun">日</th>
            <th>月</th>
            <th>火</th>
            <th>水</th>
            <th>木</th>
            <th>金</th>
            <th class="sat">土</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in calendarRows" :key="ri">
            <td v-for="(cell, ci) in row" :key="ci"
                :class="[colClass(cell.dow), cell.empty ? 'other-month' : '']">
              <template v-if="!cell.empty">
                <span class="cal-day-num"
                      :class="cell.isToday ? 'today' : dowClass(cell.dow)">
                  {{ cell.day }}
                </span>
                <span v-for="(ev, ei) in cell.events" :key="ei"
                      class="cal-pill"
                      :class="pillClass(ev.summary || '')">
                  {{ ev.summary }}
                </span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
</style>