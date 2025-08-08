<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth, getNewIncidentId } from '@/firebase'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

const router = useRouter()
const incidentName = ref('')
const priority = ref('LOW')
const impact = ref('LOW')
const urgency = ref('LOW')
const isDownService = ref(false)
const impactNotes = ref('')
const initialAction = ref('')
const creationDate = ref('') // State baru untuk tanggal
const isLoading = ref(false)

const createIncident = async () => {
  if (!incidentName.value || !initialAction.value) return;
  isLoading.value = true;
  try {
    const newId = await getNewIncidentId();
    const user = auth.currentUser;
    
    // Gunakan tanggal dari input, atau waktu server jika kosong
    const createdAtValue = creationDate.value ? Timestamp.fromDate(new Date(creationDate.value)) : serverTimestamp();

    const incidentDocRef = await addDoc(collection(db, 'incidents'), {
      id: newId,
      incidentName: incidentName.value,
      priority: priority.value,
      impact: impact.value,
      urgency: urgency.value,
      isDownService: isDownService.value,
      impactNotes: impactNotes.value,
      status: 'on-going',
      creatorName: user.displayName || 'Anonymous User',
      creatorUid: user.uid,
      createdAt: createdAtValue,
      lastAction: initialAction.value,
      lastActionAt: createdAtValue,
    });

    await addDoc(collection(db, 'incidents', incidentDocRef.id, 'actions'), {
        actionText: initialAction.value,
        actorName: user.displayName || 'Anonymous User',
        actorUid: user.uid,
        createdAt: createdAtValue,
        newStatus: 'on-going'
    });

    router.push('/incidents');
  } catch (error) {
    console.error("Error creating incident: ", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Buat Insiden Baru</h1>
    <div class="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <form @submit.prevent="createIncident" class="space-y-6">
        <div>
          <label for="incidentName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Nama Insiden</label>
          <input v-model="incidentName" type="text" id="incidentName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500" required>
        </div>

        <div>
          <label for="creationDateIncident" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Tanggal & Jam</label>
          <input v-model="creationDate" type="datetime-local" id="creationDateIncident" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500">
          <p class="text-xs text-gray-500 mt-1">Kosongkan untuk waktu saat ini.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Priority</label>
            <select v-model="priority" id="priority" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
          </div>
          <div>
            <label for="impact" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Impact</label>
            <select v-model="impact" id="impact" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
          </div>
          <div>
            <label for="urgency" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Urgency</label>
            <select v-model="urgency" id="urgency" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
          </div>
        </div>
        
        <div class="flex items-center">
            <input v-model="isDownService" id="isDownService" type="checkbox" class="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500">
            <label for="isDownService" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">Down Service?</label>
        </div>
        
        <div>
          <label for="impactNotes" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Impact Notes</label>
          <textarea v-model="impactNotes" id="impactNotes" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"></textarea>
        </div>
        
        <div>
          <label for="initialAction" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Inisiasi Action</label>
          <textarea v-model="initialAction" id="initialAction" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500" required></textarea>
        </div>
        
        <div class="flex justify-end pt-4 border-t dark:border-gray-700">
          <button type="submit" :disabled="isLoading" class="px-6 py-2 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400">
            {{ isLoading ? 'Membuat...' : 'Buat Insiden' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
