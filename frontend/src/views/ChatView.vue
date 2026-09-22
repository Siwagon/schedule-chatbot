<template>
  <div class="chat-page">
    <header class="header">
      <div class="header-title">
        <span class="logo">🎓</span>
        <div>
          <h1>ผู้ช่วยตารางสอน</h1>
          <p class="subtitle">ถามตารางสอนอาจารย์ได้เลย</p>
        </div>
      </div>
    </header>

    <main class="chat" ref="chatEl">
      <div v-if="messages.length === 0" class="empty-state">
        <p>ลองถามได้เลย เช่น:</p>
        <div class="suggestions">
          <button
            v-for="s in suggestions"
            :key="s"
            class="chip"
            @click="askSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="['bubble-row', m.role]"
      >
        <div class="bubble" :class="m.role">
          <div class="bubble-text" v-html="renderText(m.content)"></div>
        </div>
      </div>

      <div v-if="loading" class="bubble-row assistant">
        <div class="bubble assistant typing">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
    </main>

    <form class="composer" @submit.prevent="send">
      <input
        v-model="input"
        type="text"
        placeholder="พิมพ์คำถาม เช่น อาจารย์ไมตรี วันจันทร์สอนอะไร"
        :disabled="loading"
        autocomplete="off"
      />
      <button type="submit" :disabled="loading || !input.trim()">ส่ง</button>
    </form>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const suggestions = [
  "วันนี้อาจารย์ไมตรีสอนอะไรบ้าง",
  "อาจารย์ไมตรีสอนวิชาอะไรบ้าง",
  "วันจันทร์ห้อง COM602 มีสอนอะไรบ้าง",
  "อาจารย์ไมตรีสอนทั้งหมดกี่ชั่วโมงต่อสัปดาห์",
  "บ่ายวันศุกร์อาจารย์ไมตรีว่างไหม",
];

const messages = ref([]);
const input = ref("");
const loading = ref(false);
const errorMsg = ref("");
const chatEl = ref(null);

function renderText(text) {
  // minimal safe-ish rendering: escape html then convert newlines to <br>
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, "<br>");
}

async function scrollToBottom() {
  await nextTick();
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
}

function askSuggestion(text) {
  input.value = text;
  send();
}

async function send() {
  const text = input.value.trim();
  if (!text || loading.value) return;

  errorMsg.value = "";
  const history = messages.value.map((m) => ({ role: m.role, content: m.content }));
  messages.value.push({ role: "user", content: text });
  input.value = "";
  loading.value = true;
  scrollToBottom();

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
    messages.value.push({ role: "assistant", content: data.reply });
  } catch (err) {
    errorMsg.value = "เชื่อมต่อ backend ไม่สำเร็จ: " + err.message;
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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

.chat {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  color: #6b7280;
  text-align: center;
  margin-top: 40px;
}
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}
.chip {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
}
.chip:hover {
  background: #f3f4f6;
}

.bubble-row {
  display: flex;
}
.bubble-row.user {
  justify-content: flex-end;
}
.bubble-row.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 16px;
  line-height: 1.5;
  font-size: 14.5px;
  white-space: pre-wrap;
}
.bubble.user {
  background: #2563eb;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.bubble.assistant {
  background: #ffffff;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}

.bubble.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 14px 16px;
}
.bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: blink 1.2s infinite ease-in-out;
}
.bubble.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.bubble.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.error-banner {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.composer {
  display: flex;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}
.composer input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14.5px;
  outline: none;
}
.composer input:focus {
  border-color: #2563eb;
}
.composer button {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 14.5px;
  cursor: pointer;
}
.composer button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}
</style>
