<template>
  <div id="body">
    <div class="index">
      <div class="request">
        You are already registered with this service. Do you wish to register a
        new account?
      </div>

      <div class="buttonRow">
        <div class="accept" @click="returnYes" id="accept">
          <img
            id="acceptIcon"
            src="../../../icons/checked.png"
            width="50px"
            height="50px"
          />
          Accept
        </div>
        <div class="reject" @click="returnNo" id="reject">
          <img
            id="rejectIcon"
            src="../../../icons/close.png"
            width="50px"
            height="50px"
          />
          Reject
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * AlreadyRegistered.vue
 * Displays option to register a new account with a website they are already registered with,
 * or cancel the registration request.
 */

export default {
  name: "Request",
  created() {
    if (this.$root.$data.nightMode) {
      document.getElementById("body").style.color = "white";
      document.getElementById("accept").className = "acceptNight";
      document.getElementById("reject").className = "rejectNight";
      document.getElementById("acceptIcon").src =
        "../../../icons/checked-night.png";
      document.getElementById("rejectIcon").src =
        "../../../icons/close-night.png";
    }
  },
  methods: {
    /**
     * Called if user selects that they want to register a new account.
     * Changes values in Request.vue to restart registration, this time without asking if user wants to register a new account.
     */
    returnYes() {
      this.$parent.accounts = [];
      this.$parent.showAlreadyRegistered = false;
      this.$parent.checkAuth();
    },
    /**
     * Called if user selects that they don't want to register a new account.
     * Changes values in Request.vue to display component Reject.vue.
     */
    returnNo() {
      this.$parent.loading = false;
      this.$parent.rejectRequest();
      this.$parent.showAlreadyRegistered = false;
    }
  }
};
</script>

<style lang="scss" scoped>
.index {
  width: 350px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 60px;
}

.request {
  width: 330px;
  padding: 15px;
  text-align: center;
  font-size: 14px;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  font-size: 12px;
}

.accept {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  border-radius: 50px;
  font-weight: bold;
  color: var(--dk-green);
  margin-right: 20px;
}

.accept:hover {
  background: rgba(137, 159, 163, 0.2);
}

.acceptNight {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  border-radius: 50px;
  font-weight: bold;
  color: var(--logo-gray);
  margin-right: 20px;
}

.acceptNight:hover {
  background: rgba(137, 159, 163, 0.1);
}

.reject {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  margin-left: 20px;
  border-radius: 50px;
  color: #920808;
}

.reject:hover {
  background: rgba(146, 8, 8, 0.1);
}

.rejectNight {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  margin-left: 20px;
  border-radius: 50px;
  color: var(--n-fail-red);
}

.rejectNight:hover {
  background: rgba(255, 143, 143, 0.1);
}
</style>
