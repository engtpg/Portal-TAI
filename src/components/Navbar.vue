<script setup>
import { ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { db } from '@/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'

const uiStore = useUiStore()
const router = useRouter()

const isUserMenuOpen = ref(false)
const isNotifMenuOpen = ref(false)
const notifications = ref([])

watch(
  () => uiStore.currentUser,
  (newUser) => {
    if (newUser && !newUser.isAnonymous) {
      const q = query(
        collection(db, 'users', newUser.uid, 'notifications'),
        where('isRead', '==', false),
      )
      onSnapshot(q, (snapshot) => {
        notifications.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      })
    } else {
      notifications.value = []
    }
  },
  { immediate: true },
)

const handleNotificationClick = async (notif) => {
  const notifRef = doc(db, 'users', uiStore.currentUser.uid, 'notifications', notif.id)
  await updateDoc(notifRef, { isRead: true })
  isNotifMenuOpen.value = false
  router.push(notif.link)
}
</script>

<template>
  <nav class="bg-white dark:bg-gray-800 shadow-md fixed w-full z-20">
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <button
            @click="uiStore.toggleSidebar"
            class="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>

          <RouterLink to="/" class="ml-4">
            <img class="h-8 w-auto dark:hidden" src="/public/SM.png" alt="Logo Satkomindo" />
            <img
              class="h-8 w-auto hidden dark:block"
              src="/public/SM-White.png"
              alt="Logo Satkomindo"
            />
          </RouterLink>
        </div>

        <div class="hidden md:flex flex-col items-center">
          <span class="text-lg font-semibold text-gray-900 dark:text-white"
            >Portal Task And Incident</span
          >
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click="uiStore.toggleDarkMode"
            class="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              v-if="!uiStore.isDarkMode"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              ></path>
            </svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m8.657-12.657l-.707.707M5.05 18.95l-.707.707M21 12h-1M4 12H3m15.657-8.657l-.707-.707M6.05 5.05l-.707-.707"
              ></path>
            </svg>
          </button>

          <div v-if="!uiStore.isGuest" class="relative">
            <button
              @click="isNotifMenuOpen = !isNotifMenuOpen"
              class="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                ></path>
              </svg>
              <span
                v-if="notifications.length > 0"
                class="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                >{{ notifications.length }}</span
              >
            </button>
            <div
              v-if="isNotifMenuOpen"
              @click.away="isNotifMenuOpen = false"
              class="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5"
            >
              <div
                class="p-2 font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-700"
              >
                Notifikasi
              </div>
              <div v-if="notifications.length === 0" class="p-4 text-center text-sm text-gray-500">
                Tidak ada notifikasi baru.
              </div>
              <div v-else>
                <a
                  v-for="notif in notifications"
                  :key="notif.id"
                  @click.prevent="handleNotificationClick(notif)"
                  href="#"
                  class="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700/50"
                >
                  {{ notif.message }}
                </a>
              </div>
            </div>
          </div>

          <div class="relative">
            <button
              @click="isUserMenuOpen = !isUserMenuOpen"
              class="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300"
            >
              <img
                class="h-8 w-8 rounded-full object-cover"
                :src="
                  uiStore.currentUser?.photoURL ||
                  'https://placehold.co/100x100/E2E8F0/4A5568?text=G'
                "
                alt="User Avatar"
              />
            </button>
            <div
              v-if="isUserMenuOpen"
              @click.away="isUserMenuOpen = false"
              class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5"
            >
              <div class="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                <p class="font-semibold">{{ uiStore.currentUser?.displayName || 'Guest User' }}</p>
                <p class="truncate">{{ uiStore.currentUser?.email || 'guest@portal.com' }}</p>
              </div>
              <div class="border-t border-gray-200 dark:border-gray-700"></div>
              <RouterLink
                v-if="!uiStore.isGuest"
                to="/profile/me"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >Profile</RouterLink
              >
              <button
                @click="uiStore.handleLogout"
                class="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
