import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  updateDoc,
  doc, 
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';

export type Comment = {
  id: string;
  authorName: string;
  text: string;
  timestamp: number;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;
  comments: Comment[];
  likes: number;
  isLive?: boolean;
};

export type Channel = {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  name: string;
  description: string;
  coverUrl: string;
  subscribers: string[];
  posts: Post[];
  isVerified?: boolean;
};

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: "ch_imchat_announcements",
    ownerId: "system_admin",
    ownerEmail: "admin@imchat.app",
    name: "📢 IMChat Announcements",
    description: "Official real-time updates, security announcements, and cool product releases from the core IMChat team.",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
    subscribers: ["user_1", "user_2", "user_3", "user_4", "user_5"],
    isVerified: true,
    posts: [
      {
        id: "post_ann_1",
        authorId: "system_admin",
        authorName: "IMChat Team",
        content: "🔥 Welcome to the newly upgraded IMChat! We have successfully integrated AI Storyboard Generation and live broadcasting. Join any channel, invite members, or create your own announcement hubs in seconds!",
        timestamp: Date.now() - 3600000 * 24 * 2,
        likes: 42,
        comments: [
          { id: "comm_1_1", authorName: "Yolanda", text: "Wow, this update is absolutely outstanding! The speed is incredible.", timestamp: Date.now() - 3600000 * 24 }
        ]
      },
      {
        id: "post_ann_2",
        authorId: "system_admin",
        authorName: "IMChat Team",
        content: "🔴 LIVE BROADCAST REPLAY: Deep dive into scalable chat infrastructures with Firestore real-time snapshots. Thanks to everyone who tuned in!",
        timestamp: Date.now() - 3600000 * 5,
        likes: 19,
        comments: []
      }
    ]
  },
  {
    id: "ch_design_cafe",
    ownerId: "designer_lead",
    name: "🎨 Creative UX/UI Designers",
    description: "A digital sanctuary for layout designers, moodboard creators, web developers, and visualizers. Daily inspiration for high-fidelity aesthetics.",
    coverUrl: "https://images.unsplash.com/photo-1541462608141-ad4979e408c9?w=800&auto=format&fit=crop&q=60",
    subscribers: ["user_1", "user_4", "user_7"],
    isVerified: true,
    posts: [
      {
        id: "post_design_1",
        authorId: "designer_lead",
        authorName: "Creative UI",
        content: "📐 UX Tip of the Day: Use generous negative space and balanced line height (1.628 golden ratio) to draw focused human attention to essential title cards.",
        timestamp: Date.now() - 3600000 * 12,
        likes: 31,
        comments: [
          { id: "comm_2_1", authorName: "Dan Abramov", text: "Completely agree. Architectural honesty makes application interfaces feel premium.", timestamp: Date.now() - 3600000 * 10 }
        ]
      }
    ]
  },
  {
    id: "ch_ai_video_veo",
    ownerId: "ai_enthusiast",
    name: "🎬 AI Movie Director (Veo 3)",
    description: "Discussing text-to-video generative prompts, visual arts storyboarding, camera pans, and cinematic rendering filters with Google Veo.",
    coverUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60",
    subscribers: ["user_2", "user_3", "user_8"],
    isVerified: true,
    posts: [
      {
        id: "post_veo_1",
        authorId: "ai_enthusiast",
        authorName: "Veo Director",
        content: "🎬 Pro Video Tip: When generating video scenes, reinforce your visual cues with prompt descriptors like '35mm anamorphic lens, beautiful cinematic lighting, subtle camera pan left' to achieve stunning realism.",
        timestamp: Date.now() - 3600000 * 48,
        likes: 56,
        comments: []
      }
    ]
  },
  {
    id: "ch_spotify",
    ownerId: "spotify_official",
    ownerEmail: "official@spotify.com",
    name: "🎵 Spotify",
    description: "The official channel for Spotify. Explore curated playlists, new album releases, live music streams, and share your favorite tracks.",
    coverUrl: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjQBDx-Z1RZY7WtOGaiv4jlPXQPKo_fUWQX-qGD0evvv9XuX1RQo8JjpFUTVbYpkZkV4198UO11hy6X_rdAqPre1k9MdFhBVa3ikzapuJtakimH7cCrturNEdOTNUMV1ClO3lcKcYzygapSuTInDKtbQAkoDWytmMja1PUHm16UAOHboE7UG2Vr72CfcXc/s1600/images-17.jpeg",
    subscribers: ["user_1", "user_3", "user_5", "user_7"],
    isVerified: true,
    posts: [
      {
        id: "post_spotify_1",
        authorId: "spotify_official",
        authorName: "Spotify Official",
        content: "🎵 NOW STREAMING: Discover the latest Global Top 50 hits! What track has been on repeat for you this week? Drop your screenshot or track title below! 🎧🥂",
        timestamp: Date.now() - 3600000 * 8,
        likes: 124,
        comments: [
          { id: "comm_sp_1", authorName: "Emily", text: "That new synth-pop single is pure gold, on repeat 24/7!", timestamp: Date.now() - 3600000 * 5 }
        ]
      },
      {
        id: "post_spotify_2",
        authorId: "spotify_official",
        authorName: "Spotify Official",
        content: "✨ ARTIST SPOTLIGHT: Deep dive into electronic ambient lo-fi sessions for work focus. Unwind and find your rhythm.",
        timestamp: Date.now() - 3600000 * 36,
        likes: 85,
        comments: []
      }
    ]
  }
];

