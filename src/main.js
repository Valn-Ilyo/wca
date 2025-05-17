import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createApp } from "vue";
import { createVuetify } from "vuetify";
import App from "./App.vue";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createRouter, createWebHashHistory } from "vue-router";

import Home from "./views/Home.vue";
import Result from "./views/Result.vue";

const app = createApp(App);

const routes = [
  { path: "/", component: Home },
  { path: "/result", component: Result },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const vuetify = createVuetify({
  components,
  directives,
  icons: { iconfont: "mdi" },
  theme: {
    defaultTheme: "default",
    themes: {
      default: {
        dark: false,
        colors: {
          primary: "#C8102E",
          secondary: "#007A3D",
          accent: "#F9F6F1",
          surface: "#F9F6F1",
          background: "#F9F6F1",
        },
      },
    },
  },
});

app.use(vuetify).use(router).mount("#app");
