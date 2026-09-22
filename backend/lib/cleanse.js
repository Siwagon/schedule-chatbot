// Image -> structured schedule JSON, using Gemini's structured-output mode
// (responseSchema) so the result always matches the shape lib/data.js expects.
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY is not set");
    err.code = "NO_API_KEY";
    throw err;
  }
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING, description: "slug จากชื่ออาจารย์ ภาษาอังกฤษตัวเล็ก คั่นด้วย - เช่น maitree-naphoe" },
    name: { type: SchemaType.STRING },
    department: { type: SchemaType.STRING },
    education: { type: SchemaType.STRING },
    special_duty: { type: SchemaType.STRING },
    totals: {
      type: SchemaType.OBJECT,
      properties: {
        theory_hours: { type: SchemaType.NUMBER },
        practice_hours: { type: SchemaType.NUMBER },
        credits: { type: SchemaType.NUMBER },
        total_hours: { type: SchemaType.NUMBER },
      },
    },
    subjects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          code: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          theory_hours: { type: SchemaType.NUMBER },
          practice_hours: { type: SchemaType.NUMBER },
          credits: { type: SchemaType.NUMBER },
          total_hours: { type: SchemaType.NUMBER },
        },
        required: ["code", "name"],
      },
    },
    periods: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.STRING, description: "จันทร์ | อังคาร | พุธ | พฤหัสฯ | ศุกร์ | เสาร์ | อาทิตย์" },
          start_time: { type: SchemaType.STRING, description: "HH:MM" },
          end_time: { type: SchemaType.STRING, description: "HH:MM" },
          type: { type: SchemaType.STRING, description: "ทฤษฎี | ปฏิบัติ | ออนไลน์ ฯลฯ ตามที่เห็นในรูป" },
          subject_code: { type: SchemaType.STRING },
          room: { type: SchemaType.STRING },
          group: { type: SchemaType.STRING },
          student_count: { type: SchemaType.NUMBER },
        },
        required: ["day", "start_time", "end_time", "subject_code"],
      },
    },
  },
  required: ["id", "name", "subjects", "periods"],
};

const PROMPT = `นี่คือรูปตารางสอนของอาจารย์ 1 คน จากวิทยาลัยเทคนิค แปลงข้อมูลในรูปเป็น JSON ตาม schema ที่กำหนดให้ครบถ้วนและถูกต้องที่สุด

ข้อควรระวังเป็นพิเศษ:
- ตารางกริดคาบเรียน: แถว = วัน, คอลัมน์ = ช่วงเวลา 1 ชั่วโมงต่อคอลัมน์ ให้ดูว่ากล่องข้อความของแต่ละคาบ "กินพื้นที่กี่คอลัมน์" ถ้ากล่องกว้างกว่า 1 คอลัมน์ (เส้นตารางถูกรวมเป็นกล่องเดียว) แปลว่าคาบนั้นยาวหลายชั่วโมงต่อเนื่อง ต้องรวมเป็น start_time/end_time ช่วงเดียว (เช่น กินคอลัมน์ 14:00-15:00 ถึง 17:00-18:00 ให้บันทึกเป็น start_time=14:00, end_time=18:00) ห้ามตัดคาบต่อเนื่องนี้ออกเป็นหลายคาบ 1 ชั่วโมง
- เก็บรหัสวิชา/ชื่อห้อง/กลุ่มเรียนตามที่เห็นในรูปเป๊ะๆ รวมถึงตัวพิมพ์เล็ก-ใหญ่ที่อาจไม่สม่ำเสมอ (เช่น "COM602" กับ "com403")
- ตารางส่วนบนที่สรุปรายวิชา (รหัสวิชา, ชื่อวิชา, ท, ป, น, ช) ให้ใส่ใน subjects (theory_hours=ท, practice_hours=ป, credits=น, total_hours=ช) และรวมยอดท้ายตารางใส่ใน totals
- ถ้าอ่านช่องไหนไม่ออกหรือไม่มีข้อมูล ให้ข้ามช่องนั้นไปเลย ห้ามเดาเติมข้อมูลที่ไม่เห็นในรูป`;

async function cleanseSchedule(base64Image, mimeType) {
  const genAI = getClient();
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    { inlineData: { mimeType: mimeType || "image/png", data: base64Image } },
  ]);

  const text = result.response.text();
  return JSON.parse(text);
}

module.exports = { cleanseSchedule };
