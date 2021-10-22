<template>
  <div class="iconContainer">
    <LoadingIcon />
    <div class="loadingText">Loading...</div>
  </div>
</template>

<script>
import LoadingIcon from "./LoadingIcon.vue";
export default {
  components: {
    LoadingIcon
  }
};
</script>

<style lang="scss" scoped>
.iconContainer {
  color: "var(--logo-gray)";
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 350px;
  height: 275px;
}

.loadingText {
  margin-top: 5px;
}
</style>
