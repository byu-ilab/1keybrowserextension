import { createWebHashHistory, createRouter } from "vue-router";
import routes from "./routes";


const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
    history: createWebHashHistory(),
    routes: routes,
})


export default router;
