<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc, deleteDoc, query, where, getDocs, collection, writeBatch } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const group = ref(null)
const loading = ref(true)
const groupId = route.params.id

// State untuk modal konfirmasi
const showConfirmModal = ref(false)

onMounted(async () => {
  const groupRef = doc(db, 'groups', groupId);
  const docSnap = await getDoc(groupRef);

  if (docSnap.exists()) {
    group.value = docSnap.data();
  } else {
    console.log("No such group!");
  }
  loading.value = false;
});

const deleteGroup = async () => {
  try {
    // 1. Cari dan hapus percakapan grup yang terkait (jika ada)
    const convoQuery = query(collection(db, 'conversations'), where('groupId', '==', groupId), where('isGroup', '==', true));
    const convoSnapshot = await getDocs(convoQuery);
    
    if (!convoSnapshot.empty) {
        const batch = writeBatch(db);
        convoSnapshot.forEach(convoDoc => {
            // Di masa depan, Anda mungkin ingin menghapus sub-koleksi 'messages' juga
            batch.delete(convoDoc.ref);
        });
        await batch.commit();
    }

    // 2. Hapus dokumen grup itu sendiri
    await deleteDoc(doc(db, 'groups', groupId));
    
    // 3. Arahkan kembali ke halaman manajemen
    router.push('/management');
  } catch (error) {
    console.error("Error deleting group and its conversation:", error);
    alert("Gagal menghapus grup.");
  }
}
</script>

<template>
  <div v-if="loading" class="text-center">Memuat grup...</div>
  <div v-else-if="group" class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">{{ group.groupName }}</h1>
        <p class="mt-1 text-lg text-gray-500 dark:text-gray-400">@{{ group.username }}</p>
        <p class="mt-2 text-md text-gray-600 dark:text-gray-300">{{ group.description }}</p>
      </div>
      <!-- Tombol Aksi -->
      <div class="flex items-center space-x-2">
        <RouterLink :to="`/groups/edit/${groupId}`" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          Edit
        </RouterLink>
        <button @click="showConfirmModal = true" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
          Hapus
        </button>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold">Anggota ({{ group.members.length }})</h2>
      </div>
      <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="member in group.members" :key="member.uid" class="px-6 py-4">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ member.displayName }}</p>
        </li>
      </ul>
    </div>
  </div>
  <div v-else>
    <p>Grup tidak ditemukan.</p>
  </div>

  <!-- Modal Konfirmasi Hapus -->
  <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">Konfirmasi Hapus</h3>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Apakah Anda yakin ingin menghapus grup "{{ group.groupName }}"? Semua riwayat percakapan grup ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
      </p>
      <div class="mt-6 flex justify-end space-x-4">
        <button @click="showConfirmModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200">Batal</button>
        <button @click="deleteGroup" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Ya, Hapus</button>
      </div>
    </div>
  </div>
</template>
