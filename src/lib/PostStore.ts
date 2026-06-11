
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  updateDoc,
  doc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { containsProhibitedWords } from './wordFilter';

export type PostComment = {
  id: string;
  authorId: string;
  authorName: string;
  avatar: string;
  text: string;
  timestamp: number;
  reactions: string[];
  isEdited?: boolean;
  mediaUrl?: string; // for stickers/gifs
  replyToId?: string;
  audioUrl?: string; // voice comment url
  audioDuration?: number; // voice comment duration in seconds
};

export type Post = {
  id: string;
  userId?: string;
  user: { name: string; avatar: string; location: string; isVerified?: boolean };
  image: string;
  mediaType: 'image' | 'video';
  likes: string[]; // array of user names
  favourites: string[]; // array of user IDs/names
  caption: string;
  timestamp: number;
  isSaved: boolean;
  comments: PostComment[];
  visibility?: 'public' | 'private' | 'friends';
  allowedUserIds?: string[];
  eventData?: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    category: string;
    coverImage?: string;
    creatorId: string;
    interestedCount?: number;
    isPromoted?: boolean;
    promotionBudget?: number;
  };
  reelData?: {
    reelId: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
  audioUrl?: string;
  audioDuration?: number;
};

function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      const val = obj[key];
      if (val !== undefined) {
        acc[key] = cleanUndefined(val);
      }
      return acc;
    }, {});
  }
  return obj;
}

class PostStorageSystem {
  private posts: Post[] = [];
  private listeners: Set<() => void> = new Set();
  private allVerified: boolean = true;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    const savedVerified = localStorage.getItem('yolanda_all_verified') || localStorage.getItem('imchat_all_verified');
    if (savedVerified) this.allVerified = JSON.parse(savedVerified);

    const savedPosts = localStorage.getItem('imchat_cached_posts');
    if (savedPosts) {
      try {
        this.posts = JSON.parse(savedPosts);
      } catch (e) {
        console.warn("Failed to parse cached posts:", e);
      }
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.init();
      } else {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
        this.posts = [];
        this.notify();
      }
    });
  }

  private init() {
    if (this.unsubscribe) this.unsubscribe();
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(50));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      this.posts = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Filter out matching old posts in-memory immediately for instant feedback
          if (data.timestamp && data.timestamp < thirtyDaysAgo) {
            // Delete from Firestore asynchronously
            deleteDoc(doc.ref).catch(err => console.error("Firestore post auto-delete failed:", err));
            return false;
          }
          return true;
        })
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
      
      // Sort in-memory
      this.posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      // Cache posts to localStorage
      try {
        localStorage.setItem('imchat_cached_posts', JSON.stringify(this.posts));
      } catch (e) {
        console.warn("Failed to cache posts:", e);
      }
      
      this.notify();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  }

  private saveVerified() {
    localStorage.setItem('yolanda_all_verified', JSON.stringify(this.allVerified));
    localStorage.removeItem('imchat_all_verified');
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

  getPosts() {
    return this.posts.map(p => ({
      ...p,
      user: { ...p.user, isVerified: p.user.isVerified || this.allVerified }
    }));
  }

  async deletePost(id: string) {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${id}`);
    }
  }

  verifyAllUsers(verified: boolean) {
    this.allVerified = verified;
    this.saveVerified();
    this.notify();
  }

  isAllVerified() {
    return this.allVerified;
  }

  async addPost(post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'favourites' | 'isSaved' | 'comments'>) {
    // Auto-block spam in post submission if they are not verified
    const isVerified = post.user?.isVerified;
    if (!isVerified && containsProhibitedWords(post.caption)) {
      const errorMsg = "Post Blocked: Your content contains prohibited words or spam indicators (scam/phishing/free_money/etc.). Only verified user profiles can publish this content.";
      alert(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      const payload = cleanUndefined({
        ...post,
        timestamp: Date.now(),
        likes: [],
        favourites: [],
        isSaved: false,
        comments: []
      });
      const docRef = await addDoc(collection(db, 'posts'), payload);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
  }

  async updatePost(id: string, updates: Partial<Post>) {
    try {
      const cleaned = cleanUndefined(updates);
      await updateDoc(doc(db, 'posts', id), cleaned);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${id}`);
    }
  }

  async toggleLike(id: string, userName: string) {
    const post = this.posts.find(p => p.id === id);
    if (!post) return;

    const isLiked = post.likes.includes(userName);
    const postRef = doc(db, 'posts', id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userName) : arrayUnion(userName)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${id}`);
    }
  }

  async toggleFavourite(id: string, userName: string) {
    const post = this.posts.find(p => p.id === id);
    if (!post) return;

    const isFavourited = (post.favourites || []).includes(userName);
    const postRef = doc(db, 'posts', id);
    
    try {
      await updateDoc(postRef, {
        favourites: isFavourited ? arrayRemove(userName) : arrayUnion(userName)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${id}`);
    }
  }

  async toggleSave(id: string) {
    const post = this.posts.find(p => p.id === id);
    if (!post) return;
    
    await this.updatePost(id, { isSaved: !post.isSaved });
  }

  async addComment(postId: string, comment: Omit<PostComment, 'id' | 'timestamp' | 'reactions'>) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;

    const newComment: PostComment = {
      ...comment,
      id: "comment_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      reactions: []
    };

    await this.updatePost(postId, { comments: [...post.comments, newComment] });
    return newComment;
  }

  async deleteComment(postId: string, commentId: string) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    await this.updatePost(postId, { 
      comments: post.comments.filter(c => c.id !== commentId) 
    });
  }

  async reactToComment(postId: string, commentId: string, userName: string) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const newComments = post.comments.map(c => {
      if (c.id === commentId) {
        const hasReacted = c.reactions.includes(userName);
        return { ...c, reactions: hasReacted ? c.reactions.filter(n => n !== userName) : [...c.reactions, userName] };
      }
      return c;
    });

    await this.updatePost(postId, { comments: newComments });
  }

  async editComment(postId: string, commentId: string, text: string) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const newComments = post.comments.map(c => c.id === commentId ? { ...c, text, isEdited: true } : c);
    await this.updatePost(postId, { comments: newComments });
  }
}

export const PostStore = new PostStorageSystem();
