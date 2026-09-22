// Retrieval layer — now multi-teacher. The dataset is still small (a handful
// of teachers at most), so we just send every teacher's full schedule to the
// LLM and let it pick out who the question is about.
const { getAllTeachersFull, normalizeDay } = require("./data");

function detectDay(message) {
  const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "พฤหัสฯ", "พฤหัส", "ศุกร์"];
  for (const d of days) {
    if (message.includes(d)) return normalizeDay(d);
  }
  return null;
}

const ROOM_RE = /\b(com\d{3}|COM\d{3}|ห้อง\s?\d{2,3}|\b\d{3}\b)\b/i;
function detectRoom(message) {
  const m = message.match(ROOM_RE);
  return m ? m[0].replace(/ห้อง\s?/, "") : null;
}

// Thai weekday name for a JS Date's getDay() index (0 = Sunday).
const THAI_DAY_BY_INDEX = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์"];

// Current date/time in Asia/Bangkok, regardless of the server's own timezone.
function getBangkokNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayShort = get("weekday"); // e.g. "Mon"
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort);

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    day_of_week_th: THAI_DAY_BY_INDEX[weekdayIndex] || null,
    day_of_week_index: weekdayIndex, // 0=Sun..6=Sat, matches the array above
  };
}

// Builds the context object that gets serialized into the LLM prompt.
// Includes every teacher's full schedule plus the current Bangkok date/time
// so the model can resolve relative-day questions itself.
async function buildContext(message) {
  const teachers = await getAllTeachersFull();
  const day = detectDay(message);
  const room = detectRoom(message);

  const context = {
    now: getBangkokNow(),
    teachers: teachers.map((t) => ({
      name: t.name,
      department: t.department,
      education: t.education,
      special_duty: t.special_duty,
      subjects: t.subjects,
      totals: t.totals,
      periods: t.periods,
    })),
  };

  if (day || room) {
    context.filtered_hint = { day, room };
  }

  return context;
}

module.exports = { buildContext, detectDay, detectRoom, getBangkokNow };
