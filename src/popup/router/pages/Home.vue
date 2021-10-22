<template>
  <div class="home">
    <div class="headerContainer">
      <div class="blueStripe" />
      <div class="overlayImage">
        <img src="../../../icons/key_icon.png" width="60px" />
      </div>
      <img src="../../../icons/home-background.png" width="100%" />
    </div>

    <div class="bodyContainer">
      <div class="title">1KEY</div>

      Welcome to the 1Key browser extension. Here we hope to relieve you and
      your memory of all but one password. In this extension you can receive and
      accept login requests from different websites.

      <div class="buttonRow">
        <div class="homeButton" @click="() => this.$router.push('/login')">
          <img id="loginIcon" src="../../../icons/enter.png" class="logo" />
          LOGIN
        </div>

        <div class="homeButton" @click="() => this.$router.push('/register')">
          <img id="regIcon" src="../../../icons/add.png" class="logo" />
          REGISTER
        </div>

        <div
          class="homeButton"
          @click="
            () =>
              this.$router.push({
                name: 'Register',
                params: { newAuth: true }
              })
          "
        >
          <img id="compIcon" src="../../../icons/computer.png" class="logo" />
          NEW DEVICE
        </div>
      </div>
    </div>

    <div class="credits">
      Icons made by
      <a href="https://www.flaticon.com/authors/freepik" title="Freepik">
        Freepik
      </a>
      from
      <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>
    </div>
  </div>
</template>

<script>
/**
 * Home.vue
 * Displays welcome message and buttons to login, register, or register a new device to your Let's Auth account with the CA/
 */

export default {
  async created() {
    //set colors to night mode if necessary
    if (this.$root.$data.nightMode) {
      document.body.style.color = "white";
      let results = await document.getElementsByClassName("homeButton");
      for (let x = 0; x < results.length; x++) {
        results[x].style.color = "white";
      }
      document.getElementById("loginIcon").src =
        "../../../icons/enter_white.png";
      document.getElementById("regIcon").src = "../../../icons/add_white.png";
      document.getElementById("compIcon").src =
        "../../../icons/computer_white.png";
    }
  }
};
</script>

<style lang="scss" scoped>
.home {
  width: 360px;
  height: 420px;
  display: flex;
  flex-direction: column;
  text-align: center;
}

.headerContainer {
  position: relative;
}

.title {
  font-size: 30px;
  margin-top: 5px;
}

.overlayImage {
  position: absolute;
  margin-top: 140px;
  margin-left: 150px;
  margin-right: 150px;
}

.blueStripe {
  position: absolute;
  margin-top: 167px;
  background: #899fa3;
  height: 10px;
  width: 100%;
}

.bodyContainer {
  display: flex;
  flex-direction: column;
  margin: 20px;
  margin-bottom: 10px;
  text-align: center;
  font-size: 12px;
}

.logo {
  width: 40px;
  height: 40px;
  padding: 3px;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  margin-top: 5px;
}

.homeButton {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 70px;
  width: 70px;
  padding: 10px;
  border-radius: 50%;
  color: #000;
  font-size: 10px;
}

.homeButton:hover {
  background: rgba(137, 159, 163, 0.3);
}

.credits {
  margin-bottom: 5px;
  font-size: 7px;
}
</style>
