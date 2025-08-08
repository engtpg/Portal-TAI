<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { doc, setDoc, getDocs, collection, query, where, getDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'

const uiStore = useUiStore()

// State untuk form edit profil
const displayName = ref('')
const username = ref('')
const description = ref('')
const photoURL = ref('')
const initialUsername = ref('')

// State untuk form ubah password
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const isPasswordFormVisible = ref(false)

// State untuk notifikasi dan validasi
const profileMessage = ref({ text: '', type: 'success' })
const passwordMessage = ref({ text: '', type: 'success' })
const usernameStatus = ref({ message: '', color: '' })
let debounceTimer = null

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return;
  if (file.size > 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal 1MB.');
      return;
  }
  const reader = new FileReader()
  reader.onload = (e) => { photoURL.value = e.target.result }
  reader.readAsDataURL(file)
}

const triggerFileInput = () => { document.getElementById('photo-upload').click() }

onMounted(async () => {
  if (uiStore.currentUser) {
    displayName.value = uiStore.currentUser.displayName || ''
    photoURL.value = uiStore.currentUser.photoURL || ''
    const userDocRef = doc(db, 'users', uiStore.currentUser.uid)
    const docSnap = await getDoc(userDocRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      username.value = data.username || ''
      initialUsername.value = data.username || ''
      description.value = data.description || ''
      if (data.photoURL) photoURL.value = data.photoURL
    }
  }
})

const checkUsername = async () => {
  usernameStatus.value = { message: 'Mengecek...', color: 'text-gray-500' }
  if (!username.value) { usernameStatus.value = { message: '', color: '' }; return; }
  if (username.value === initialUsername.value) { usernameStatus.value = { message: 'Username tersedia!', color: 'text-green-500' }; return; }
  if (username.value.length < 5 || username.value.length > 18) { usernameStatus.value = { message: 'Harus 5-18 karakter.', color: 'text-red-500' }; return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username.value)) { usernameStatus.value = { message: 'Hanya huruf, angka, dan _.', color: 'text-red-500' }; return; }
  const q = query(collection(db, 'users'), where('username', '==', username.value));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) { usernameStatus.value = { message: 'Username tersedia!', color: 'text-green-500' }; } 
  else { usernameStatus.value = { message: 'Username sudah digunakan.', color: 'text-red-500' }; }
}

watch(username, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { checkUsername() }, 500)
})

const handleProfileUpdate = async () => {
  if (usernameStatus.value.color === 'text-red-500') {
    profileMessage.value = { text: 'Username tidak valid atau sudah digunakan.', type: 'error' }; return;
  }
  profileMessage.value = { text: '', type: '' }
  try {
    const user = auth.currentUser
    await updateProfile(user, { displayName: displayName.value })
    const userDocRef = doc(db, 'users', user.uid)
    await setDoc(userDocRef, {
      displayName: displayName.value, username: username.value, description: description.value,
      photoURL: photoURL.value, email: user.email
    }, { merge: true })
    uiStore.setCurrentUser({ ...user, displayName: displayName.value, photoURL: photoURL.value, username: username.value })
    initialUsername.value = username.value;
    profileMessage.value = { text: 'Profil berhasil diperbarui!', type: 'success' }
  } catch (error) {
    profileMessage.value = { text: 'Gagal memperbarui profil.', type: 'error' }
  }
}

const handlePasswordUpdate = async () => {
  passwordMessage.value = { text: '', type: '' };
  if (newPassword.value !== confirmNewPassword.value) { passwordMessage.value = { text: 'Password baru dan konfirmasi tidak cocok.', type: 'error' }; return; }
  if (newPassword.value.length < 6) { passwordMessage.value = { text: 'Password baru minimal harus 6 karakter.', type: 'error' }; return; }
  try {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword.value);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword.value);
    passwordMessage.value = { text: 'Password berhasil diubah!', type: 'success' };
    currentPassword.value = ''; newPassword.value = ''; confirmNewPassword.value = '';
    isPasswordFormVisible.value = false;
  } catch (error) {
    passwordMessage.value = { text: 'Gagal mengubah password. Pastikan password saat ini benar.', type: 'error' };
  }
}
</script>

<template>
  <div class="space-y-8 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Edit Profile</h1>

    <!-- Form Edit Profil -->
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
      <h2 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Informasi Profil</h2>
      <form @submit.prevent="handleProfileUpdate" class="space-y-6">
        <div v-if="profileMessage.text" :class="profileMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="p-3 rounded-lg text-sm">
          {{ profileMessage.text }}
        </div>
        <div class="flex items-center space-x-6">
          <img class="h-24 w-24 rounded-full object-cover" :src="photoURL || `https://placehold.co/96x96/E2E8F0/4A5568?text=${displayName.charAt(0)}`" alt="Avatar">
          <div>
            <button type="button" @click="triggerFileInput" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
              Ubah Foto
            </button>
            <input type="file" id="photo-upload" class="hidden" @change="onFileChange" accept="image/png, image/jpeg">
            <p class="text-xs text-gray-500 mt-2">PNG atau JPG (Maks. 1MB).</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Nama Lengkap</label>
            <input v-model="displayName" type="text" id="displayName" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500">
          </div>
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
              <input v-model="username" type="text" id="username" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 pl-7 focus:border-orange-500 focus:ring-orange-500">
            </div>
            <p v-if="usernameStatus.message" :class="usernameStatus.color" class="text-xs mt-1">{{ usernameStatus.message }}</p>
          </div>
        </div>
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Deskripsi</label>
          <textarea v-model="description" id="description" rows="3" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500"></textarea>
        </div>
        <div class="text-right pt-4 border-t dark:border-gray-700">
          <button type="submit" class="px-6 py-2 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>

    <!-- Form Ubah Password -->
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
      <h2 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Keamanan Akun</h2>
      <div v-if="!isPasswordFormVisible">
        <p class="text-gray-600 dark:text-gray-400 mb-4">Ubah password Anda secara berkala untuk menjaga keamanan akun.</p>
        <button @click="isPasswordFormVisible = true" class="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Ubah Password
        </button>
      </div>
      <form v-else @submit.prevent="handlePasswordUpdate" class="space-y-6">
        <div v-if="passwordMessage.text" :class="passwordMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="p-3 rounded-lg text-sm">
          {{ passwordMessage.text }}
        </div>
        <div>
          <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Password Saat Ini</label>
          <input v-model="currentPassword" type="password" id="currentPassword" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500" required>
        </div>
        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Password Baru</label>
          <input v-model="newPassword" type="password" id="newPassword" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500" required>
        </div>
        <div>
          <label for="confirmNewPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Konfirmasi Password Baru</label>
          <input v-model="confirmNewPassword" type="password" id="confirmNewPassword" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500" required>
        </div>
        <div class="flex justify-end space-x-4 pt-4 border-t dark:border-gray-700">
          <button type="button" @click="isPasswordFormVisible = false" class="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
            Batal
          </button>
          <button type="submit" class="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Ubah Password
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
