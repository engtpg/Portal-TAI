<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore'

const router = useRouter()

// Untuk Timer
const lastDownTime = ref(null)
const timeSinceDown = ref('Memuat data...')
let timerInterval = null

// Untuk Kanban
const tasks = ref([])
const incidents = ref([])
const loading = ref(true)

// Fungsi untuk menghitung dan memformat waktu
const startTimer = () => {
  if (!lastDownTime.value) {
    timeSinceDown.value = 'Tidak ada insiden "Down Service" yang tercatat.'
    return
  }
  
  timerInterval = setInterval(() => {
    const now = new Date()
    const diff = now.getTime() - lastDownTime.value.getTime()

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    timeSinceDown.value = `${String(hours).padStart(4, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, 1000)
}

// Computed properties untuk mengelompokkan data berdasarkan status
const getItemsByStatus = (items) => {
  const statuses = ['on-going', 'pending', 'monitoring', 'closed']
  const grouped = {}
  statuses.forEach(status => {
    grouped[status] = items.filter(item => item.status === status)
  })
  return grouped
}

const tasksByStatus = computed(() => getItemsByStatus(tasks.value))
const incidentsByStatus = computed(() => getItemsByStatus(incidents.value))

// Navigasi saat kartu diklik
const goToDetail = (type, id) => {
  router.push(`/${type}/${id}`)
}

onMounted(async () => {
  // 1. Ambil data untuk Timer
  const q = query(
    collection(db, 'incidents'),
    where('isDownService', '==', true),
    where('status', '==', 'closed'),
    orderBy('closedAt', 'desc'),
    limit(1)
  )
  const querySnapshot = await getDocs(q)
  if (!querySnapshot.empty) {
    const lastIncident = querySnapshot.docs[0].data()
    if (lastIncident.closedAt) {
      lastDownTime.value = lastIncident.closedAt.toDate()
      startTimer()
    }
  } else {
     timeSinceDown.value = 'Tidak ada insiden "Down Service" yang tercatat.'
  }

  // 2. Ambil data untuk Kanban Task (real-time)
  const tasksQuery = query(collection(db, 'tasks'))
  onSnapshot(tasksQuery, (snapshot) => {
    tasks.value = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }))
  })

  // 3. Ambil data untuk Kanban Insiden (real-time)
  const incidentsQuery = query(collection(db, 'incidents'))
  onSnapshot(incidentsQuery, (snapshot) => {
    incidents.value = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }))
  })

  loading.value = false
})

// Hentikan interval saat komponen dihancurkan untuk mencegah memory leak
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

// Helper untuk styling status
const getStatusClass = (status) => {
    switch (status) {
        case 'on-going': return 'border-blue-500';
        case 'pending': return 'border-yellow-500';
        case 'monitoring': return 'border-purple-500';
        case 'closed': return 'border-green-500';
        default: return 'border-gray-300';
    }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Breadcrumb -->
    <nav class="text-sm font-medium text-gray-500 dark:text-gray-400">
      <span>Home / </span>
      <span class="text-gray-700 dark:text-gray-200">Dashboard</span>
    </nav>

    <!-- Bagian Timer -->
    <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
      <h2 class="text-lg font-semibold text-gray-500 dark:text-gray-400">Waktu Sejak Terakhir Down</h2>
      <p class="text-5xl font-bold text-gray-800 dark:text-white mt-2 tracking-wider">{{ timeSinceDown }}</p>
    </div>

    <!-- Papan Kanban -->
    <div class="space-y-10">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-4">All Insiden Report</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="(incidentList, status) in incidentsByStatus" :key="status" 
               class="bg-gray-50 dark:bg-gray-800/50 rounded-xl flex flex-col">
            <h3 class="font-bold text-gray-800 dark:text-white p-4 border-b-2" :class="getStatusClass(status)">
              <span class="capitalize">{{ status.replace('-', ' ') }}</span>
              <span class="ml-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">{{ incidentList.length }}</span>
            </h3>
            <!-- Area Kartu dengan Scroll -->
            <div class="p-4 space-y-3 flex-1 overflow-y-auto max-h-[28rem]">
              <div v-if="incidentList.length === 0" class="text-center text-sm text-gray-500 pt-4">Kosong</div>
              <div v-else v-for="incident in incidentList" :key="incident.docId" @click="goToDetail('incidents', incident.docId)"
                   class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all"
                   :class="{'border-l-4 border-red-500': incident.isDownService}">
                <p class="font-semibold text-sm text-gray-800 dark:text-gray-200">{{ incident.incidentName }}</p>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-500">{{ incident.id }}</span>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                        :class="{
                          'bg-yellow-100 text-yellow-800': incident.priority === 'MEDIUM',
                          'bg-red-100 text-red-800': incident.priority === 'HIGH' || incident.priority === 'CRITICAL',
                          'bg-blue-100 text-blue-800': incident.priority === 'LOW'
                        }">{{ incident.priority }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        <!-- Kanban Tasks -->
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-4">All Task Data</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="(taskList, status) in tasksByStatus" :key="status" 
               class="bg-gray-50 dark:bg-gray-800/50 rounded-xl flex flex-col">
            <h3 class="font-bold text-gray-800 dark:text-white p-4 border-b-2" :class="getStatusClass(status)">
              <span class="capitalize">{{ status.replace('-', ' ') }}</span>
              <span class="ml-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">{{ taskList.length }}</span>
            </h3>
            <!-- Area Kartu dengan Scroll -->
            <div class="p-4 space-y-3 flex-1 overflow-y-auto max-h-[28rem]">
              <div v-if="taskList.length === 0" class="text-center text-sm text-gray-500 pt-4">Kosong</div>
              <div v-else v-for="task in taskList" :key="task.docId" @click="goToDetail('tasks', task.docId)"
                   class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all">
                <p class="font-semibold text-sm text-gray-800 dark:text-gray-200">{{ task.taskName }}</p>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-500">{{ task.id }}</span>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                        :class="{
                          'bg-yellow-100 text-yellow-800': task.priority === 'MEDIUM',
                          'bg-red-100 text-red-800': task.priority === 'HIGH' || task.priority === 'CRITICAL',
                          'bg-blue-100 text-blue-800': task.priority === 'LOW'
                        }">{{ task.priority }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kanban Incidents -->
      
    </div>
  </div>
</template>
