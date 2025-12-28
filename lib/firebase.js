// lib/firebase.js
// Firebase setup for logging vocabulary and memo data

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

// Replace with your Firebase config (get from Firebase Console)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Log a completed memo (for analytics + vocabulary extraction)
export async function logMemo(memoData) {
  try {
    const docRef = await addDoc(collection(db, "memos"), {
      originalText: memoData.originalText, // What Claude extracted initially
      userEditedText: memoData.userEditedText, // What user corrected it to
      timestamp: new Date(),
      difficultyFlags: memoData.difficultyFlags || [], // [UNCLEAR:...] items
      extractedTerms: memoData.extractedTerms || [], // [TERM:...] items
      language: "Japanese",
      processingTimeMs: memoData.processingTimeMs,
    });

    return docRef.id;
  } catch (error) {
    console.error("Error logging memo:", error);
  }
}

// Extract and log vocabulary/terminology
export async function logVocabulary(term, context, userDefinition = null) {
  try {
    // Check if term already exists
    const q = query(
      collection(db, "vocabulary"),
      where("term", "==", term)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // New term
      await addDoc(collection(db, "vocabulary"), {
        term: term,
        firstFoundContext: context,
        userDefinitions: userDefinition ? [userDefinition] : [],
        occurrences: 1,
        language: "Japanese",
        timestamp: new Date(),
      });
    } else {
      // Update existing term
      const docId = querySnapshot.docs[0].id;
      const docRef = doc(db, "vocabulary", docId);

      let updates = {
        occurrences: querySnapshot.docs[0].data().occurrences + 1,
      };

      if (userDefinition) {
        const existingDefs = querySnapshot.docs[0].data().userDefinitions || [];
        if (!existingDefs.includes(userDefinition)) {
          updates.userDefinitions = [...existingDefs, userDefinition];
        }
      }

      await updateDoc(docRef, updates);
    }
  } catch (error) {
    console.error("Error logging vocabulary:", error);
  }
}

// Get common unclear patterns (for improving Claude's prompt)
export async function getCommonUnclearPatterns() {
  try {
    const snapshot = await getDocs(collection(db, "memos"));
    const patterns = {};

    snapshot.forEach((doc) => {
      const flags = doc.data().difficultyFlags || [];
      flags.forEach((flag) => {
        patterns[flag] = (patterns[flag] || 0) + 1;
      });
    });

    // Return top 10 patterns
    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));
  } catch (error) {
    console.error("Error fetching patterns:", error);
  }
}

// Get learned vocabulary
export async function getLearnedVocabulary() {
  try {
    const snapshot = await getDocs(collection(db, "vocabulary"));
    const terms = [];

    snapshot.forEach((doc) => {
      terms.push({
        term: doc.data().term,
        definitions: doc.data().userDefinitions,
        occurrences: doc.data().occurrences,
      });
    });

    return terms.sort((a, b) => b.occurrences - a.occurrences);
  } catch (error) {
    console.error("Error fetching vocabulary:", error);
  }
}

export { db };
