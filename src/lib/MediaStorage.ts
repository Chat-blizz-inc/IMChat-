import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  updateDoc,
  doc, 
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export type MediaItem = {
  id: string;
  url: string; 
  type: 'image' | 'video';
  fileObj?: File; 
  sizeBytes: number;
  createdAt: any;
  userId: string;
  thumbnailUrl?: string; 
  password?: string; 
  deviceId?: string;
  ipAddress?: string;
  source?: 'google-drive' | 'flickr' | 'instagram' | 'upload';
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // Increased to 50MB for videos
export const MAX_USER_MEDIA = 100; 

class MediaStorageSystem {
  private media: MediaItem[] = [];
  private loading: boolean = false;
  private listeners: Set<() => void> = new Set();
  private unsubscribe: (() => void) | null = null;
  private currentUserId: string | null = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUserId = user ? user.uid : null;
      if (user) {
        this.init();
      } else {
        this.stop();
      }
    });
  }

  private stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.media = [];
    this.notify();
  }

  private init() {
    if (!this.currentUserId) return;
    if (this.unsubscribe) this.unsubscribe();
    
    this.loading = true;
    this.notify();

    // Filter by current user to ensure we get THEIR media
    const q = query(
      collection(db, 'media'), 
      where("userId", "==", this.currentUserId),
      limit(100)
    );
    
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.media = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || { seconds: Date.now() / 1000 }
        };
      }) as MediaItem[];
      this.loading = false;
      this.notify();
    }, (error) => {
      console.error("MediaStore Snapshot Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'media');
      this.loading = false;
      this.notify();
    });
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getAllMedia() {
    return [...this.media];
  }

  isLoading() {
    return this.loading;
  }

  getUserMedia(userId: string) {
    return this.media.filter(m => m.userId === userId).sort((a,b) => {
      const aTime = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt : Date.now() / 1000);
      const bTime = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt : Date.now() / 1000);
      return bTime - aTime;
    });
  }

  async addMedia(item: Omit<MediaItem, 'id' | 'createdAt'>): Promise<{ success: boolean, message?: string }> {
    if (!this.currentUserId) return { success: false, message: "Not authenticated" };

    const currentMedia = this.getUserMedia(item.userId);
    
    if (currentMedia.length >= MAX_USER_MEDIA) {
      return { success: false, message: `Upload limit reached. You can only have ${MAX_USER_MEDIA} media items.` };
    }

    try {
      const { fileObj, ...dataToSave } = item;
      
      const simulatedDeviceId = typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + "-" + item.userId.substring(0, 5) : 'server';
      const simulatedIp = "127.0.0.1";

      await addDoc(collection(db, 'media'), {
        ...dataToSave,
        deviceId: simulatedDeviceId,
        ipAddress: simulatedIp,
        createdAt: serverTimestamp(),
        userId: item.userId // Redundant but good for safety
      });
      return { success: true };
    } catch (err) {
      console.error("MediaStore addMedia failure:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'media');
      } catch (handlerErr) {
        // Already handled/logged
      }
      return { success: false, message: "Upload to database failed. Check permissions or file size." };
    }
  }

  async deleteMedia(mediaId: string, userId: string) {
    try {
      await deleteDoc(doc(db, 'media', mediaId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `media/${mediaId}`);
    }
  }

  async requestDeleteMedia(mediaId: string, password?: string) {
    if (!auth.currentUser) return { success: false, message: "Not authenticated" };

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/media/${mediaId}/request-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ mediaPassword: password })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.error || "Failed to request deletion" };
      }

      return { success: true, message: data.message };
    } catch (err) {
      console.error("requestDeleteMedia error:", err);
      return { success: false, message: "Network error occurred" };
    }
  }

  async replaceMedia(mediaId: string, userId: string, newItem: Omit<MediaItem, 'id' | 'createdAt' | 'userId'>) {
    const itemRef = doc(db, 'media', mediaId);
    
    try {
      const { fileObj, ...dataToUpdate } = newItem;
      await updateDoc(itemRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `media/${mediaId}`);
      return { success: false, message: "Update failed." };
    }
  }

  async setMediaPassword(mediaId: string, password: string | null) {
    const itemRef = doc(db, 'media', mediaId);
    try {
      await updateDoc(itemRef, { password: password || null });
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `media/${mediaId}`);
      return { success: false, message: "Update failed." };
    }
  }
}

export const MediaStore = new MediaStorageSystem();
