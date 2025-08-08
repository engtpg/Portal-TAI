import { defineStore } from 'pinia'
import { ref, computed } from 'vue' // Tambahkan computed
import { auth } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

export const useUiStore = defineStore('ui', () => {
  const router = useRouter()

  // STATE
  const isSidebarCollapsed = ref(false)
  const isMobileSidebarOpen = ref(false) // State baru untuk sidebar mobile
  const isDarkMode = ref(false)
  const currentUser = ref(null)
  const totalUnreadMessages = ref(0)
  const chatTargetUser = ref(null)
  let sessionTimer = null // Timer untuk session guest

  // GETTERS (Computed Properties)
  const isGuest = computed(() => currentUser.value?.isAnonymous === true)

  // ACTIONS
  function toggleSidebar() {
    if (window.innerWidth < 1024) {
      // 1024px adalah breakpoint lg di Tailwind
      isMobileSidebarOpen.value = !isMobileSidebarOpen.value
    } else {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }
  }

  function closeMobileSidebar() {
    isMobileSidebarOpen.value = false
  }

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
  }

  async function handleLogout() {
    clearSessionTimer() // Hapus timer saat logout manual
    try {
      await signOut(auth)
      currentUser.value = null
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  // --- LOGIKA BARU UNTUK SESSION GUEST ---
  function startSessionTimer() {
    clearSessionTimer() // Hapus timer lama jika ada
    sessionTimer = setTimeout(
      () => {
        alert('Sesi guest Anda telah berakhir.')
        handleLogout()
      },
      30 * 60 * 1000,
    ) // 30 menit
  }

  function clearSessionTimer() {
    if (sessionTimer) {
      clearTimeout(sessionTimer)
      sessionTimer = null
    }
  }

  // ... (sisa actions tidak berubah) ...

  return {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    isDarkMode,
    currentUser,
    totalUnreadMessages,
    chatTargetUser,
    isGuest, // Export isGuest
    toggleSidebar,
    closeMobileSidebar,
    toggleDarkMode,
    handleLogout,
    setCurrentUser: (user) => {
      currentUser.value = user
    },
    setTotalUnreadMessages: (count) => {
      totalUnreadMessages.value = count
    },
    startChatWithUser: (user) => {
      /* ... */
    },
    clearChatTarget: () => {
      /* ... */
    },
    startSessionTimer, // Export fungsi timer
    clearSessionTimer,
  }
})
