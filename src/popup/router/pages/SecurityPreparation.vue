<template>
  <div class="security">
    <div class="header">
      Account Security
    </div>

    <div class="instructions" style="width: 300px">
      This is your recovery kit. Whenever you register a new device with your
      1Key account or log out of this one, you will need to present the key in
      this kit.
    </div>

    <div class="stepRow">
      <div class="numberBullet">1</div>
      <div class="instructions">
        Download the pdf file of your key
        <div class="downloadLink" id="link" @click="downloadPdf">here.</div>
      </div>
    </div>

    <div class="stepRow">
      <div class="numberBullet">2</div>
      <div class="instructions">
        Print and store copies of this document in a secure location or on other
        devices.
      </div>
    </div>

    <div class="stepRow">
      <div class="numberBullet">3</div>
      <div class="instructions">
        Permanetely delete the 1Key Account Recovery file from this device.
      </div>
    </div>

    <img
      src="../../../icons/right.png"
      width="22px"
      height="22px"
      style="margin-left: 275px"
      v-show="downloaded"
      @click="() => this.$router.push('/')"
    />

    <div class="pdf" id="pdfToDownload" v-show="false">
      <div class="pdfTitle" style="font-size: 26px">
        <strong>1Key Account Recovery Key</strong>
        <br />
      </div>
      <div class="pdfTitle">
        <strong>Username: </strong>{{ pdfUsername }}<br />
        <strong>Device name: </strong>{{ pdfDevicename }}<br />
      </div>
      <div class="pdfInstruct">
        <strong>Instructions: </strong>
        Store this file in a secure location, NOT on the device it was created
        for. Whenever you register a new device with your 1Key account or log
        out of this one, you will need to present the key in this kit.
      </div>
      <p class="key">{{ key }}</p>
    </div>
  </div>
</template>

<script>
/**
 * SecurityPreparation.vue
 * Initially used to store 10 passkeys used for recovery when the user forgot their master password, it is now
 * used to store the symmetric key used to decrypt the authentication data key and the certificates in local storage.
 */

import jsPDF from "jspdf";
import { getUserInfo } from "../tools/UserDatabase.js";
export default {
  name: "SecurityPreparation",
  data() {
    return {
      downloaded: false,
      key: "",
      pdfUsername: "",
      pdfDevicename: ""
    };
  },
  async created() {
    //change colors to night mode if necessary
    if (this.$root.$data.nightMode) {
      let instructions = await document.getElementsByClassName("instructions");
      for (let x = 0; x < instructions.length; x++) {
        instructions[x].style.color = "white";
      }

      let key = await document.getElementsByClassName("key");
      key.style.color = "white";

      document.getElementById("link").style.color = "var(--logo-gray)";
    }
  },
  async mounted() {
    //create the pdf file that user needs to download
    await this.makePasswordRecoveryFile();
  },
  methods: {
    /**
     * Sets fields for pdf file of account recovery information that user needs to download
     */
    async makePasswordRecoveryFile() {
      //get user info from encrypted local database
      let userInfo = await getUserInfo();

      //save pertinent information and instructions
      this.pdfUsername = userInfo.username;
      this.pdfDevicename = userInfo.devicename;
      this.key = this.$route.params.key;
    },
    /**
     * Creates pdf file and downloads it.
     */
    downloadPdf() {
      var officialPdf = new jsPDF("p", "pt", "a4");
      let margins = {
        top: 60,
        bottom: 40,
        left: 60,
        width: 510
      };
      officialPdf.fromHTML(
        document.getElementById("pdfToDownload"),
        margins.left, // x coord
        margins.top,
        {
          // max width of content on PDF
          width: margins.width
        }
      );

      officialPdf.save("1Key_Account_Key.pdf");

      this.downloaded = true;
    }
  }
};
</script>

<style lang="scss" scoped>
.security {
  width: 360px;
  height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  width: 100%;
  height: 50px;
  padding: 10px;
  padding-top: 2px;
  padding-right: 50px;
  font-size: 30px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  background: #165663;
  color: white;
}

.stepRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 6px;
}

.numberBullet {
  width: 35px;
  height: 35px;
  border-radius: 50px;
  color: #165663;
  font-size: 30px;
  font-weight: bold;
  border: 2px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 10px;
  margin-left: 0px;
}

.instructions {
  color: #165663;
  font-weight: bold;
  font-size: 12px;
  padding: 10px;
  text-align: left;
  width: 250px;
}

.continueButton {
  background: #165663;
  text-align: center;
  padding: 10px;
  margin: 15px 0px 15px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: white;
  width: 120px;
  font-size: 15px;
}

.disabledButton {
  background: #899fa3;
  text-align: center;
  padding: 10px;
  margin: 15px 0px 15px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  width: 120px;
  pointer-events: none;
  color: white;
  font-size: 15px;
}

.continueButton:hover {
  background: #899fa3;
}

.pdf {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-family: "Courier New", Courier, monospace;
  text-align: flex-start;
}

.pdfTitle {
  font-size: 20px;
  color: black;
  word-wrap: break-word;
  font-family: "Courier New", Courier, monospace;
  padding: 20px;
}

.pdfInstruct {
  font-size: 16px;
  color: black;
  word-wrap: break-word;
  font-family: "Courier New", Courier, monospace;
  padding: 20px;
}

.downloadLink {
  color: blue;
  text-decoration: underline;
  pointer-events: auto;
}

li {
  font-size: 16px;
  padding-top: 10px;
}
</style>
