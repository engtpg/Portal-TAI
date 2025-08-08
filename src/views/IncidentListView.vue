<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { db, auth } from '@/firebase'
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  writeBatch,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  deleteDoc,
  getDocs,
} from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
const incidents = ref([])
const loading = ref(true)
const router = useRouter()
const searchQuery = ref('')
const selectedIncidents = ref([])

// State untuk Modal Konfirmasi Hapus
const showConfirmModal = ref(false)
const itemToDelete = ref(null)
const isBulkDelete = ref(false)

// State untuk Sortasi dan Paginasi
const sortKey = ref('createdAt')
const sortOrder = ref('desc')
const itemsPerPage = ref(10)
const currentPage = ref(1)

// Computed properties
const filteredIncidents = computed(() => {
  if (!searchQuery.value) {
    return incidents.value
  }
  return incidents.value.filter(
    (incident) =>
      incident.incidentName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})
const sortedIncidents = computed(() => {
  const sorted = [...filteredIncidents.value]
  if (sortKey.value) {
    sorted.sort((a, b) => {
      let valA = a[sortKey.value]
      let valB = b[sortKey.value]
      if (valA && typeof valA.seconds === 'number') valA = valA.seconds
      if (valB && typeof valB.seconds === 'number') valB = valB.seconds
      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }
  return sorted
})
const paginatedIncidents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedIncidents.value.slice(start, end)
})
const totalPages = computed(() => {
  return Math.ceil(sortedIncidents.value.length / itemsPerPage.value)
})

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

onMounted(() => {
  const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'))
  onSnapshot(q, (snapshot) => {
    incidents.value = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }))
    loading.value = false
  })
})

// --- LOGIKA HAPUS DATA ---
const openConfirmModal = (incident = null, bulk = false) => {
  isBulkDelete.value = bulk
  itemToDelete.value = incident
  showConfirmModal.value = true
}
const closeConfirmModal = () => {
  showConfirmModal.value = false
  itemToDelete.value = null
}
const confirmDelete = async () => {
  if (isBulkDelete.value) {
    const batch = writeBatch(db)
    for (const docId of selectedIncidents.value) {
      const actionsSnapshot = await getDocs(collection(db, 'incidents', docId, 'actions'))
      actionsSnapshot.forEach((actionDoc) => {
        batch.delete(actionDoc.ref)
      })
      batch.delete(doc(db, 'incidents', docId))
    }
    await batch.commit()
    selectedIncidents.value = []
  } else if (itemToDelete.value) {
    const docId = itemToDelete.value.docId
    const actionsSnapshot = await getDocs(collection(db, 'incidents', docId, 'actions'))
    const batch = writeBatch(db)
    actionsSnapshot.forEach((actionDoc) => {
      batch.delete(actionDoc.ref)
    })
    await batch.commit()
    await deleteDoc(doc(db, 'incidents', docId))
  }
  closeConfirmModal()
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp.seconds * 1000).toLocaleString('id-ID')
}
const goToIncidentDetail = (incidentId) => {
  router.push(`/incidents/${incidentId}`)
}
const exportData = () => {
  /* ... */
}
const downloadTemplate = () => {
  /* ... */
}
const handleFileUpload = (event) => {
  /* ... */
}
const triggerFileInput = () => {
  document.getElementById('incident-file-input').click()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="text-sm font-medium text-gray-500 dark:text-gray-400">
      <span>Home / </span>
      <span class="text-gray-700 dark:text-gray-200">Insiden</span>
    </nav>

    <!-- Header Halaman -->
    <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Daftar Insiden</h1>
      <div v-if="!uiStore.isGuest" class="flex items-center gap-4">
        <button
          v-if="selectedIncidents.length >= 2"
          @click="openConfirmModal(null, true)"
          class="px-4 py-2 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
          Hapus ({{ selectedIncidents.length }})
        </button>
        <RouterLink
          to="/incidents/create"
          class="px-4 py-2 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Buat Insiden Baru
        </RouterLink>
      </div>
    </div>

    <!-- Aksi Tabel -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
      <div class="flex flex-col md:flex-row gap-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari insiden..."
          class="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-orange-500 focus:border-orange-500"
        />
        <div class="flex-grow"></div>
        <div v-if="!uiStore.isGuest" class="flex items-center gap-2">
          <button
            @click="exportData"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            Export
          </button>
          <button
            @click="downloadTemplate"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            Template
          </button>
          <button
            @click="triggerFileInput"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Import
          </button>
          <input
            type="file"
            id="incident-file-input"
            @change="handleFileUpload"
            class="hidden"
            accept=".xlsx, .xls"
          />
        </div>
      </div>
    </div>

    <!-- Tabel Data -->
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th v-if="!uiStore.isGuest" class="px-6 py-3">
              <input type="checkbox" class="rounded" />
            </th>
            <th
              v-for="header in ['id', 'createdAt', 'incidentName', 'status', 'priority', 'impact']"
              :key="header"
              @click="handleSort(header)"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div class="flex items-center">
                <span>{{
                  header.replace('createdAt', 'Tanggal').replace('incidentName', 'Nama Insiden')
                }}</span>
                <span v-if="sortKey === header" class="ml-1">
                  <svg
                    v-if="sortOrder === 'asc'"
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 15l7-7 7 7"
                    ></path>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </span>
              </div>
            </th>
            <th
              v-if="!uiStore.isGuest"
              class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Aksi
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
          <tr v-if="loading">
            <td :colspan="uiStore.isGuest ? 6 : 8" class="text-center py-4">Loading...</td>
          </tr>
          <tr
            v-else
            v-for="incident in paginatedIncidents"
            :key="incident.docId"
            class="hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td v-if="!uiStore.isGuest" class="px-6 py-4">
              <input
                type="checkbox"
                v-model="selectedIncidents"
                :value="incident.docId"
                class="rounded"
                @click.stop
              />
            </td>
            <td
              @click="goToIncidentDetail(incident.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer"
            >
              {{ incident.id }}
            </td>
            <td
              @click="goToIncidentDetail(incident.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
            >
              {{ formatDate(incident.createdAt) }}
            </td>
            <td
              @click="goToIncidentDetail(incident.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer"
            >
              {{ incident.incidentName }}
            </td>
            <td
              @click="goToIncidentDetail(incident.docId)"
              class="px-6 py-4 whitespace-nowrap cursor-pointer"
            >
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800"
                >{{ incident.status }}</span
              >
            </td>
            <td
              @click="goToIncidentDetail(incident.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
            >
              {{ incident.priority }}
            </td>
            <td
              @click="goToIncidentDetail(incident.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
            >
              {{ incident.impact }}
            </td>
            <td
              v-if="!uiStore.isGuest"
              class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
            >
              <button
                @click.stop="openConfirmModal(incident)"
                class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </td>
          </tr>
          <tr v-if="!loading && paginatedIncidents.length === 0">
            <td :colspan="uiStore.isGuest ? 6 : 8" class="text-center py-4">Tidak ada data.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginasi -->
    <div class="flex items-center justify-between mt-4">
      <!-- ... (tidak berubah) ... -->
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
    >
      <!-- ... (tidak berubah) ... -->
    </div>
  </div>
</template>
