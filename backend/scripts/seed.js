// One-time migration: load backend/data/schedules.json (the old single-file
// dataset for อาจารย์ไมตรี นาโพธิ์) into Supabase via the same upsert path the
// cleansing page uses. Run with: node scripts/seed.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { upsertTeacherFull } = require("../lib/data");

async function main() {
  const filePath = path.join(__dirname, "..", "data", "schedules.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const t = raw.teacher;

  const payload = {
    id: t.id,
    name: t.name,
    department: t.department,
    education: t.education,
    special_duty: t.special_duty,
    totals: t.totals,
    subjects: t.subjects,
    periods: t.periods,
  };

  const saved = await upsertTeacherFull(payload);
  console.log(`Seeded "${saved.name}": ${saved.subjects.length} subjects, ${saved.periods.length} periods`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
