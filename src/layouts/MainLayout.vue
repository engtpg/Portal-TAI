<script setup>
import { RouterView } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Footer from '@/components/Footer.vue'
import UsernamePrompt from '@/components/UsernamePrompt.vue'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <Navbar />
    <Sidebar />

    <!-- Overlay untuk mobile sidebar -->
    <div
      v-if="uiStore.isMobileSidebarOpen"
      @click="uiStore.closeMobileSidebar()"
      class="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
    ></div>

    <!-- Margin kiri diubah agar responsif -->
    <main
      class="pt-16 transition-all duration-300 lg:ml-64"
      :class="uiStore.isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'"
    >
      <UsernamePrompt />
      <div class="p-4 md:p-8">
        <RouterView />
      </div>
      <Footer />
    </main>
  </div>
</template>
