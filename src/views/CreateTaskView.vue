<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth, getNewTaskId } from '@/firebase'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

const router = useRouter()
const taskName = ref('')
const priority = ref('LOW')
const initialAction = ref('')
const creationDate = ref('') // State baru untuk tanggal
const isLoading = ref(false)
const errorMessage = ref('')

const createTask = async () => {
  if (!taskName.value || !initialAction.value) {
    errorMessage.value = 'Nama Task dan Inisiasi Action wajib diisi.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const newId = await getNewTaskId()
    const user = auth.currentUser
    
    // Gunakan tanggal dari input, atau waktu server jika kosong
    const createdAtValue = creationDate.value ? Timestamp.fromDate(new Date(creationDate.value)) : serverTimestamp();

    // 1. Buat dokumen task utama
    const taskDocRef = await addDoc(collection(db, 'tasks'), {
      id: newId,
      taskName: taskName.value,
      priority: priority.value,
      status: 'on-going',
      creatorName: user.displayName || 'Anonymous User',
      creatorUid: user.uid,
      createdAt: createdAtValue,
      lastAction: initialAction.value,
      lastActionAt: createdAtValue,
    });

    // 2. Buat dokumen action pertama di sub-koleksi
    await addDoc(collection(db, 'tasks', taskDocRef.id, 'actions'), {
        actionText: initialAction.value,
        actorName: user.displayName || 'Anonymous User',
        actorUid: user.uid,
        createdAt: createdAtValue,
        newStatus: 'on-going'
    });

    console.log("Task created successfully!");
    router.push('/tasks') // Kembali ke daftar task
  } catch (error) {
    console.error("Error creating task: ", error);
    errorMessage.value = 'Gagal membuat task. Coba lagi.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Buat Task Baru</h1>
    <div class="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <form @submit.prevent="createTask" class="space-y-6">
        <div>
          <label for="taskName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Nama Task</label>
          <input v-model="taskName" type="text" id="taskName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500">
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="creationDate" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Tanggal & Jam</label>
            <input v-model="creationDate" type="datetime-local" id="creationDate" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500">
            <p class="text-xs text-gray-500 mt-1">Kosongkan untuk waktu saat ini.</p>
          </div>
          <div>
            <label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Priority</label>
            <select v-model="priority" id="priority" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500">
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
          </div>
        </div>

        <div>
          <label for="initialAction" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Inisiasi Action</label>
          <textarea v-model="initialAction" id="initialAction" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"></textarea>
        </div>
        
        <div v-if="errorMessage" class="p-3 bg-red-100 text-red-700 rounded-md">
          {{ errorMessage }}
        </div>

        <div class="flex justify-end pt-4 border-t dark:border-gray-700">
          <button type="submit" :disabled="isLoading" class="px-6 py-2 font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:bg-orange-400">
            {{ isLoading ? 'Membuat...' : 'Buat Task' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
