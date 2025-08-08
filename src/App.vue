<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Jika user login, ambil data lengkapnya
      const userDocRef = doc(db, 'users', user.uid)
      const docSnap = await getDoc(userDocRef)

      let fullUserProfile = {
        uid: user.uid,
        email: user.email,
        isAnonymous: user.isAnonymous, // Penting untuk role guest
      }

      if (docSnap.exists()) {
        fullUserProfile = { ...fullUserProfile, ...docSnap.data() }
      }
      uiStore.setCurrentUser(fullUserProfile)

      // --- LOGIKA TIMER SESSION ---
      if (user.isAnonymous) {
        uiStore.startSessionTimer()
      } else {
        uiStore.clearSessionTimer()
      }
    } else {
      // User logout
      uiStore.setCurrentUser(null)
      uiStore.clearSessionTimer()
    }
  })
})
</script>

<template>
  <RouterView />
</template>
