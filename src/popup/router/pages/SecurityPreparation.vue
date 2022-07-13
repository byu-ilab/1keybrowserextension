<template>
  <div class="security">
    <h1>
      Account Security
    </h1>

    <div class="instructions">
      This is your recovery kit. Whenever you register a new device with your
      1Key account or log out of this one, you will need to present the key in
      this kit.
    </div>

    <div class="stepRow">
      <div class="circle">1</div>
      <div class="instructions">
        Download the pdf file of your key
        <div class="downloadLink" id="link" @click="downloadPdf">here.</div>
      </div>
    </div>

    <div class="stepRow">
      <div class="circle">2</div>
      <div class="instructions">
        Print and store copies of this document in a secure location or on other
        devices.
      </div>
    </div>

    <div class="stepRow">
      <div class="circle">3</div>
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

<style scoped>

.stepRow {
  margin: 15px 6px;
}

.circle {
  background: black;
   border-radius: 0.8em;
  -moz-border-radius: 0.8em;
  -webkit-border-radius: 0.8em;
  color: #ffffff;
  font-weight: bold;
  line-height: 1.6em;
  margin-right: 15px;
  text-align: center;
  width: 1.6em; 
  font-size: 1.6em;
  float: left;
}

.instructions {
  text-align: left;
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
