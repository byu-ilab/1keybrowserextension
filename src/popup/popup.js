import { createApp } from "vue";
import App from "./App";
import router from "./router";

let data = {
  nightMode: false
};

const app = createApp(App)

app.use(router)
// app.use(data)

app.mount("#app")
