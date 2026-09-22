<template>
  <div class="cleanse-page">
    <header class="header">
      <div class="header-title">
        <span class="logo">🧹</span>
        <div>
          <h1>Cleansing ข้อมูลตารางสอน</h1>
          <p class="subtitle">อัปโหลดรูปตาราง ให้ AI แปลงเป็นข้อมูล ตรวจสอบ แล้วบันทึกเข้า Supabase</p>
        </div>
      </div>
    </header>

    <main class="content">
      <div class="step">
        <div class="step-label">1) เลือกรูปตารางสอน</div>
        <input type="file" accept="image/*" @change="onFileChange" :disabled="loading" />
        <img v-if="previewUrl" :src="previewUrl" class="preview" alt="preview" />
      </div>

      <button class="primary" :disabled="!file || loading" @click="analyze">
        {{ loading && step === "analyze" ? "กำลังอ่านรูป..." : "2) วิเคราะห์รูปด้วย AI" }}
      </button>

      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

      <div v-if="resultJson" class="step">
        <div class="step-label">3) ตรวจสอบ/แก้ไขผลลัพธ์ก่อนบันทึก (เป็น JSON)</div>
        <textarea v-model="resultJson" rows="16" class="json-editor" :disabled="loading"></textarea>
        <button class="primary" :disabled="loading" @click="save">
          {{ loading && step === "save" ? "กำลังบันทึก..." : "4) บันทึกเข้าฐานข้อมูล" }}
        </button>
      </div>

      <div v-if="successMsg" class="success-banner">{{ successMsg }}</div>
    </main>
  </div>
</template>

<script setup>
import { ref } from "vue";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const file = ref(null);
const previewUrl = ref("");
const resultJson = ref("");
const loading = ref(false);
const step = ref("");
const errorMsg = ref("");
const successMsg = ref("");

function onFileChange(e) {
  errorMsg.value = "";
  successMsg.value = "";
  resultJson.value = "";
  const f = e.target.files?.[0];
  file.value = f || null;
  previewUrl.value = f ? URL.createObjectURL(f) : "";
}

function fileToBase64(f) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
}

async function analyze() {
  if (!file.value) return;
  errorMsg.value = "";
  successMsg.value = "";
  loading.value = true;
  step.value = "analyze";
  try {
    const base64 = await fileToBase64(file.value);
    const res = await fetch(`${API_BASE}/cleanse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mimeType: file.value.type || "image/png" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "วิเคราะห์รูปไม่สำเร็จ");
    resultJson.value = JSON.stringify(data, null, 2);
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function save() {
  errorMsg.value = "";
  successMsg.value = "";
  loading.value = true;
  step.value = "save";
  try {
    let payload;
    try {
      payload = JSON.parse(resultJson.value);
    } catch {
      throw new Error("JSON ไม่ถูกต้อง ตรวจรูปแบบก่อนบันทึก");
    }
    const res = await fetch(`${API_BASE}/teachers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
    successMsg.value = `บันทึกข้อมูลอาจารย์ "${data.name}" สำเร็จ (${data.subjects?.length || 0} วิชา, ${data.periods?.length || 0} คาบ)`;
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.cleanse-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  font-size: 28px;
}
.header h1 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}
.subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.step {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.step-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.preview {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  align-self: flex-start;
}

.json-editor {
  width: 100%;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12.5px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px;
  resize: vertical;
}

.primary {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  align-self: flex-start;
}
.primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.error-banner {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}
.success-banner {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}
</style>
