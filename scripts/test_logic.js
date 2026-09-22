// Quick functional smoke test for lib/data.js and lib/retrieval.js
// (these two files have zero npm dependencies, so we can run them directly
// without `npm install`, unlike server.js/routes which need express etc.)
const data = require("../backend/lib/data");
const retrieval = require("../backend/lib/retrieval");

function section(title) {
  console.log("\n=== " + title + " ===");
}

section("getTeacher()");
const t = data.getTeacher();
console.log("name:", t.name, "| periods:", t.periods.length, "| subjects:", t.subjects.length);

section("findTeachers('ไมตรี')");
console.log(data.findTeachers("ไมตรี").map((x) => x.name));

section("findTeachers('คนอื่น') — expect []");
console.log(data.findTeachers("คนอื่น"));

section("searchPeriods({day:'จันทร์', room:'COM602'})");
console.log(data.searchPeriods({ day: "จันทร์", room: "COM602" }).map((p) => `${p.start_time}-${p.end_time} ${p.subject_code}`));

section("buildContext: 'อาจารย์ไมตรี วันจันทร์สอนอะไร'");
const c1 = retrieval.buildContext("อาจารย์ไมตรี วันจันทร์สอนอะไรบ้าง");
console.log("teacher in context:", c1.teacher.name, "| periods:", c1.teacher.periods.length);

section("getBangkokNow() / now block in context (for 'วันนี้' questions)");
console.log(retrieval.getBangkokNow());
console.log("context.now:", retrieval.buildContext("วันนี้สอนอะไรบ้าง").now);

section("buildContext: totally unrelated question — still only has this teacher's data");
const c2 = retrieval.buildContext("วันนี้อากาศเป็นอย่างไร");
console.log("teacher in context:", c2.teacher.name);

section("Sanity: original formatting (dashes/colons/dots) is back in subject codes & times");
const sample = t.periods[0];
console.log("sample period:", sample);
console.log("sample subject code:", t.subjects[0].code);

console.log("\nALL SMOKE TESTS RAN WITHOUT ERROR");
