<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '@/firebase'
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore'

const router = useRouter()
const allUsers = ref([])
const selectedMembers = ref([])
const groupName = ref('')
const username = ref('') // State baru untuk username grup
const description = ref('')
const isLoading = ref(false)

// State untuk validasi username
const usernameStatus = ref({ message: '', color: '' })
let debounceTimer = null

onMounted(async () => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  allUsers.value = querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));
})

// Fungsi untuk memeriksa keunikan username grup
const checkUsername = async () => {
  usernameStatus.value = { message: 'Mengecek...', color: 'text-gray-500' }
  if (!username.value) { usernameStatus.value = { message: '', color: '' }; return; }
  if (username.value.length < 5 || username.value.length > 18) { usernameStatus.value = { message: 'Harus 5-18 karakter.', color: 'text-red-500' }; return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username.value)) { usernameStatus.value = { message: 'Hanya huruf, angka, dan _.', color: 'text-red-500' }; return; }

  const q = query(collection(db, 'groups'), where('username', '==', username.value));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    usernameStatus.value = { message: 'Username tersedia!', color: 'text-green-500' };
  } else {
    usernameStatus.value = { message: 'Username sudah digunakan.', color: 'text-red-500' };
  }
}

// Watcher untuk username dengan debounce
watch(username, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    checkUsername()
  }, 500)
})

const createGroup = async () => {
  if (!groupName.value || !username.value || selectedMembers.value.length === 0) {
    alert('Nama grup, username, dan minimal satu anggota harus diisi.');
    return;
  }
  if (usernameStatus.value.color === 'text-red-500') {
    alert('Username grup tidak valid atau sudah digunakan.');
    return;
  }

  isLoading.value = true;
  try {
    await addDoc(collection(db, 'groups'), {
      groupName: groupName.value,
      username: username.value,
      description: description.value,
      members: selectedMembers.value.map(uid => {
        const user = allUsers.value.find(u => u.uid === uid);
        return { uid: user.uid, displayName: user.displayName };
      }),
      creatorUid: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    router.push('/management');
  } catch (error) {
    console.error("Error creating group: ", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Buat Grup Baru</h1>
    <div class="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <form @submit.prevent="createGroup" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="groupName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Nama Grup</label>
              <input v-model="groupName" type="text" id="groupName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" required>
            </div>
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Username Grup</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
                <input v-model="username" type="text" id="username" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 pl-7" required>
              </div>
              <p v-if="usernameStatus.message" :class="usernameStatus.color" class="text-xs mt-1">{{ usernameStatus.message }}</p>
            </div>
        </div>
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Deskripsi</label>
          <textarea v-model="description" id="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Pilih Anggota</label>
          <div class="mt-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-2">
            <div v-for="user in allUsers" :key="user.uid" class="flex items-center">
              <input :id="`user-${user.uid}`" :value="user.uid" v-model="selectedMembers" type="checkbox" class="h-4 w-4 text-orange-600 border-gray-300 rounded">
              <label :for="`user-${user.uid}`" class="ml-3 text-sm text-gray-700 dark:text-gray-300">{{ user.displayName }} (@{{ user.username }})</label>
            </div>
          </div>
        </div>
        <div class="flex justify-end">
          <button type="submit" :disabled="isLoading" class="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {{ isLoading ? 'Membuat...' : 'Buat Grup' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
