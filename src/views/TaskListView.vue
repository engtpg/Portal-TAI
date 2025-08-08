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
const tasks = ref([])
const loading = ref(true)
const router = useRouter()
const searchQuery = ref('')
const selectedTasks = ref([])

// State untuk Modal Konfirmasi Hapus
const showConfirmModal = ref(false)
const itemToDelete = ref(null)
const isBulkDelete = ref(false)

// State untuk Sortasi dan Paginasi
const sortKey = ref('createdAt')
const sortOrder = ref('desc')
const itemsPerPage = ref(10)
const currentPage = ref(1)

// 1. Filter
const filteredTasks = computed(() => {
  if (!searchQuery.value) {
    return tasks.value
  }
  return tasks.value.filter(
    (task) =>
      task.taskName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

// 2. Sort
const sortedTasks = computed(() => {
  const sorted = [...filteredTasks.value]
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

// 3. Paginate
const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedTasks.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(sortedTasks.value.length / itemsPerPage.value)
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
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
  onSnapshot(q, (snapshot) => {
    tasks.value = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }))
    loading.value = false
  })
})

// --- LOGIKA HAPUS DATA ---
const openConfirmModal = (task = null, bulk = false) => {
  isBulkDelete.value = bulk
  itemToDelete.value = task
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  itemToDelete.value = null
}

const confirmDelete = async () => {
  if (isBulkDelete.value) {
    const batch = writeBatch(db)
    for (const docId of selectedTasks.value) {
      const actionsSnapshot = await getDocs(collection(db, 'tasks', docId, 'actions'))
      actionsSnapshot.forEach((actionDoc) => {
        batch.delete(actionDoc.ref)
      })
      batch.delete(doc(db, 'tasks', docId))
    }
    await batch.commit()
    selectedTasks.value = []
  } else if (itemToDelete.value) {
    const docId = itemToDelete.value.docId
    const actionsSnapshot = await getDocs(collection(db, 'tasks', docId, 'actions'))
    const batch = writeBatch(db)
    actionsSnapshot.forEach((actionDoc) => {
      batch.delete(actionDoc.ref)
    })
    await batch.commit()
    await deleteDoc(doc(db, 'tasks', docId))
  }
  closeConfirmModal()
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp.seconds * 1000).toLocaleString('id-ID')
}
const goToTaskDetail = (taskId) => {
  router.push(`/tasks/${taskId}`)
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
  document.getElementById('file-input').click()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="text-sm font-medium text-gray-500 dark:text-gray-400">
      <span>Home / </span>
      <span class="text-gray-700 dark:text-gray-200">Task</span>
    </nav>

    <!-- Header Halaman -->
    <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Daftar Task</h1>
      <div v-if="!uiStore.isGuest" class="flex items-center gap-4">
        <button
          v-if="selectedTasks.length >= 2"
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
          Hapus ({{ selectedTasks.length }})
        </button>
        <RouterLink
          to="/tasks/create"
          class="px-4 py-2 font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
        >
          Buat Task Baru
        </RouterLink>
      </div>
    </div>

    <!-- Aksi Tabel -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
      <div class="flex flex-col md:flex-row gap-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari task..."
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
            id="file-input"
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
              v-for="header in ['id', 'createdAt', 'taskName', 'status', 'priority']"
              :key="header"
              @click="handleSort(header)"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div class="flex items-center">
                <span>{{
                  header.replace('createdAt', 'Tanggal').replace('taskName', 'Nama Task')
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
            <td :colspan="uiStore.isGuest ? 5 : 7" class="text-center py-4">Loading data...</td>
          </tr>
          <tr
            v-else
            v-for="task in paginatedTasks"
            :key="task.docId"
            class="hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td v-if="!uiStore.isGuest" class="px-6 py-4">
              <input
                type="checkbox"
                v-model="selectedTasks"
                :value="task.docId"
                class="rounded"
                @click.stop
              />
            </td>
            <td
              @click="goToTaskDetail(task.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              {{ task.id }}
            </td>
            <td
              @click="goToTaskDetail(task.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 cursor-pointer"
            >
              {{ formatDate(task.createdAt) }}
            </td>
            <td
              @click="goToTaskDetail(task.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer"
            >
              {{ task.taskName }}
            </td>
            <td
              @click="goToTaskDetail(task.docId)"
              class="px-6 py-4 whitespace-nowrap cursor-pointer"
            >
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="{
                  'bg-blue-100 text-blue-800': task.status === 'on-going',
                  'bg-yellow-100 text-yellow-800': task.status === 'pending',
                  'bg-green-100 text-green-800': task.status === 'closed',
                }"
                >{{ task.status }}</span
              >
            </td>
            <td
              @click="goToTaskDetail(task.docId)"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 cursor-pointer"
            >
              {{ task.priority }}
            </td>
            <td
              v-if="!uiStore.isGuest"
              class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
            >
              <button
                @click.stop="openConfirmModal(task)"
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
          <tr v-if="!loading && paginatedTasks.length === 0">
            <td :colspan="uiStore.isGuest ? 5 : 7" class="text-center py-4">Tidak ada data.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginasi -->
    <div class="flex items-center justify-between mt-4">
      <div>
        <span class="text-sm text-gray-700 dark:text-gray-400">
          Menampilkan <span class="font-semibold">{{ paginatedTasks.length }}</span> dari
          <span class="font-semibold">{{ sortedTasks.length }}</span> hasil
        </span>
      </div>
      <div class="flex items-center space-x-2">
        <select
          v-model="itemsPerPage"
          @change="currentPage = 1"
          class="rounded-md text-sm dark:bg-gray-700 dark:text-white"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
        >
          Prev
        </button>
        <span class="text-sm">Hal {{ currentPage }} dari {{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Konfirmasi Hapus</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Apakah Anda yakin ingin menghapus
          {{
            isBulkDelete
              ? `${selectedTasks.length} task yang dipilih`
              : `task "${itemToDelete.taskName}"`
          }}? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="mt-6 flex justify-end space-x-4">
          <button
            @click="closeConfirmModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
          >
            Batal
          </button>
          <button
            @click="confirmDelete"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