class ChannelStorageSystem {
  private channels: Channel[] = [];
  private listeners: Set<() => void> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.channels = [...DEFAULT_CHANNELS];
    onAuthStateChanged(auth, (user) => {
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
    this.channels = [...DEFAULT_CHANNELS];
    this.notify();
  }

  private async seedDefaultChannelsToFirestore() {
    try {
      for (const ch of DEFAULT_CHANNELS) {
        await setDoc(doc(db, 'channels', ch.id), {
          ownerId: ch.ownerId,
          ownerEmail: ch.ownerEmail || "",
          name: ch.name,
          description: ch.description,
          coverUrl: ch.coverUrl,
          subscribers: ch.subscribers,
          isVerified: ch.isVerified || false,
          posts: ch.posts,
          createdAt: serverTimestamp()
        });
      }
      console.log("Default channels successfully seeded to Firestore.");
    } catch (err) {
      console.warn("Failed to seed default channels to Firestore. This is usually fine if rules or quotas are restricted, falls back beautifully to static defaults.", err);
    }
  }

  private init() {
    const q = query(collection(db, 'channels'), orderBy('name', 'asc'), limit(30));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const docData = doc.data() as any;
        let item = { id: doc.id, ...docData } as Channel;
        // Strict runtime sync for requested Spotify channel properties
        if (item.id === 'ch_spotify') {
          item.name = "Spotify";
          item.coverUrl = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjQBDx-Z1RZY7WtOGaiv4jlPXQPKo_fUWQX-qGD0evvv9XuX1RQo8JjpFUTVbYpkZkV4198UO11hy6X_rdAqPre1k9MdFhBVa3ikzapuJtakimH7cCrturNEdOTNUMV1ClO3lcKcYzygapSuTInDKtbQAkoDWytmMja1PUHm16UAOHboE7UG2Vr72CfcXc/s1600/images-17.jpeg";
        }
        return item;
      });

