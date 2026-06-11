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

export type GroupRole = 'owner' | 'moderator' | 'member';

export type GroupMember = {
  userId: string;
  name: string;
  role: GroupRole;
  avatar: string;
  isBanned?: boolean;
};

export type GroupPost = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  topic?: string;
  mediaUrl?: string;
  timestamp: number;
  taggedUsers?: string[];
};

export type Group = {
  id: string;
  uid: string;
  title: string;
  description: string;
  coverUrl: string;
  isPrivate: boolean;
  members: GroupMember[];
  posts: GroupPost[];
};

const DEFAULT_GROUPS: Group[] = [
  {
    id: "g_web_developers",
    uid: "im_g_webdevs",
    title: "💻 Full-Stack Web Developers",
    description: "Welcome! This is the ultimate, high-fidelity hub for React, TypeScript, and UI engineering. Join to share code fragments and layout optimizations.",
    coverUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60",
    isPrivate: false,
    members: [
      { userId: "user_1", name: "Dan Abramov", role: "owner", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" },
      { userId: "user_2", name: "Emma Watson", role: "moderator", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
      { userId: "user_3", name: "Sean", role: "member", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150" }
    ],
    posts: [
      {
        id: "post_grp_1",
        authorId: "user_1",
        authorName: "Dan Abramov",
        content: "👋 Welcome web developers to IMChat! Make sure to checkout our Channels and live broadcasts. Feel free to ask questions here or tag @Emma in your posts.",
        timestamp: Date.now() - 3600000 * 20,
        topic: "General"
      },
      {
        id: "post_grp_2",
        authorId: "user_2",
        authorName: "Emma Watson",
        content: "Check out the new React 19 specs. Very happy to see improved server-side support! Let's discuss.",
        timestamp: Date.now() - 3600000 * 4,
        topic: "Announcements"
      }
    ]
  },
  {
    id: "g_cyberpunk_neon",
    uid: "im_g_cyberpunk",
    title: "⚡ Cyberpunk & Sci-Fi Aesthetic",
    description: "Futuristic street virtualizations, synthwave mixes, neon designs, and cybernetic UI components. The grid is alive.",
    coverUrl: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=800&auto=format&fit=crop&q=60",
    isPrivate: false,
    members: [
      { userId: "user_4", name: "Neo", role: "owner", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
      { userId: "user_5", name: "Trinity", role: "moderator", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" }
    ],
    posts: [
      {
        id: "post_grp_3",
        authorId: "user_4",
        authorName: "Neo",
        content: "Lost in the neon rain. Running some neural models in container systems. Port 3000 is open.",
        timestamp: Date.now() - 3600000 * 10,
        topic: "Photography"
      }
    ]
  },
  {
    id: "g_travel_gourmet",
    uid: "im_g_travel",
    title: "🍕 Travel & Gourmet Foodies",
    description: "Unearthing secret street food stalls, local coffee shops, and gourmet slice capitals around the world. No reviews, just raw flavor.",
    coverUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=60",
    isPrivate: false,
    members: [
      { userId: "user_6", name: "Mario", role: "owner", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" }
    ],
    posts: [
      {
        id: "post_grp_4",
        authorId: "user_6",
        authorName: "Mario",
        content: "If you are ever in Kyoto, visit the tucked away street food stalls near the Gion district. Best authentic ramen of your life!",
        timestamp: Date.now() - 3600000 * 30,
        topic: "Recommendations"
      }
    ]
  }
];

class GroupStorageSystem {
  private groups: Group[] = [];
  private localGroups: Group[] = [];
  private listeners: Set<() => void> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    try {
      const stored = localStorage.getItem('imchat_local_groups');
      this.localGroups = stored ? JSON.parse(stored) : [];
      this.groups = [...DEFAULT_GROUPS, ...this.localGroups];
    } catch (e) {
      this.localGroups = [];
      this.groups = [...DEFAULT_GROUPS];
    }

    // Force default groups as public
    DEFAULT_GROUPS.forEach(g => {
      g.isPrivate = false;
    });

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
    this.groups = [...DEFAULT_GROUPS, ...this.localGroups];
    this.notify();
  }

  private async seedDefaultGroupsToFirestore() {
    try {
      for (const gp of DEFAULT_GROUPS) {
        await setDoc(doc(db, 'groups', gp.id), {
          uid: gp.uid,
          title: gp.title,
          description: gp.description,
          coverUrl: gp.coverUrl,
          isPrivate: false,
          members: gp.members,
          posts: gp.posts,
          createdAt: serverTimestamp()
        });
      }
      console.log("Default groups successfully seeded to Firestore.");
    } catch (err) {
      console.warn("Failed to seed default groups to Firestore. Falls back elegantly to memory arrays.", err);
    }
  }

  private init() {
    // Avoid query-level ordering or hard limit of 30 to make sure we load all groups robustly from Firestore without index limits or issues with missing fields
    const q = query(collection(db, 'groups'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreGroups = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          isPrivate: false // Always force isPrivate as false for public access
        };
      }) as Group[];

      // Sort in-memory elegantly
      firestoreGroups.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

      let merged = [...firestoreGroups];
      
      if (firestoreGroups.length === 0) {
        merged = [...DEFAULT_GROUPS];
        this.seedDefaultGroupsToFirestore();
      } else {
        // Ensure default groups are also visible
        DEFAULT_GROUPS.forEach(defGp => {
          if (!merged.some(g => g.id === defGp.id || g.uid === defGp.uid)) {
            merged.push(defGp);
          }
        });
      }

      // Merge with localGroups, preferring local copy if newer/offline, and ensuring no duplicates
      this.localGroups.forEach(lg => {
        if (!merged.some(mg => mg.id === lg.id || mg.uid === lg.uid)) {
          merged.push(lg);
        }
      });
      // Force all groups in memory to be public as well
      merged.forEach(g => {
        g.isPrivate = false;
      });

      this.groups = merged;
      this.notify();
    }, (error) => {
      console.warn("Firestore Groups onSnapshot error, falling back to local memory:", error);
      const merged = [...DEFAULT_GROUPS];
      this.localGroups.forEach(lg => {
        if (!merged.some(mg => mg.id === lg.id || mg.uid === lg.uid)) {
          merged.push(lg);
        }
      });
      merged.forEach(g => {
        g.isPrivate = false;
      });
      this.groups = merged;
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

  getGroups() {
    return this.groups;
  }

  async addGroup(group: Omit<Group, 'id' | 'posts'>) {
    const tempId = "lg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
    const newGroup: Group = {
      ...group,
      id: tempId,
      posts: []
    };

    // Store in localGroups instantly for off-line & quota robustness
    this.localGroups.unshift(newGroup);
    try {
      localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
    } catch (e) {}

    if (!this.groups.some(g => g.id === tempId)) {
      this.groups.unshift(newGroup);
      this.notify();
    }

    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        ...group,
        posts: [],
        createdAt: serverTimestamp()
      });
      
      if (docRef && docRef.id) {
        // Replace tempId with the official Firestore ID
        this.localGroups = this.localGroups.map(g => g.id === tempId ? { ...g, id: docRef.id } : g);
        try {
          localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
        } catch (e) {}
        this.groups = this.groups.map(g => g.id === tempId ? { ...g, id: docRef.id } : g);
        this.notify();
        return docRef.id;
      }
      return tempId;
    } catch (err) {
      console.warn("Firestore addGroup failed, saved correctly in local storage to keep app running.", err);
      handleFirestoreError(err, OperationType.CREATE, 'groups');
      return tempId;
    }
  }

  async updateGroup(id: string, updates: Partial<Group>) {
    // 1. Update in local memory
    this.localGroups = this.localGroups.map(g => g.id === id ? { ...g, ...updates } : g);
    this.groups = this.groups.map(g => g.id === id ? { ...g, ...updates } : g);
    try {
      localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
    } catch (e) {}
    this.notify();

    // 2. Try Firestore update
    try {
      await updateDoc(doc(db, 'groups', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${id}`);
    }
  }

  async deleteGroup(id: string) {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      throw new Error("You must be logged in to delete a group.");
    }

    // Update local cache
    this.localGroups = this.localGroups.filter(g => g.id !== id);
    this.groups = this.groups.filter(g => g.id !== id);
    try {
      localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
    } catch (e) {}
    this.notify();

    try {
      await deleteDoc(doc(db, 'groups', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `groups/${id}`);
    }
  }

  async addPost(groupId: string, post: Omit<GroupPost, 'id' | 'timestamp'>) {
    const newPost: GroupPost = {
      ...post,
      id: "p_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      timestamp: Date.now()
    };

    // Update locally and notify
    this.groups = this.groups.map(g => {
      if (g.id === groupId) {
        return { ...g, posts: [...(g.posts || []), newPost] };
      }
      return g;
    });

    this.localGroups = this.localGroups.map(lg => {
      if (lg.id === groupId) {
        return { ...lg, posts: [...(lg.posts || []), newPost] };
      }
      return lg;
    });

    try {
      localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
    } catch (e) {}
    this.notify();

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        posts: arrayUnion(newPost)
      });
    } catch (err) {
      console.warn("Firestore addPost to group failed, saved locally:", err);
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
    }
  }

  async joinGroup(groupId: string, member: GroupMember) {
    this.groups = this.groups.map(g => {
      if (g.id === groupId && !g.members.some(m => m.userId === member.userId)) {
        return { ...g, members: [...g.members, member] };
      }
      return g;
    });

    this.localGroups = this.localGroups.map(lg => {
      if (lg.id === groupId && !lg.members.some(m => m.userId === member.userId)) {
        return { ...lg, members: [...lg.members, member] };
      }
      return lg;
    });

    try {
      localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
    } catch (e) {}
    this.notify();

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(member)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
    }
  }

  async leaveGroup(groupId: string, userId: string) {
    this.groups = this.groups.map(g => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter(m => m.userId !== userId) };
      }
      return g;
    });

    this.localGroups = this.localGroups.map(lg => {
      if (lg.id === groupId) {
        return { ...lg, members: lg.members.filter(m => m.userId !== userId) };
      }
      return lg;
    });

    try {
      localStorage.setItem('imchat_local_groups', JSON.stringify(this.localGroups));
    } catch (e) {}
    this.notify();

    const group = this.groups.find(g => g.id === groupId);
    const member = group?.members.find(m => m.userId === userId);
    if (member) {
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          members: arrayRemove(member)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
      }
    }
  }
}

export const GroupStore = new GroupStorageSystem();
