<script lang="ts">
  import ImageUploadForm from "./components/ImageUploadForm.svelte";
  import ApiKeysForm from "./components/ApiKeysForm.svelte";
  import Toast from "./components/Toast.svelte";
</script>

<nav class="nav">
  <div class="nav-left">
    <div class="brand">Longhand ✍🏽</div>
  </div>
  <div class="nav-links nav-right">
    <a target="_blank" href="https://codeberg.org/meadowingc/longhand/wiki/Home">About</a>
    <a target="_blank" href="https://codeberg.org/meadowingc/longhand/wiki/How-to-use">Help</a>
  </div>
</nav>

<main>
  <ApiKeysForm />
  <ImageUploadForm />
  <Toast />
</main>

<footer class="footer">
  <p class="with-love"><small>Made with ❤️ by <a target="_blank" href="https://meadow.bearblog.dev/">Meadow</a></small></p>
  <div class="build-version"><small><i>Version: __commitHash__</i></small></div>
</footer>

<style>
  .brand {
    font-family: "Pacifico", cursive;
    /* font-size: 1.5rem; */
  }

  .nav {
    margin-top: 1em;
  }

  .nav-links a:hover {
    text-decoration: underline;
  }

  .footer {
    text-align: center;
  }

  .with-love {
    margin-bottom: 0em;
  }

  .build-version {
    margin-top: 0;
  }
</style>
