<script setup>
import { RouterLink } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
</script>

<template>
  <aside
    class="bg-white dark:bg-gray-800 shadow-md h-full fixed pt-16 z-30 transition-transform duration-300"
    :class="{
      'w-64': !uiStore.isSidebarCollapsed,
      'w-20': uiStore.isSidebarCollapsed,
      'translate-x-0': uiStore.isMobileSidebarOpen,
      '-translate-x-full': !uiStore.isMobileSidebarOpen,
      'lg:translate-x-0': true,
    }"
  >
    <div class="px-4 py-6">
      <ul class="space-y-2">
        <li>
          <RouterLink
            to="/"
            @click="uiStore.closeMobileSidebar()"
            class="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              ></path>
            </svg>
            <span class="ml-3" :class="{ hidden: uiStore.isSidebarCollapsed }">Dashboard</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/tasks"
            @click="uiStore.closeMobileSidebar()"
            class="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              ></path>
            </svg>
            <span class="ml-3" :class="{ hidden: uiStore.isSidebarCollapsed }">Task</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/incidents"
            @click="uiStore.closeMobileSidebar()"
            class="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span class="ml-3" :class="{ hidden: uiStore.isSidebarCollapsed }">Incident</span>
          </RouterLink>
        </li>

        <template v-if="!uiStore.isGuest">
          <li>
            <RouterLink
              to="/messages"
              @click="uiStore.closeMobileSidebar()"
              class="flex items-center justify-between p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div class="flex items-center">
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  ></path>
                </svg>
                <span class="ml-3" :class="{ hidden: uiStore.isSidebarCollapsed }">Messages</span>
              </div>
              <span
                v-if="uiStore.totalUnreadMessages > 0 && !uiStore.isSidebarCollapsed"
                class="bg-green-500 text-white text-xs font-bold rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1"
              >
                {{ uiStore.totalUnreadMessages }}
              </span>
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/management"
              @click="uiStore.closeMobileSidebar()"
              class="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
              <span class="ml-3" :class="{ hidden: uiStore.isSidebarCollapsed }"
                >Management User</span
              >
            </RouterLink>
          </li>
        </template>
      </ul>
    </div>
  </aside>
</template>
