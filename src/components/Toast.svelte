<script lang="ts">
  import { toastMessage } from "../lib/toastService";

  export let duration = 3000;

  // Automatically dismiss the toast after the specified duration
  setTimeout(() => {
    toastMessage.set("");
  }, duration);

  // Function to dismiss the toast when the close button is clicked
  function closeToast() {
    toastMessage.set("");
  }
</script>

{#if $toastMessage}
  <div class="toast">
    {$toastMessage}
    <button on:click={closeToast} class="close-button">Close</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #323232;
    color: white;
    padding: 1em;
    border-radius: 4px;
    z-index: 1000;
    transition: 0.3s;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);
    font-size: 2rem;
  }

  .close-button {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
  }
</style>
