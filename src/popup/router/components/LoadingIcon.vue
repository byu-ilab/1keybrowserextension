<template>
  <div v-bind:style="styles" class="spinner spinner--double-bounce">
    <div class="double-bounce1" v-bind:style="bounceStyle"></div>
    <div class="double-bounce2" v-bind:style="bounceStyle"></div>
  </div>
</template>

<script>
export default {
  props: {
    size: {
      default: "70px"
    },
    background: {
      default: "var(--logo-gray)"
    },
    duration: {
      default: "2.0s"
    }
  },
  computed: {
    bounceStyle() {
      return {
        backgroundColor: this.background,
        animationDuration: this.duration
      };
    },
    styles() {
      return {
        width: this.size,
        height: this.size
      };
    }
  }
};
</script>

<style lang="scss" scoped>
.spinner {
  position: relative;
  display: inline-block;
  * {
    line-height: 0;
    box-sizing: border-box;
  }
}

.double-bounce1,
.double-bounce2 {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0.15;
  position: absolute;
  top: 0;
  left: 0;
  animation: double-bounce 2s ease-in-out infinite;
}

.double-bounce2 {
  animation-delay: -1s;
}

@keyframes double-bounce {
  0%,
  100% {
    transform: scale(0);
  }
  50% {
    transform: scale(1);
  }
}
</style>
