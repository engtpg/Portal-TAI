import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'

// Impor komponen yang dibutuhkan
import MainLayout from '../layouts/MainLayout.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import TaskListView from '../views/TaskListView.vue'
import CreateTaskView from '../views/CreateTaskView.vue'
import TaskDetailView from '../views/TaskDetailView.vue'
import IncidentListView from '../views/IncidentListView.vue'
import CreateIncidentView from '../views/CreateIncidentView.vue'
import IncidentDetailView from '../views/IncidentDetailView.vue'
import ManagementView from '../views/ManagementView.vue'
import CreateGroupView from '../views/CreateGroupView.vue'
import GroupDetailView from '../views/GroupDetailView.vue'
import MessagesView from '../views/MessagesView.vue'
// Rute Profil yang baru
import EditProfileView from '../views/EditProfileView.vue' // Ganti nama impor
import ProfileDetailView from '../views/ProfileDetailView.vue' // Impor halaman baru
import EditGroupView from '../views/EditGroupView.vue' 

const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'dashboard', component: DashboardView },
        { path: 'tasks', name: 'task-list', component: TaskListView },
        { path: 'tasks/create', name: 'task-create', component: CreateTaskView },
        { path: 'tasks/:id', name: 'task-detail', component: TaskDetailView },
        { path: 'incidents', name: 'incident-list', component: IncidentListView },
        { path: 'incidents/create', name: 'incident-create', component: CreateIncidentView },
        { path: 'incidents/:id', name: 'incident-detail', component: IncidentDetailView },
        { path: 'management', name: 'management', component: ManagementView },
        { path: 'groups/create', name: 'group-create', component: CreateGroupView },
        { path: 'groups/:id', name: 'group-detail', component: GroupDetailView },
        { path: 'messages', name: 'messages', component: MessagesView },
        // RUTE PROFIL BARU
        { path: 'profile/edit', name: 'profile-edit', component: EditProfileView },
        { path: 'profile/:id', name: 'profile-detail', component: ProfileDetailView },
        { path: 'groups/edit/:id', name: 'group-edit', component: EditGroupView },        
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const currentUser = await getCurrentUser();

  if (requiresAuth && !currentUser) {
    next('/login');
  } else if (to.path === '/login' && currentUser) {
    next('/');
  } else {
    next();
  }
});

export default router
