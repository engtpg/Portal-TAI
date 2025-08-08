<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { db, auth, findUserByUsername } from '@/firebase'
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
const route = useRoute()
const incident = ref(null)
const actions = ref([])
const loading = ref(true)
const incidentId = route.params.id

// State untuk form Tambah Aksi
const isActionFormVisible = ref(false)
const newActionText = ref('')
const newStatus = ref('on-going')
const newActionDate = ref('')
const isLoadingAction = ref(false)

// State untuk mention
const showMentionList = ref(false)
const mentionQuery = ref('')
const allUsers = ref([])
const allGroups = ref([])

// State untuk Copy to Clipboard
const copyTextarea = ref(null)
const copyButtonText = ref('Salin ke Clipboard')

onMounted(async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'))
    allUsers.value = usersSnapshot.docs.map((doc) => ({ uid: doc.id, type: 'user', ...doc.data() }))

    const groupsSnapshot = await getDocs(collection(db, 'groups'))
    allGroups.value = groupsSnapshot.docs.map((doc) => ({
      id: doc.id,
      type: 'group',
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error fetching mentionables:', error)
  }

  const incidentDocRef = doc(db, 'incidents', incidentId)
  onSnapshot(incidentDocRef, (doc) => {
    if (doc.exists()) {
      incident.value = { ...doc.data(), docId: doc.id }
      newStatus.value = doc.data().status
    } else {
      console.error('No such incident!')
    }
    loading.value = false
  })

  const actionsQuery = query(
    collection(db, 'incidents', incidentId, 'actions'),
    orderBy('createdAt', 'desc'),
  )
  onSnapshot(actionsQuery, (snapshot) => {
    actions.value = snapshot.docs.map((doc) => doc.data())
  })
})

const filteredMentions = computed(() => {
  const combined = [...allUsers.value, ...allGroups.value]
  if (!mentionQuery.value) {
    return combined.filter(
      (item) =>
        item.type === 'group' || (item.type === 'user' && item.uid !== auth.currentUser.uid),
    )
  }
  return combined.filter((item) => {
    if (item.type === 'user' && item.uid === auth.currentUser.uid) {
      return false
    }
    const queryLower = mentionQuery.value.toLowerCase()
    return (
      item.username?.toLowerCase().includes(queryLower) ||
      item.displayName?.toLowerCase().includes(queryLower) ||
      item.groupName?.toLowerCase().includes(queryLower)
    )
  })
})

watch(newActionText, (text) => {
  const mentionMatch = text.match(/@(\w*)$/)
  if (mentionMatch) {
    showMentionList.value = true
    mentionQuery.value = mentionMatch[1]
  } else {
    showMentionList.value = false
  }
})

const selectUserForMention = (username) => {
  const currentText = newActionText.value
  const newText = currentText.replace(/@(\w*)$/, `@${username} `)
  newActionText.value = newText
  showMentionList.value = false
  document.getElementById('newActionIncident').focus()
}

const addAction = async () => {
  if (!newActionText.value || !newActionDate.value || !newStatus.value) {
    alert('Semua field pada form Tambah Action wajib diisi.')
    return
  }
  isLoadingAction.value = true
  const user = auth.currentUser
  const incidentDocRef = doc(db, 'incidents', incidentId)
  const actionTimestamp = Timestamp.fromDate(new Date(newActionDate.value))

  try {
    const mentions = newActionText.value.match(/@([a-zA-Z0-9_]{5,18})/g)
    if (mentions) {
      const uniqueMentions = [...new Set(mentions)]
      for (const mention of uniqueMentions) {
        const username = mention.substring(1)
        const mentionedItem = [...allUsers.value, ...allGroups.value].find(
          (item) => item.username === username,
        )

        if (mentionedItem && mentionedItem.type === 'user' && mentionedItem.uid !== user.uid) {
          const notificationRef = collection(db, 'users', mentionedItem.uid, 'notifications')
          await addDoc(notificationRef, {
            message: `${user.displayName} mention Anda di insiden: "${incident.value.incidentName}"`,
            link: `/incidents/${incidentId}`,
            isRead: false,
            createdAt: serverTimestamp(),
          })
        } else if (mentionedItem && mentionedItem.type === 'group') {
          for (const member of mentionedItem.members) {
            if (member.uid !== user.uid) {
              const notificationRef = collection(db, 'users', member.uid, 'notifications')
              await addDoc(notificationRef, {
                message: `${user.displayName} mention grup Anda (@${mentionedItem.username}) di insiden: "${incident.value.incidentName}"`,
                link: `/incidents/${incidentId}`,
                isRead: false,
                createdAt: serverTimestamp(),
              })
            }
          }
        }
      }
    }

    await addDoc(collection(incidentDocRef, 'actions'), {
      actionText: newActionText.value,
      actorName: user.displayName || 'Anonymous User',
      actorUid: user.uid,
      createdAt: actionTimestamp,
      newStatus: newStatus.value,
    })

    const updateData = {
      status: newStatus.value,
      lastAction: newActionText.value,
      lastActionAt: actionTimestamp,
    }
    if (newStatus.value === 'closed') {
      updateData.closedAt = actionTimestamp
    }
    await updateDoc(incidentDocRef, updateData)

    newActionText.value = ''
    newActionDate.value = ''
    isActionFormVisible.value = false
  } catch (error) {
    console.error('Error adding action: ', error)
  } finally {
    isLoadingAction.value = false
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

const formatActionText = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

const copyableText = computed(() => {
  if (!incident.value) return ''

  return `*ID* : ${incident.value.id}
*STATUS* : ${incident.value.status}
*PRIORITY* : ${incident.value.priority}
*IMPACT* : ${incident.value.impact}
*URGENCY* : ${incident.value.urgency}
*Nama Insiden* : ${incident.value.incidentName}

*Dibuat* : ${incident.value.creatorName}
*Start* : ${formatDate(incident.value.createdAt)}
*Closed* : ${incident.value.closedAt ? formatDate(incident.value.closedAt) : 'N/A'}

*Last Action* : ${incident.value.lastAction}

*Link* : ${window.location.href}
`
})

const copyToClipboard = () => {
  if (copyTextarea.value) {
    copyTextarea.value.select()
    document.execCommand('copy')
    copyButtonText.value = 'Disalin!'
    setTimeout(() => {
      copyButtonText.value = 'Salin ke Clipboard'
    }, 2000)
  }
}
</script>

<template>
  <div v-if="loading" class="text-center">Memuat detail insiden...</div>
  <div v-else-if="incident" class="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
    <!-- Kolom Kiri (Konten Utama) -->
    <div class="lg:col-span-2 space-y-8">
      <!-- Header -->
      <div>
        <nav class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          <RouterLink to="/incidents" class="hover:underline">Daftar Insiden</RouterLink>
          <span class="mx-2">/</span>
          <span class="text-gray-700 dark:text-gray-200">Detail</span>
        </nav>
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">
          {{ incident.incidentName }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          ID: {{ incident.id }} &bull; Dibuat oleh
          <RouterLink
            :to="`/profile/${incident.creatorUid}`"
            class="font-semibold text-blue-600 hover:underline"
          >
            {{ incident.creatorName }}
          </RouterLink>
        </p>
      </div>

      <!-- Detail Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <p class="text-sm text-gray-500">Status</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ incident.status }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <p class="text-sm text-gray-500">Priority</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ incident.priority }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <p class="text-sm text-gray-500">Impact</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ incident.impact }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <p class="text-sm text-gray-500">Urgency</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ incident.urgency }}</p>
        </div>
      </div>

      <!-- Timeline Action -->
      <div>
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Timeline Action</h2>
        <div class="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3">
          <div v-if="actions.length === 0" class="pl-8 text-gray-500">Belum ada action.</div>
          <div v-else v-for="(action, index) in actions" :key="index" class="mb-8 ml-6">
            <span
              class="absolute flex items-center justify-center w-6 h-6 bg-red-200 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-red-900"
            >
              <svg
                class="w-3 h-3 text-red-600 dark:text-red-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M20 4a2 2 0 00-2-2h-2V1a1 1 0 00-2 0v1h-3V1a1 1 0 00-2 0v1H6V1a1 1 0 00-2 0v1H2a2 2 0 00-2 2v2h20V4zM0 18a2 2 0 002 2h16a2 2 0 002-2V8H0v10z"
                ></path>
              </svg>
            </span>
            <div
              class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
            >
              <div class="mb-2">
                <RouterLink
                  :to="`/profile/${action.actorUid}`"
                  class="text-sm font-semibold text-gray-800 dark:text-white hover:underline"
                  >Oleh: {{ action.actorName }}</RouterLink
                >
                <time class="block text-xs font-normal text-gray-400 dark:text-gray-500">{{
                  formatDate(action.createdAt)
                }}</time>
              </div>
              <p
                class="text-base font-normal text-gray-700 dark:text-gray-200"
                v-html="formatActionText(action.actionText)"
              ></p>
              <p class="text-xs mt-2 text-gray-500">
                Status diubah menjadi: <span class="font-semibold">{{ action.newStatus }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tombol & Form Tambah Action (disembunyikan untuk guest) -->
      <div v-if="!uiStore.isGuest" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div v-if="!isActionFormVisible">
          <button
            @click="isActionFormVisible = true"
            class="w-full text-center font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            + Tambah Action Baru
          </button>
        </div>
        <form v-else @submit.prevent="addAction" class="space-y-4 max-w-3xl mx-auto">
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white text-center mb-6">
            Tambah Action Baru
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                for="newActionDateIncident"
                class="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >Tanggal & Jam Action</label
              >
              <input
                v-model="newActionDate"
                type="datetime-local"
                id="newActionDateIncident"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label
                for="newStatusIncident"
                class="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >Ubah Status Menjadi</label
              >
              <select
                v-model="newStatus"
                id="newStatusIncident"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"
                required
              >
                <option>on-going</option>
                <option>pending</option>
                <option>monitoring</option>
                <option>closed</option>
              </select>
            </div>
          </div>
          <div class="relative">
            <label
              for="newActionIncident"
              class="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >Deskripsi Action</label
            >
            <div
              v-if="showMentionList"
              class="absolute z-10 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto border dark:border-gray-600 bottom-full mb-2"
            >
              <ul>
                <li
                  v-for="item in filteredMentions"
                  :key="item.id || item.uid"
                  @click="selectUserForMention(item.username)"
                  class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200 flex items-center justify-between"
                >
                  <span
                    >@{{ item.username }}
                    <span class="text-gray-500"
                      >- {{ item.displayName || item.groupName }}</span
                    ></span
                  >
                  <span
                    v-if="item.type === 'group'"
                    class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full"
                    >GRUP</span
                  >
                </li>
                <li v-if="filteredMentions.length === 0" class="px-4 py-2 text-sm text-gray-500">
                  Tidak ditemukan.
                </li>
              </ul>
            </div>
            <textarea
              v-model="newActionText"
              id="newActionIncident"
              rows="4"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"
              required
            ></textarea>
          </div>
          <div class="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              @click="isActionFormVisible = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isLoadingAction"
              class="px-6 py-2 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
            >
              {{ isLoadingAction ? 'Menyimpan...' : 'Simpan Action' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Kolom Kanan (Salin Data) -->
    <div class="lg:col-span-1 space-y-8">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md sticky top-24">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Salin Data</h2>
        <textarea
          ref="copyTextarea"
          :value="copyableText"
          readonly
          class="w-full h-64 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md resize-none"
        ></textarea>
        <button
          @click="copyToClipboard"
          class="mt-4 w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ copyButtonText }}
        </button>
      </div>
    </div>
  </div>
  <div v-else><h1 class="text-center text-2xl">Insiden tidak ditemukan.</h1></div>
</template>
