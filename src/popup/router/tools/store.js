/* Global storage */

// based off of https://vuejs.org/guide/scaling-up/state-management.html#simple-state-management-with-reactivity-api 

import {reactive} from 'vue'

export const store = reactive({
    localVault: null,
    remoteVault: null,
    setLocalVault(vault) {
        store.localVault = vault;
    },
    getLocalVault() {
        return store.localVault;
    },
    setRemoteVault(vault) {
        store.remoteVault = vault;
    },
    getRemoteVault() {
        return store.remoteVault;
    },
    clearAll() {
        store.localVault = null;
        store.remoteVault = null;
    }
});