      if (fetched.length === 0) {
        this.channels = DEFAULT_CHANNELS;
        this.seedDefaultChannelsToFirestore();
      } else {
        const merged = [...fetched];
        // Ensure that our key default channels are present in list if not already there
        DEFAULT_CHANNELS.forEach(defCh => {
          if (!merged.some(c => c.id === defCh.id)) {
            merged.push(defCh);
            // Proactively save to Firestore to ensure DB is complete and matched
            setDoc(doc(db, 'channels', defCh.id), {
              ownerId: defCh.ownerId,
              ownerEmail: defCh.ownerEmail || "",
              name: defCh.name,
              description: defCh.description,
              coverUrl: defCh.coverUrl,
              subscribers: defCh.subscribers,
              isVerified: defCh.isVerified || false,
              posts: defCh.posts,
              createdAt: serverTimestamp()
            }).catch(e => console.warn("Failed to auto-seed missing default channel", defCh.id, e));
          } else {
            // If Spotify channel exists in Firestore but has incorrect info, update it
            const existingIndex = merged.findIndex(c => c.id === defCh.id);
            if (defCh.id === 'ch_spotify' && (merged[existingIndex].name !== 'Spotify' || merged[existingIndex].coverUrl !== defCh.coverUrl)) {
              merged[existingIndex].name = 'Spotify';
              merged[existingIndex].coverUrl = defCh.coverUrl;
              setDoc(doc(db, 'channels', 'ch_spotify'), {
                ownerId: defCh.ownerId,
                ownerEmail: defCh.ownerEmail || "",
                name: 'Spotify',
                description: defCh.description,
                coverUrl: defCh.coverUrl,
                subscribers: defCh.subscribers,
                isVerified: defCh.isVerified || false,
                posts: defCh.posts,
                createdAt: serverTimestamp()
              }).catch(e => console.warn("Failed to overwrite Spotify channel info", e));
            }
          }
        });
        this.channels = merged;
      }
      this.notify();
    }, (error) => {
      console.error("Firestore Channels Error:", error);
      this.channels = DEFAULT_CHANNELS;
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

  getChannels() {
    return this.channels;
  }

  async addChannel(channel: Omit<Channel, 'id' | 'subscribers' | 'posts'>) {
    try {
      const docRef = await addDoc(collection(db, 'channels'), {
        ...channel,
        subscribers: [],
        posts: [],
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'channels');
      return null;
    }
  }

  async updateChannel(id: string, updates: Partial<Channel>) {
    try {
      await updateDoc(doc(db, 'channels', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${id}`);
    }
  }

  async deleteChannel(id: string) {
    try {
      await deleteDoc(doc(db, 'channels', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `channels/${id}`);
    }
  }

  async toggleSubscribe(channelId: string, userId: string) {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;

    const isSubscribed = channel.subscribers.includes(userId);
    const channelRef = doc(db, 'channels', channelId);

    try {
      await updateDoc(channelRef, {
        subscribers: isSubscribed ? arrayRemove(userId) : arrayUnion(userId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}`);
    }
  }

  async removeFollower(channelId: string, userId: string) {
    try {
      await updateDoc(doc(db, 'channels', channelId), {
        subscribers: arrayRemove(userId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}/removeFollower`);
    }
  }

  async addPost(channelId: string, post: Omit<Post, 'id' | 'timestamp' | 'comments' | 'likes'>) {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;

    const newPost: Post = {
      ...post,
      id: "post_" + Date.now(),
      timestamp: Date.now(),
      comments: [],
      likes: 0
    };

    try {
      await updateDoc(doc(db, 'channels', channelId), {
        posts: arrayUnion(newPost)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}`);
    }
  }

  async deletePost(channelId: string, postId: string) {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;

    const postToDelete = channel.posts.find(p => p.id === postId);
    if (!postToDelete) return;

    try {
      await updateDoc(doc(db, 'channels', channelId), {
        posts: arrayRemove(postToDelete)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}`);
    }
  }

  async likeChannelPost(channelId: string, postId: string) {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;

    const postIndex = channel.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const updatedPosts = [...channel.posts];
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      likes: (updatedPosts[postIndex].likes || 0) + 1
    };

    try {
      await updateDoc(doc(db, 'channels', channelId), {
        posts: updatedPosts
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}/like`);
    }
  }

  async addComment(channelId: string, postId: string, comment: Omit<Comment, 'id' | 'timestamp'>) {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;

    const postIndex = channel.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const newComment: Comment = {
      ...comment,
      id: "comment_" + Date.now(),
      timestamp: Date.now()
    };

    const updatedPosts = [...channel.posts];
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      comments: [...updatedPosts[postIndex].comments, newComment]
    };

    try {
      await updateDoc(doc(db, 'channels', channelId), {
        posts: updatedPosts
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}`);
    }
  }

  async deleteComment(channelId: string, postId: string, commentId: string) {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;

    const postIndex = channel.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const updatedPosts = [...channel.posts];
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      comments: updatedPosts[postIndex].comments.filter(c => c.id !== commentId)
    };

    try {
      await updateDoc(doc(db, 'channels', channelId), {
        posts: updatedPosts
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `channels/${channelId}`);
    }
  }
}

export const ChannelStore = new ChannelStorageSystem();
