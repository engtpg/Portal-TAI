<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase'
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth'

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const router = useRouter()
const errorMessage = ref('')
const isLoading = ref(false)

// State untuk fitur lihat password
const isPasswordVisible = ref(false)
const passwordFieldType = computed(() => isPasswordVisible.value ? 'text' : 'password')

const togglePasswordVisibility = () => {
  isPasswordVisible.value = !isPasswordVisible.value
}

const login = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/')
  } catch (error) {
    errorMessage.value = 'Email atau password yang Anda masukkan salah.'
  } finally {
    isLoading.value = false
  }
}

const loginAsGuest = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await signInAnonymously(auth)
    router.push('/')
  } catch (error) {
    errorMessage.value = 'Gagal login sebagai guest. Coba lagi nanti.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-100 dark:bg-gray-900">
    <!-- Kolom Kiri (Branding) - Diubah ke warna biru logo -->
    <div class="hidden lg:flex w-1/2 items-center justify-center bg-blue-700 text-white p-12">
      <div class="max-w-md text-center">
        <!-- Anda bisa menempatkan logo di sini jika mau -->
        <!-- <img src="/path/to/logo-white.png" alt="Logo Satkomindo" class="mx-auto mb-8 h-12"> -->
        <h1 class="text-5xl font-bold mb-4">PORTAL TAI</h1>
        <p class="text-2xl font-semibold mb-6">Task And Incident</p>
        <p class="text-blue-200">
          Selamat datang kembali! Silakan masuk untuk mengelola semua task dan insiden Anda di satu tempat yang terpusat.
        </p>
      </div>
    </div>

    <!-- Kolom Kanan (Form Login) -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-6">
      <div class="w-full max-w-md">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 class="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">Login ke Akun Anda</h2>
          <p class="text-center text-gray-500 dark:text-gray-400 mb-8">Masukkan kredensial Anda untuk melanjutkan</p>

          <!-- Pesan Error -->
          <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {{ errorMessage }}
          </div>

          <form @submit.prevent="login" class="space-y-6">
            <!-- Input Email -->
            <div>
              <label for="email" class="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <div class="relative mt-1">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </span>
                <input v-model="email" id="email" type="email" required placeholder="anda@email.com"
                       class="w-full pl-10 pr-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
              </div>
            </div>

            <!-- Input Password -->
            <div>
              <label for="password" class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div class="relative mt-1">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </span>
                <input v-model="password" id="password" :type="passwordFieldType" required placeholder="••••••••"
                       class="w-full pl-10 pr-10 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                <button type="button" @click="togglePasswordVisibility" class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg v-if="!isPasswordVisible" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .946-3.11 3.56-5.446 6.81-6.18M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.582 17.582l-2.09-2.09m-2.09-2.09L9.172 9.172m4.242 4.242L17.582 17.582M3 3l18 18"></path></svg>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input v-model="rememberMe" id="remember-me" type="checkbox" class="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 dark:bg-gray-600 dark:border-gray-500">
                <label for="remember-me" class="block ml-2 text-sm text-gray-900 dark:text-gray-300">Ingat Saya</label>
              </div>
            </div>

            <div>
              <button type="submit" :disabled="isLoading"
                      class="w-full flex justify-center px-4 py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300 dark:focus:ring-offset-gray-800 transition-colors duration-300">
                <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ isLoading ? 'Memproses...' : 'Login' }}
              </button>
            </div>
          </form>

          <div class="mt-6 text-center">
            <button @click="loginAsGuest" :disabled="isLoading" class="text-sm text-orange-600 hover:underline dark:text-orange-400">
              atau Login sebagai Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>