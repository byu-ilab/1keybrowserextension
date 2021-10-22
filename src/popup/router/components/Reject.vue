<template>
  <div class="rejected">
    Login Request Canceled.
    <img id="iconReject" src="../../../icons/close.png" />
  </div>
</template>

<script>
/**
 * Reject.vue
 * Displays message that authentication via 1Key was unsuccessful.
 */

export default {
  name: "Reject",
  mounted() {
    if (this.$root.$data.nightMode) {
      document.getElementById("iconReject").src =
        "../../../icons/close-night.png";
    }
  }
};
</script>

<style>
.rejected {
  text-align: center;
  font-size: 25px;
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.rejected img {
  width: 50px;
  height: 50px;
  margin: 20px;
}
</style>
