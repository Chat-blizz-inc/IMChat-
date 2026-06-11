
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export type Reel = {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  user: string;
  userAvatar?: string;
  description: string;
  music: string;
  likes: string;
  comments: string;
  shares: string;
  timestamp: number;
  isDuet?: boolean;
  parentReelId?: string;
  taggedUsers?: string[];
  location?: string;
  userId?: string;
  hideAvatarPublicly?: boolean;
  isLiveStream?: boolean;
  activeFilterId?: string;
  trimStart?: number;
  trimEnd?: number;
};

class ReelStorageSystem {
  private reels: Reel[] = [];
  private listeners: Set<() => void> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.init();
      } else {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
        this.reels = [];
        this.notify();
      }
    });
  }

  private init() {
    if (this.unsubscribe) this.unsubscribe();
    const q = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(50));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.reels = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reel[];
      
      // Sort in-memory
      this.reels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      this.notify();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reels');
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

  getReels() {
    if (localStorage.getItem('imchat_hide_seed_reels') === 'true') {
      return [...this.reels];
    }
    if (this.reels.length === 0) {
      return [
        {
          id: 'seed-reel-1',
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-leaves-in-the-wind-1115-large.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=600&fit=crop',
          user: 'NatureWalks',
          userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=nature',
          description: 'A beautiful morning in the forest! ✨ 🌲 #nature #calm #morning',
          music: 'Forest Symphony - Smooth Sounds',
          likes: '1.2K',
          comments: '88',
          shares: '42',
          timestamp: Date.now() - 3600000,
          userId: 'seed-nature'
        },
        {
          id: 'seed-reel-2',
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-shop-40108-large.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop',
          user: 'CyberTokyo',
          userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=tokyo',
          description: 'Neon dreams in the heart of Shibuya ⚡️ #cyberpunk #tokyo #neon',
          music: 'Tokyo Drift - Retrowave Night',
          likes: '958',
          comments: '42',
          shares: '120',
          timestamp: Date.now() - 7200000,
          userId: 'seed-tokyo'
        },
        {
          id: 'seed-reel-3',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
          user: 'RickAstley',
          userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rick',
          description: 'Never gonna give you up! 😎 Classical music hit #music #retro #classics',
          music: 'Never Gonna Give You Up - Rick Astley',
          likes: '10.5M',
          comments: '342K',
          shares: '1.2M',
          timestamp: Date.now() - 10000000,
          userId: 'seed-rick'
        }
      ];
    }
    return [...this.reels];
  }

  async addReel(reelData: Omit<Reel, 'id' | 'timestamp' | 'likes' | 'comments' | 'shares'>) {
    try {
      const docRef = await addDoc(collection(db, 'reels'), {
        ...reelData,
        likes: '0',
        comments: '0',
        shares: '0',
        timestamp: Date.now() // Simple timestamp for sorting
      });
      return docRef.id;
    } catch (err) {
      console.error("Error adding reel to Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'reels');
      } catch (e) { /* logic continues to fallback */ }
      
      // Fallback for local experience if Firestore fails
      const newReel: Reel = {
        ...reelData,
        id: "reel_" + Date.now(),
        timestamp: Date.now(),
        likes: '0',
        comments: '0',
        shares: '0'
      };
      this.reels = [newReel, ...this.reels];
      this.notify();
      return newReel.id;
    }
  }

  async deleteReel(id: string) {
    try {
      await deleteDoc(doc(db, 'reels', id));
    } catch (err) {
      console.error("Error deleting reel:", err);
      handleFirestoreError(err, OperationType.DELETE, `reels/${id}`);
    }
  }
}

export const ReelStore = new ReelStorageSystem();
