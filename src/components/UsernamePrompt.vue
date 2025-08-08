<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

// Tampilkan banner hanya jika user sudah login TAPI username-nya kosong
const showBanner = computed(() => {
  return uiStore.currentUser && !uiStore.currentUser.username
})
</script>

<template>
  <div v-if="showBanner" class="bg-yellow-100 border-b-2 border-yellow-300 text-yellow-800 px-4 py-3 text-center text-sm" role="alert">
    <p>
      <span class="font-bold">Penting:</span> Untuk menggunakan fitur mention (@), Anda harus mengatur <strong>Username</strong> unik Anda terlebih dahulu.
      <RouterLink to="/profile/edit" class="font-bold underline hover:text-yellow-900 ml-2">
        Atur Username Sekarang &rarr;
      </RouterLink>
    </p>
  </div>
</template>
