<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { db, auth } from '@/firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore'

const uiStore = useUiStore()
const conversations = ref([])
const activeConversation = ref(null)
const messages = ref([])
const newMessageText = ref('')
const loadingConversations = ref(true)
const loadingMessages = ref(false)

const isNewConversationModalOpen = ref(false)
const allUsers = ref([])
const allGroups = ref([])
const loadingUsers = ref(false)
const loadingGroups = ref(false)
const modalTab = ref('users')

const chatArea = ref(null)
let conversationsListener = null // Untuk menyimpan listener onSnapshot

const scrollToBottom = () => {
  nextTick(() => {
    if (chatArea.value) {
      chatArea.value.scrollTop = chatArea.value.scrollHeight
    }
  })
}

// PERBAIKAN: Gunakan watch untuk memuat data setelah user login
watch(
  () => uiStore.currentUser,
  (currentUser) => {
    if (conversationsListener) conversationsListener() // Hentikan listener lama jika ada

    if (currentUser) {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid),
      )
      conversationsListener = onSnapshot(q, (snapshot) => {
        const convos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        convos.sort(
          (a, b) =>
            (b.lastMessage?.timestamp?.toMillis() || 0) -
            (a.lastMessage?.timestamp?.toMillis() || 0),
        )
        conversations.value = convos
        loadingConversations.value = false

        if (uiStore.chatTargetUser) {
          startConversation(uiStore.chatTargetUser)
          uiStore.clearChatTarget()
        }
      })
    } else {
      // Jika user logout, reset state
      conversations.value = []
      loadingConversations.value = true
    }
  },
  { immediate: true },
)

watch(activeConversation, (newConvo) => {
  if (newConvo) {
    loadingMessages.value = true
    const messagesQuery = query(
      collection(db, 'conversations', newConvo.id, 'messages'),
      orderBy('createdAt', 'asc'),
    )
    onSnapshot(messagesQuery, (snapshot) => {
      messages.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      loadingMessages.value = false
      markConversationAsRead(newConvo)
      scrollToBottom()
    })
  }
})

const sendMessage = async () => {
  const currentUser = uiStore.currentUser
  if (!newMessageText.value.trim() || !activeConversation.value || !currentUser) return
  const convoId = activeConversation.value.id
  const convoRef = doc(db, 'conversations', convoId)

  await addDoc(collection(convoRef, 'messages'), {
    text: newMessageText.value,
    senderId: currentUser.uid,
    senderName: currentUser.displayName,
    createdAt: serverTimestamp(),
    readBy: [currentUser.uid],
  })

  const currentUnreadCounts = activeConversation.value.unreadCounts || {}
  const newUnreadCounts = { ...currentUnreadCounts }
  activeConversation.value.participants.forEach((uid) => {
    if (uid !== currentUser.uid) {
      newUnreadCounts[uid] = (newUnreadCounts[uid] || 0) + 1
    }
  })

  await updateDoc(convoRef, {
    lastMessage: {
      text: newMessageText.value,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
    },
    unreadCounts: newUnreadCounts,
  })
  newMessageText.value = ''
}

const markConversationAsRead = async (convo) => {
  const currentUser = uiStore.currentUser
  if (!convo || !currentUser || !convo.unreadCounts || convo.unreadCounts[currentUser.uid] === 0)
    return

  const convoRef = doc(db, 'conversations', convo.id)
  await updateDoc(convoRef, { [`unreadCounts.${currentUser.uid}`]: 0 })

  const messagesToUpdateQuery = query(
    collection(convoRef, 'messages'),
    where('senderId', '!=', currentUser.uid),
  )

  const unreadSnapshot = await getDocs(messagesToUpdateQuery)
  const batch = writeBatch(db)
  unreadSnapshot.forEach((messageDoc) => {
    const data = messageDoc.data()
    if (data.readBy && !data.readBy.includes(currentUser.uid)) {
      const messageRef = doc(db, 'conversations', convo.id, 'messages', messageDoc.id)
      batch.update(messageRef, { readBy: arrayUnion(currentUser.uid) })
    }
  })
  if (!unreadSnapshot.empty) {
    await batch.commit()
  }
}

