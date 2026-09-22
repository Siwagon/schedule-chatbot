const express = require("express");
const router = express.Router();
const data = require("../lib/data");
const { answerQuestion } = require("../lib/llm");
const { cleanseSchedule } = require("../lib/cleanse");

function handleDbError(res, err, action) {
  if (err.code === "NO_SUPABASE_CONFIG") {
    return res.status(500).json({
      error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ยังไม่ได้ตั้งค่าบน backend",
    });
  }
  console.error(`${action} error:`, err);
  return res.status(500).json({ error: `เกิดข้อผิดพลาดขณะ${action}`, detail: String(err.message || err) });
}

// GET /api/teacher -> full schedule of every teacher in the dataset
// (single object if there's exactly one, array otherwise)
router.get("/teacher", async (req, res) => {
  try {
    const teachers = await data.getAllTeachersFull();
    res.json(teachers.length === 1 ? teachers[0] : teachers);
  } catch (err) {
    handleDbError(res, err, "ดึงข้อมูลอาจารย์");
  }
});

// GET /api/teachers/search?q=ไมตรี -> fuzzy match on name, full schedule per match
router.get("/teachers/search", async (req, res) => {
  const q = req.query.q || "";
  try {
    const matches = await data.findTeachers(q);
    res.json(matches);
  } catch (err) {
    handleDbError(res, err, "ค้นหาอาจารย์");
  }
});

// GET /api/periods?day=จันทร์&room=COM602&subject=เว็บ&teacherId=...
router.get("/periods", async (req, res) => {
  const { day, room, subject, teacherId } = req.query;
  try {
    const results = await data.searchPeriods({ day, room, subjectQuery: subject, teacherId });
    res.json(results);
  } catch (err) {
    handleDbError(res, err, "ค้นหาคาบเรียน");
  }
});

// POST /api/chat  { message: string, history?: [{role, content}] }
router.post("/chat", async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "field 'message' (string) is required" });
  }
  try {
    const result = await answerQuestion(message, Array.isArray(history) ? history : []);
    res.json({ reply: result.text });
  } catch (err) {
    if (err.code === "NO_API_KEY") {
      return res.status(500).json({
        error: "GEMINI_API_KEY ยังไม่ได้ตั้งค่าบน backend (ดู backend/.env.example)",
      });
    }
    if (err.code === "NO_SUPABASE_CONFIG") {
      return res.status(500).json({
        error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ยังไม่ได้ตั้งค่าบน backend",
      });
    }
    console.error("chat error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดขณะเรียก Gemini API", detail: String(err.message || err) });
  }
});

// POST /api/cleanse  { image: base64 string, mimeType?: string }
// Reads a schedule photo with Gemini and returns structured JSON for preview
// (does NOT write to the database — that happens via POST /api/teachers).
router.post("/cleanse", async (req, res) => {
  const { image, mimeType } = req.body || {};
  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "field 'image' (base64 string) is required" });
  }
  try {
    const result = await cleanseSchedule(image, mimeType);
    res.json(result);
  } catch (err) {
    if (err.code === "NO_API_KEY") {
      return res.status(500).json({
        error: "GEMINI_API_KEY ยังไม่ได้ตั้งค่าบน backend (ดู backend/.env.example)",
      });
    }
    console.error("cleanse error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดขณะอ่านรูปด้วย AI", detail: String(err.message || err) });
  }
});

// POST /api/teachers  — save/replace one teacher's full schedule in Supabase
// body shape: { id, name, department?, education?, special_duty?, totals?, subjects: [...], periods: [...] }
router.post("/teachers", async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.id || !payload.name) {
    return res.status(400).json({ error: "ต้องมี field 'id' และ 'name' ของอาจารย์" });
  }
  try {
    const saved = await data.upsertTeacherFull(payload);
    res.json(saved);
  } catch (err) {
    handleDbError(res, err, "บันทึกข้อมูลลง Supabase");
  }
});

module.exports = router;
