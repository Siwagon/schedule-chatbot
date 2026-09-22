<template>
  <div class="shell">
    <nav class="tabbar">
      <router-link to="/" class="tab" active-class="active">💬 แชท</router-link>
      <router-link to="/cleanse" class="tab" active-class="active">🧹 Cleansing</router-link>
    </nav>
    <router-view />
  </div>
</template>

<style>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 720px;
  margin: 0 auto;
  background: var(--bg, #f7f8fa);
}

.tabbar {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  flex-shrink: 0;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: #6b7280;
  text-decoration: none;
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}
</style>
