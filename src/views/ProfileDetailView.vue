<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const profileData = ref(null)
const loading = ref(true)

const isOwnProfile = computed(() => {
  if (!uiStore.currentUser || !profileData.value) return false
  return uiStore.currentUser.uid === profileData.value.uid
})

const fetchProfileData = async (profileId) => {
  loading.value = true
  let userId = profileId
  if (profileId === 'me') {
    if (!uiStore.currentUser) {
      setTimeout(() => fetchProfileData(profileId), 100)
      return
    }
    userId = uiStore.currentUser.uid
  }

  const userDocRef = doc(db, 'users', userId)
  const docSnap = await getDoc(userDocRef)

  if (docSnap.exists()) {
    profileData.value = { uid: docSnap.id, ...docSnap.data() }
  } else {
    profileData.value = null
  }
  loading.value = false
}

onMounted(() => fetchProfileData(route.params.id))
watch(
  () => route.params.id,
  (newId) => fetchProfileData(newId),
)

const sendMessage = () => {
  // Panggil aksi di store untuk menetapkan target chat
  uiStore.startChatWithUser(profileData.value)
  // Arahkan ke halaman pesan
  router.push('/messages')
}
</script>

<template>
  <div v-if="loading" class="text-center">Memuat profil...</div>
  <div v-else-if="profileData" class="max-w-4xl mx-auto">
    <div class="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8">
      <div class="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
        <img
          class="h-32 w-32 rounded-full ring-4 ring-orange-500 object-cover"
          :src="
            profileData.photoURL ||
            `https://placehold.co/128x128/E2E8F0/4A5568?text=${profileData.displayName.charAt(0)}`
          "
          alt="User Avatar"
        />

        <div class="mt-6 md:mt-0 text-center md:text-left flex-1">
          <div class="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-800 dark:text-white">
                {{ profileData.displayName }}
              </h1>
              <p v-if="profileData.username" class="text-lg text-gray-500 dark:text-gray-400">
                @{{ profileData.username }}
              </p>
            </div>

            <div class="mt-4 md:mt-0">
              <RouterLink
                v-if="isOwnProfile"
                to="/profile/edit"
                class="px-6 py-2 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600"
              >
                Edit Profile
              </RouterLink>
              <button
                v-else
                @click="sendMessage"
                class="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Kirim Pesan
              </button>
            </div>
          </div>

          <p class="text-gray-500 dark:text-gray-400 mt-2">{{ profileData.email }}</p>

          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Deskripsi</h2>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              {{ profileData.description || 'Pengguna ini belum menambahkan deskripsi.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center">
    <h2 class="text-2xl font-bold">Profil tidak ditemukan</h2>
  </div>
</template>
