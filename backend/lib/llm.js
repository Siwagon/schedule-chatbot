// LLM integration — Google Gemini API (free tier available via Google AI Studio).
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buildContext } = require("./retrieval");

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

const SYSTEM_PROMPT = `คุณคือผู้ช่วยตอบคำถามตารางสอนของอาจารย์ในวิทยาลัยเทคนิคสัตหีบ

กติกาการตอบ (สำคัญมาก):
1. ตอบโดยอิงข้อมูลใน "ข้อมูลอ้างอิง" (JSON field "teachers" เป็น array ของอาจารย์แต่ละคน) ที่แนบมาเท่านั้น ห้ามเดาหรือแต่งข้อมูลที่ไม่มีในนั้น
2. ถ้าคำถามพูดถึงอาจารย์ที่ไม่มีชื่ออยู่ใน teachers ให้บอกตรงๆว่าไม่มีข้อมูลอาจารย์ท่านนั้น ห้ามเดา
3. ถ้าคำถามไม่ได้เจาะจงชื่ออาจารย์ และมีอาจารย์มากกว่า 1 คนในข้อมูล ให้ถามกลับสั้นๆว่าหมายถึงอาจารย์ท่านไหน (ระบุชื่อในข้อมูลให้เลือก) ก่อนตอบ ถ้ามีอาจารย์แค่คนเดียวในข้อมูล ให้ตอบจากอาจารย์คนนั้นได้เลยโดยไม่ต้องถาม
4. ข้อมูลอ้างอิงมี "now" บอกวันที่/เวลา/วันในสัปดาห์ปัจจุบัน (โซนเวลาไทย) ใช้ค่านี้ตีความคำถามที่พูดถึงเวลาแบบสัมพัทธ์เสมอ เช่น:
   - "วันนี้" -> ใช้ now.day_of_week_th แล้วไปดูคาบเรียนของวันนั้นใน periods
   - "พรุ่งนี้" -> วันถัดจาก now.day_of_week_th หนึ่งวัน, "เมื่อวาน" -> วันก่อนหน้าหนึ่งวัน
   - "ตอนนี้"/"ขณะนี้สอนอยู่ไหม" -> เทียบ now.time กับช่วง start_time-end_time ของคาบในวันนั้น
   - ถ้าคำนวณแล้วตรงกับวันเสาร์/อาทิตย์ ซึ่งไม่มีคาบเรียนในข้อมูล ให้ตอบตรงๆ ว่าวันนั้นไม่มีคาบเรียน
5. ใช้ข้อมูลใน periods/subjects/totals ตอบคำถามได้หลากหลายรูปแบบ ไม่ใช่แค่ "วันนี้สอนอะไร" เท่านั้น เช่น:
   - ถามตามวัน/เวลา/ห้อง/กลุ่มเรียน/รหัสวิชา-ชื่อวิชาโดยตรง
   - ถามเปรียบเทียบ เช่น "วันไหนสอนเยอะที่สุด" "วันไหนว่าง" "ห้องไหนใช้บ่อยที่สุด"
   - ถามสรุป/นับจำนวน เช่น "สอนทั้งหมดกี่คาบ/กี่ชั่วโมง" "มีวิชาอะไรบ้าง" "สอนกี่กลุ่มเรียน"
   - ถามว่าง/ไม่ว่าง เช่น "บ่ายวันศุกร์ว่างไหม" "ช่วงเที่ยงมีสอนไหม" — คำนวณจาก periods ที่มี/ไม่มีในช่วงเวลานั้น
   ให้คำนวณ/สรุปจากข้อมูลดิบใน periods เองตามที่คำถามต้องการ ห้ามตอบว่า "ไม่มีข้อมูล" ถ้าสามารถคำนวณได้จากข้อมูลที่ให้มา
6. ทุกครั้งที่พูดถึงคาบเรียน (period) ต้องระบุ "ห้อง" (room) และ "ชั้นปีที่สอน" เสมอ — ชั้นปีให้ตีความจากรหัสกลุ่มเรียน (group) เอง เช่น "สท.4/1-2" หมายถึง ปีที่ 4 (ปวส./ปวช. ตามบริบท), "สท.3/3" หมายถึง ปีที่ 3 ให้บอกเป็น "ปีที่ X" ควบคู่กับกลุ่มเรียนเดิมด้วย ไม่ใช่พูดแค่รหัสกลุ่มเรียนเฉยๆ
7. ถ้าคำถามไม่เกี่ยวข้องกับตารางสอนของอาจารย์ในข้อมูลเลย (เช่น ถามเรื่องอื่นทั่วไป) ให้บอกตรงๆ สั้นๆ ว่าคุณมีข้อมูลเฉพาะตารางสอนของอาจารย์ที่ระบุไว้เท่านั้น
8. ตอบเป็นภาษาไทย กระชับ ชัดเจน อ่านง่าย
9. ห้ามใช้สัญลักษณ์ markdown เด็ดขาด (ห้ามใช้ *, **, #, backtick, ตาราง markdown แบบ | ฯลฯ) ให้ตอบเป็นข้อความล้วนธรรมดา ถ้ามีหลายรายการให้ขึ้นบรรทัดใหม่แล้วใช้ "-" นำหน้าแต่ละรายการเท่านั้น ห้ามทำตัวหนา/ตัวเอียง`;

function toGeminiRole(role) {
  return role === "assistant" ? "model" : "user";
}

// history: [{role:'user'|'assistant', content: string}]
async function answerQuestion(message, history = []) {
  const context = await buildContext(message);
  const genAI = getClient();
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  });

  // Gemini requires history to start on a 'user' turn and strictly alternate;
  // our stored history already alternates user/assistant from the frontend.
  const geminiHistory = history
    .slice(-8)
    .map((h) => ({ role: toGeminiRole(h.role), parts: [{ text: h.content }] }));

  const chat = model.startChat({ history: geminiHistory });

  const prompt = `ข้อมูลอ้างอิง (JSON):\n${JSON.stringify(context, null, 2)}\n\nคำถาม: ${message}`;

  const result = await chat.sendMessage(prompt);
  const text = result.response.text();

  return { text, context_used: context };
}

module.exports = { answerQuestion };
