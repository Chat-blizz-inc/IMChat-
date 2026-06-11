import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, FileText, AlertCircle, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './firebase';

interface Post {
  id: string;
  title: string;
  content: string;
  timestamp?: number;
}

interface UserPostsViewProps {
  onBack: () => void;
  initialUserId?: string;
}

export default function UserPostsView({ onBack, initialUserId }: UserPostsViewProps) {
  const [userId, setUserId] = useState(initialUserId || auth.currentUser?.uid || '12345');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPosts = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/user-posts?userId=${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserPosts(userId);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      fetchUserPosts(userId.trim());
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f9]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors font-bold text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">User Posts API Explorer</h1>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter User ID..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-brand-blue text-white px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            'Fetch'
          </button>
        </form>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-20"
              >
                <Loader2 className="w-8 h-8 text-brand-blue animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading posts...</p>
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-10 flex flex-col items-center justify-center text-center"
              >
                <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to Load</h3>
                <p className="text-sm text-gray-500 max-w-xs">{error}</p>
                <button 
                  onClick={() => fetchUserPosts(userId)}
                  className="mt-6 text-brand-blue font-bold text-sm hover:underline"
                >
                  Try Again
                </button>
              </motion.div>
            ) : posts.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-20 text-center"
              >
                <FileText className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">No posts found for this user.</p>
                <p className="text-xs text-gray-400 mt-2">Try ID: 12345 or a valid UID from Firestore.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="posts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-gray-50"
              >
                {posts.map((post, idx) => (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 hover:bg-gray-50/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-blue transition-colors">
                        {post.title}
                      </h3>
                      {post.timestamp && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.timestamp).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed white-space-pre-wrap">
                      {post.content}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center px-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Technical Note</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            This page demonstrates the integration of an Express REST API endpoint (<code className="bg-gray-100 px-1 rounded">/api/user-posts</code>) 
            running on the Node server, directly fulfilling the architecture requested in the HTML snippet.
          </p>
        </div>
      </div>
    </div>
  );
}
