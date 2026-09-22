// Data access layer backed by Supabase (multi-teacher schedule data).
const { getClient } = require("./supabase");

// Thai day name normalization: accepts common short/alternate spellings.
const DAY_ALIASES = {
  "จันทร์": "จันทร์", "จ": "จันทร์", "mon": "จันทร์", "monday": "จันทร์",
  "อังคาร": "อังคาร", "อ": "อังคาร", "tue": "อังคาร", "tuesday": "อังคาร",
  "พุธ": "พุธ", "พ": "พุธ", "wed": "พุธ", "wednesday": "พุธ",
  "พฤหัส": "พฤหัสฯ", "พฤหัสฯ": "พฤหัสฯ", "พฤหัสบดี": "พฤหัสฯ", "พฤ": "พฤหัสฯ",
  "thu": "พฤหัสฯ", "thursday": "พฤหัสฯ",
  "ศุกร์": "ศุกร์", "ศ": "ศุกร์", "fri": "ศุกร์", "friday": "ศุกร์",
};

function normalizeDay(input) {
  if (!input) return null;
  const key = input.trim().toLowerCase();
  return DAY_ALIASES[key] || DAY_ALIASES[input.trim()] || null;
}

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

function mapSubject(s) {
  return {
    code: s.code,
    name: s.name,
    theory_hours: s.theory_hours,
    practice_hours: s.practice_hours,
    credits: s.credits,
    total_hours: s.total_hours,
  };
}

function mapPeriod(p, includeName) {
  const out = {
    day: p.day,
    start_time: p.start_time,
    end_time: p.end_time,
    type: p.type,
    subject_code: p.subject_code,
    room: p.room,
    group: p.group_name,
    student_count: p.student_count,
  };
  if (includeName) out.name = p.teachers?.name;
  return out;
}

async function listTeachers() {
  const sb = getClient();
  const { data, error } = await sb.from("teachers").select("id,name,department");
  if (error) throw error;
  return data;
}

async function getTeacherFull(id) {
  const sb = getClient();
  const [teacherRes, subjectsRes, periodsRes] = await Promise.all([
    sb.from("teachers").select("*").eq("id", id).single(),
    sb.from("subjects").select("*").eq("teacher_id", id),
    sb.from("periods").select("*").eq("teacher_id", id),
  ]);
  if (teacherRes.error) throw teacherRes.error;
  if (subjectsRes.error) throw subjectsRes.error;
  if (periodsRes.error) throw periodsRes.error;

  const t = teacherRes.data;
  return {
    id: t.id,
    name: t.name,
    department: t.department,
    education: t.education,
    special_duty: t.special_duty,
    totals: t.totals,
    subjects: subjectsRes.data.map(mapSubject),
    periods: periodsRes.data.map((p) => mapPeriod(p, false)),
  };
}

async function getAllTeachersFull() {
  const teachers = await listTeachers();
  return Promise.all(teachers.map((t) => getTeacherFull(t.id)));
}

// Fuzzy contains-match on name.
async function findTeachers(query) {
  const q = norm(query);
  if (!q) return [];
  const sb = getClient();
  const { data, error } = await sb.from("teachers").select("id,name").ilike("name", `%${query}%`);
  if (error) throw error;
  return Promise.all(data.map((t) => getTeacherFull(t.id)));
}

// Search periods with optional filters, across all teachers unless teacherId is given.
async function searchPeriods({ day, room, subjectQuery, teacherId } = {}) {
  const sb = getClient();
  let q = sb.from("periods").select("*, teachers(name)");
  if (teacherId) q = q.eq("teacher_id", teacherId);

  const dayNorm = normalizeDay(day);
  if (dayNorm) q = q.eq("day", dayNorm);

  const { data, error } = await q;
  if (error) throw error;

  const roomQ = norm(room);
  const subjQ = norm(subjectQuery);

  return data
    .filter((p) => !roomQ || norm(p.room).includes(roomQ))
    .filter((p) => !subjQ || norm(p.subject_code).includes(subjQ))
    .map((p) => mapPeriod(p, true));
}

// Replaces a teacher's subjects+periods wholesale — used by the cleansing/save flow.
async function upsertTeacherFull(payload) {
  const sb = getClient();

  const { error: tErr } = await sb.from("teachers").upsert({
    id: payload.id,
    name: payload.name,
    department: payload.department || null,
    education: payload.education || null,
    special_duty: payload.special_duty || null,
    totals: payload.totals || null,
  });
  if (tErr) throw tErr;

  const { error: delSubjErr } = await sb.from("subjects").delete().eq("teacher_id", payload.id);
  if (delSubjErr) throw delSubjErr;
  const { error: delPerErr } = await sb.from("periods").delete().eq("teacher_id", payload.id);
  if (delPerErr) throw delPerErr;

  if (Array.isArray(payload.subjects) && payload.subjects.length) {
    const { error } = await sb.from("subjects").insert(
      payload.subjects.map((s) => ({
        teacher_id: payload.id,
        code: s.code,
        name: s.name,
        theory_hours: s.theory_hours ?? null,
        practice_hours: s.practice_hours ?? null,
        credits: s.credits ?? null,
        total_hours: s.total_hours ?? null,
      }))
    );
    if (error) throw error;
  }

  if (Array.isArray(payload.periods) && payload.periods.length) {
    const { error } = await sb.from("periods").insert(
      payload.periods.map((p) => ({
        teacher_id: payload.id,
        day: normalizeDay(p.day) || p.day,
        start_time: p.start_time,
        end_time: p.end_time,
        type: p.type || null,
        subject_code: p.subject_code,
        room: p.room || null,
        group_name: p.group || null,
        student_count: p.student_count ?? null,
      }))
    );
    if (error) throw error;
  }

  return getTeacherFull(payload.id);
}

module.exports = {
  listTeachers,
  getTeacherFull,
  getAllTeachersFull,
  findTeachers,
  searchPeriods,
  upsertTeacherFull,
  normalizeDay,
};
