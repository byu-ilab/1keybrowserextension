import Vue from "vue";
import App from "./App";
import router from "./router";

let data = {
  nightMode: false
};

/* eslint-disable no-new */
new Vue({
  el: "#app",
  router,
  data,
  render: h => h(App)
});