const openNewConversationModal = async () => {
  const currentUser = uiStore.currentUser
  if (!currentUser) return
  loadingUsers.value = true
  loadingGroups.value = true
  isNewConversationModalOpen.value = true
  modalTab.value = 'users'

  const usersQuery = query(collection(db, 'users'), where('__name__', '!=', currentUser.uid))
  const usersSnapshot = await getDocs(usersQuery)
  allUsers.value = usersSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }))
  loadingUsers.value = false

  const groupsSnapshot = await getDocs(collection(db, 'groups'))
  allGroups.value = groupsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((group) => group.members.some((member) => member.uid === currentUser.uid))
  loadingGroups.value = false
}

// PERBAIKAN: Fungsi ini ditambahkan kembali
const selectConversation = (convo) => {
  activeConversation.value = convo
}

const startConversation = async (targetUser) => {
  const currentUser = uiStore.currentUser
  if (!currentUser) return
  const existingConvo = conversations.value.find(
    (c) => !c.isGroup && c.participants.includes(targetUser.uid),
  )
  if (existingConvo) {
    activeConversation.value = existingConvo
  } else {
    const newConvoRef = await addDoc(collection(db, 'conversations'), {
      isGroup: false,
      participants: [currentUser.uid, targetUser.uid],
      participantNames: [currentUser.displayName, targetUser.displayName],
      unreadCounts: {},
    })
    const unsub = onSnapshot(doc(db, 'conversations', newConvoRef.id), (doc) => {
      activeConversation.value = { id: doc.id, ...doc.data() }
      unsub()
    })
  }
  isNewConversationModalOpen.value = false
}

const startGroupConversation = async (group) => {
  const existingConvo = conversations.value.find((c) => c.isGroup && c.groupId === group.id)
  if (existingConvo) {
    activeConversation.value = existingConvo
  } else {
    const newConvoRef = await addDoc(collection(db, 'conversations'), {
      isGroup: true,
      groupId: group.id,
      groupName: group.groupName,
      participants: group.members.map((m) => m.uid),
      participantNames: group.members.map((m) => m.displayName),
      unreadCounts: {},
    })
    const unsub = onSnapshot(doc(db, 'conversations', newConvoRef.id), (doc) => {
      activeConversation.value = { id: doc.id, ...doc.data() }
      unsub()
    })
  }
  isNewConversationModalOpen.value = false
}

const getRecipientName = (convo) => {
  const currentUser = uiStore.currentUser
  if (!convo || !currentUser) return '...'
  if (convo.isGroup) return convo.groupName || 'Grup'
  return convo.participantNames?.find((name) => name !== currentUser.displayName) || 'User'
}

