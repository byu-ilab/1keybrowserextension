<template>
  <div class="accepted">
    1Key Login Successful.
    <img id="iconAccept" src="../../../icons/checked.png" />
  </div>
</template>

<script>
/**
 * Accept.vue
 * Displays message that authentication via 1Key was successful.
 */

export default {
  name: "Accept",
  mounted() {
    if (this.$root.$data.nightMode) {
      document.getElementById("iconAccept").src =
        "../../../icons/checked-night.png";
    }
  }
};
</script>

<style>
.accepted {
  text-align: center;
  font-size: 25px;
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.accepted img {
  width: 50px;
  height: 50px;
  margin: 20px;
}
</style>
