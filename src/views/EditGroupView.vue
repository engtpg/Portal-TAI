<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, auth } from '@/firebase'
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const groupId = route.params.id

const allUsers = ref([])
const selectedMembers = ref([])
const groupName = ref('')
const username = ref('')
const initialUsername = ref('')
const description = ref('')
const isLoading = ref(false)
const loadingData = ref(true)

const usernameStatus = ref({ message: '', color: '' })
let debounceTimer = null

onMounted(async () => {
  // Ambil data semua user untuk pilihan anggota
  const usersSnapshot = await getDocs(collection(db, 'users'));
  allUsers.value = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

  // Ambil data grup yang akan diedit
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (groupSnap.exists()) {
    const groupData = groupSnap.data();
    groupName.value = groupData.groupName;
    username.value = groupData.username;
    initialUsername.value = groupData.username;
    description.value = groupData.description;
    selectedMembers.value = groupData.members.map(m => m.uid);
  }
  loadingData.value = false;
})

const checkUsername = async () => {
  if (username.value === initialUsername.value) {
    usernameStatus.value = { message: '', color: '' }; return;
  }
  // ... (logika validasi username sama seperti di CreateGroupView) ...
}

watch(username, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { checkUsername() }, 500)
})

const updateGroup = async () => {
  if (!groupName.value || !username.value || selectedMembers.value.length === 0) {
    alert('Nama grup, username, dan minimal satu anggota harus diisi.'); return;
  }
  if (usernameStatus.value.color === 'text-red-500') {
    alert('Username grup tidak valid atau sudah digunakan.'); return;
  }

  isLoading.value = true;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      groupName: groupName.value,
      username: username.value,
      description: description.value,
      members: selectedMembers.value.map(uid => {
        const user = allUsers.value.find(u => u.uid === uid);
        return { uid: user.uid, displayName: user.displayName };
      }),
    });
    router.push('/management');
  } catch (error) {
    console.error("Error updating group: ", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div v-if="loadingData" class="text-center">Memuat data grup...</div>
  <div v-else>
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Edit Grup</h1>
    <div class="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <form @submit.prevent="updateGroup" class="space-y-6">
        <!-- Formnya sama persis dengan CreateGroupView, hanya tombol submit yang berbeda -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="groupName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Nama Grup</label>
              <input v-model="groupName" type="text" id="groupName" class="mt-1 block w-full rounded-md" required>
            </div>
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Username Grup</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
                <input v-model="username" type="text" id="username" class="mt-1 block w-full rounded-md pl-7" required>
              </div>
              <p v-if="usernameStatus.message" :class="usernameStatus.color" class="text-xs mt-1">{{ usernameStatus.message }}</p>
            </div>
        </div>
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Deskripsi</label>
          <textarea v-model="description" id="description" rows="3" class="mt-1 block w-full rounded-md"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Pilih Anggota</label>
          <div class="mt-2 max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
            <div v-for="user in allUsers" :key="user.uid" class="flex items-center">
              <input :id="`user-${user.uid}`" :value="user.uid" v-model="selectedMembers" type="checkbox" class="h-4 w-4 text-orange-600 border-gray-300 rounded">
              <label :for="`user-${user.uid}`" class="ml-3 text-sm text-gray-700 dark:text-gray-300">{{ user.displayName }} (@{{ user.username }})</label>
            </div>
          </div>
        </div>
        <div class="flex justify-end">
          <button type="submit" :disabled="isLoading" class="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {{ isLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
