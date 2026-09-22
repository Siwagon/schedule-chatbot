import { createRouter, createWebHistory } from "vue-router";
import ChatView from "./views/ChatView.vue";
import CleansingView from "./views/CleansingView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "chat", component: ChatView },
    { path: "/cleanse", name: "cleanse", component: CleansingView },
  ],
});
