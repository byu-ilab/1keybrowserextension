<template>
  <div class="padded">
    <h1>Welcome!</h1>
    
    <p>Let's Authenticate helps you securely
    login to websites without passwords.</p>

    <p>If you are new to Let's Authenticate:</p>

    <router-link :to="'/register'"><button>Create an Account</button></router-link>

    <p>If you already have an account with Let's Authenticate:</p>

    <router-link :to="'/new-device'"><button>Link this Device</button></router-link>
  </div>
</template>

<script>
</script>

<style scoped>

</style>