const formatMessageTimestamp = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp.seconds * 1000).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getMessageStatus = (message) => {
  if (!activeConversation.value) return 'sent'
  if (message.readBy && message.readBy.length >= activeConversation.value.participants.length) {
    return 'read'
  }
  return 'sent'
}
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 shadow-lg rounded-lg">
    <!-- Kolom Kiri: Daftar Percakapan -->
    <div class="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pesan</h2>
        <button
          @click="openNewConversationModal"
          class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg
            class="w-6 h-6 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="loadingConversations" class="p-4 text-center text-gray-500">Memuat...</div>
        <ul v-else class="divide-y dark:divide-gray-700">
          <li
            v-for="convo in conversations"
            :key="convo.id"
            @click="selectConversation(convo)"
            class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-start"
            :class="{ 'bg-blue-50 dark:bg-blue-900/50': activeConversation?.id === convo.id }"
          >
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-800 dark:text-white">
                {{ getRecipientName(convo) }}
              </p>
              <div class="text-sm text-gray-500 truncate flex items-center">
                <span v-if="convo.lastMessage?.senderId === uiStore.currentUser?.uid" class="mr-1">
                  <svg
                    v-if="convo.lastMessage.readBy && convo.lastMessage.readBy.length > 1"
                    class="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                  <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </span>
                <span>{{ convo.lastMessage?.text || '...' }}</span>
              </div>
            </div>
            <div
              v-if="
                convo.unreadCounts &&
                uiStore.currentUser &&
                convo.unreadCounts[uiStore.currentUser.uid] > 0
              "
              class="ml-2 bg-green-500 text-white text-xs font-bold rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1"
            >
              {{ convo.unreadCounts[uiStore.currentUser.uid] }}
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Kolom Kanan: Jendela Obrolan -->
    <div class="w-2/3 flex flex-col">
      <div v-if="!activeConversation" class="flex-1 flex items-center justify-center">
        <p class="text-gray-500">Pilih percakapan.</p>
      </div>
      <div v-else class="flex-1 flex flex-col">
        <div class="p-4 border-b dark:border-gray-700">
          <h3 class="font-bold text-gray-800 dark:text-white">
            {{ getRecipientName(activeConversation) }}
          </h3>
        </div>
        <div ref="chatArea" class="flex-1 p-4 overflow-y-auto space-y-4">
          <div v-if="loadingMessages">Memuat pesan...</div>
          <div
            v-for="message in messages"
            :key="message.id"
            class="flex flex-col"
            :class="message.senderId === uiStore.currentUser?.uid ? 'items-end' : 'items-start'"
          >
            <div
              class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg"
              :class="
                message.senderId === uiStore.currentUser?.uid
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              "
            >
              <p
                class="font-bold text-sm"
                v-if="activeConversation.isGroup && message.senderId !== uiStore.currentUser?.uid"
              >
                {{ message.senderName }}
              </p>
              <p>{{ message.text }}</p>
            </div>
            <div class="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <span>{{ formatMessageTimestamp(message.createdAt) }}</span>
              <span v-if="message.senderId === uiStore.currentUser?.uid">
                <svg
                  v-if="getMessageStatus(message) === 'read'"
                  class="w-4 h-4 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  ></path>
                  <path
                    fill-rule="evenodd"
                    d="M11.293 5.293a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L12 7.414l-1.293 1.293a1 1 0 01-1.414-1.414l2-2z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </span>
            </div>
          </div>
        </div>
        <div class="p-4 border-t dark:border-gray-700">
          <form @submit.prevent="sendMessage">
            <input
              v-model="newMessageText"
              type="text"
              placeholder="Ketik pesan..."
              class="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </form>
        </div>
      </div>
    </div>

    <!-- Modal untuk Percakapan Baru -->
    <div
      v-if="isNewConversationModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-bold">Mulai Percakapan Baru</h3>
          <button
            @click="isNewConversationModalOpen = false"
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            &times;
          </button>
        </div>
        <div class="border-b dark:border-gray-700">
          <nav class="-mb-px flex space-x-6 px-4">
            <button
              @click="modalTab = 'users'"
              :class="[
                modalTab === 'users'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500',
                'py-3 px-1 border-b-2 font-medium text-sm',
              ]"
            >
              Pengguna</button
            ><button
              @click="modalTab = 'groups'"
              :class="[
                modalTab === 'groups'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500',
                'py-3 px-1 border-b-2 font-medium text-sm',
              ]"
            >
              Grup
            </button>
          </nav>
        </div>
        <div class="p-4 max-h-96 overflow-y-auto">
          <div v-if="modalTab === 'users'">
            <div v-if="loadingUsers">Memuat...</div>
            <ul v-else class="divide-y dark:divide-gray-700">
              <li
                v-for="user in allUsers"
                :key="user.uid"
                @click="startConversation(user)"
                class="p-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded-md"
              >
                <img
                  class="h-10 w-10 rounded-full"
                  :src="
                    user.photoURL ||
                    `https://placehold.co/40x40/E2E8F0/4A5568?text=${user.displayName.charAt(0)}`
                  "
                  alt=""
                />
                <div>
                  <p class="font-semibold text-gray-800 dark:text-white">{{ user.displayName }}</p>
                  <p class="text-sm text-gray-500">{{ user.email }}</p>
                </div>
              </li>
            </ul>
          </div>
          <div v-if="modalTab === 'groups'">
            <div v-if="loadingGroups">Memuat...</div>
            <ul v-else class="divide-y dark:divide-gray-700">
              <li
                v-for="group in allGroups"
                :key="group.id"
                @click="startGroupConversation(group)"
                class="p-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded-md"
              >
                <div
                  class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                >
                  <svg
                    class="w-6 h-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-gray-800 dark:text-white">{{ group.groupName }}</p>
                  <p class="text-sm text-gray-500">{{ group.members.length }} anggota</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
