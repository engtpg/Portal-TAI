// Import fungsi yang kita butuhkan dari Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// Konfigurasi Firebase untuk aplikasi web Anda
const firebaseConfig = {
  apiKey: "AIzaSyBV6KActlGWYSZsljVSK4sFXh_7l3h-WWU",
  authDomain: "portal-tai.firebaseapp.com",
  projectId: "portal-tai",
  storageBucket: "portal-tai.firebasestorage.app",
  messagingSenderId: "884224419564",
  appId: "1:884224419564:web:27fe5f1721823cf56aa7c9",
  measurementId: "G-6KFM4EDJP7"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor layanan yang akan kita gunakan di seluruh aplikasi
export const auth = getAuth(app);
export const db = getFirestore(app);
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

export const getNewTaskId = async () => {
  const counterRef = doc(db, 'counters', 'taskCounter');

  try {
    const newIdNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentYear = new Date().getFullYear().toString().slice(-2); // '25' untuk 2025

      if (!counterDoc.exists()) {
        transaction.set(counterRef, { lastNumber: 1, year: currentYear });
        return 1;
      }

      const data = counterDoc.data();
      let newNumber = data.lastNumber + 1;

      if (data.year !== currentYear) {
        // Jika tahun berganti, reset nomor ke 1
        newNumber = 1;
        transaction.update(counterRef, { lastNumber: newNumber, year: currentYear });
      } else {
        transaction.update(counterRef, { lastNumber: newNumber });
      }

      return newNumber;
    });

    // Format ID: Task-YYXXX
    const formattedId = `Task-${new Date().getFullYear().toString().slice(-2)}${newIdNumber.toString().padStart(3, '0')}`;
    return formattedId;

  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e; // Lemparkan error agar bisa ditangani di form
  }
};
// Tambahkan kode ini di src/firebase.js

export const getNewIncidentId = async () => {
  const counterRef = doc(db, 'counters', 'incidentCounter'); // Menggunakan counter yang berbeda

  try {
    const newIdNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentYear = new Date().getFullYear().toString().slice(-2);

      if (!counterDoc.exists()) {
        transaction.set(counterRef, { lastNumber: 1, year: currentYear });
        return 1;
      }

      const data = counterDoc.data();
      let newNumber = data.lastNumber + 1;

      if (data.year != currentYear) {
        newNumber = 1;
        transaction.update(counterRef, { lastNumber: newNumber, year: currentYear });
      } else {
        transaction.update(counterRef, { lastNumber: newNumber });
      }

      return newNumber;
    });

    // Format ID: IR-YYXXX
    const formattedId = `IR-${new Date().getFullYear().toString().slice(-2)}${newIdNumber.toString().padStart(3, '0')}`;
    return formattedId;

  } catch (e) {
    console.error("Transaction for Incident ID failed: ", e);
    throw e;
  }
  
};
// Ganti findUserByDisplayName dengan ini
export const findUserByUsername = async (username) => {
  const usersRef = collection(db, 'users');
  // Cari username tanpa simbol '@'
  const q = query(usersRef, where("username", "==", username), limit(1));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id; // Mengembalikan UID
  }
  return null;
};
