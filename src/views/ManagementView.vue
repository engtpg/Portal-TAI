<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { db } from '@/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

const router = useRouter()
const activeTab = ref('users')
const users = ref([])
const groups = ref([])
const loading = ref(true)

const fetchUsers = async () => {
  const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
  const querySnapshot = await getDocs(usersQuery);
  users.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

const fetchGroups = async () => {
  const groupsQuery = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(groupsQuery);
  groups.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

const goToGroupDetail = (groupId) => {
  router.push(`/groups/${groupId}`)
}

onMounted(async () => {
  loading.value = true;
  await Promise.all([fetchUsers(), fetchGroups()]);
  loading.value = false;
})
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="text-sm font-medium text-gray-500 dark:text-gray-400">
      <span>Home / </span>
      <span class="text-gray-700 dark:text-gray-200">Manajemen</span>
    </nav>

    <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Manajemen User & Grup</h1>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button @click="activeTab = 'users'" :class="[activeTab === 'users' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']">
          Daftar Pengguna
        </button>
        <button @click="activeTab = 'groups'" :class="[activeTab === 'groups' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']">
          Daftar Grup
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Users Tab -->
      <div v-if="activeTab === 'users'">
        <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
            <li v-for="user in users" :key="user.id">
              <RouterLink :to="`/profile/${user.id}`" class="px-6 py-4 flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <img class="h-10 w-10 rounded-full object-cover" :src="user.photoURL || `https://placehold.co/40x40/E2E8F0/4A5568?text=${user.displayName.charAt(0)}`" alt="Avatar">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate dark:text-white">{{ user.displayName }}</p>
                  <p class="text-sm text-gray-500 truncate dark:text-gray-400">@{{ user.username }}</p>
                </div>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
      <!-- Groups Tab -->
      <div v-if="activeTab === 'groups'">
        <div class="flex justify-end mb-4">
          <RouterLink to="/groups/create" class="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Buat Grup Baru
          </RouterLink>
        </div>
        <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
            <li v-for="group in groups" :key="group.id">
              <div @click="goToGroupDetail(group.id)" class="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ group.groupName }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">@{{ group.username }} &bull; {{ group.members.length }} anggota</p>
              </div>
            </li>
            <li v-if="groups.length === 0" class="px-6 py-4 text-center text-sm text-gray-500">
                Belum ada grup yang dibuat.
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
