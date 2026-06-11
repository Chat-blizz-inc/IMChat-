import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, Plus, MoreVertical, Edit2, Trash2, 
  Users, UserPlus, Image as ImageIcon, Send, MessageCircle, 
  Heart, Share2, Video, X, BellDot, Megaphone, Check, BadgeCheck
} from 'lucide-react';

import { db, auth } from './firebase';

import { ChannelStore, Channel, Post, Comment } from './lib/ChannelStore';
import { PostStore } from './lib/PostStore';
import { uploadToCloudinary } from './lib/cloudinary';

interface ChannelsSystemProps {
  currentUserId: string;
  currentUserName: string;
}

export default function ChannelsSystem({ currentUserId, currentUserName }: ChannelsSystemProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => {
    const override = localStorage.getItem('explore_open_channel_id');
    if (override) {
      localStorage.removeItem('explore_open_channel_id');
      return override;
    }
    return null;
  });
  
  useEffect(() => {
    const fetchChannels = () => setChannels(ChannelStore.getChannels());
    fetchChannels();
    return ChannelStore.subscribe(fetchChannels);
  }, []);

  const [isCreating, setIsCreating] = useState(false);
  const [channelForm, setChannelForm] = useState({ id: '', name: '', description: '', coverUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notification, setNotification] = useState<{ id: number; message: string } | null>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [postInput, setPostInput] = useState('');
  const [activePostComments, setActivePostComments] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const showNotification = (message: string) => {
    const id = Date.now();
    setNotification({ id, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  const handleOpenCreate = () => {
    setChannelForm({ id: '', name: '', description: '', coverUrl: '' });
    setIsCreating(true);
  };

  const handlePublishChannel = async () => {
    if (!channelForm.name.trim()) return;
    // setIsSubmitting(true);
    
    try {
      let finalCover = channelForm.coverUrl;
      if (coverFile) {
        const res = await uploadToCloudinary(coverFile, 'image');
        if (res) finalCover = res.secure_url;
      }

      if (channelForm.id) {
        await ChannelStore.updateChannel(channelForm.id, {
          name: channelForm.name,
          description: channelForm.description,
          coverUrl: finalCover
        });
      } else {
        await ChannelStore.addChannel({
          ownerId: currentUserId,
          name: channelForm.name,
          description: channelForm.description,
          coverUrl: finalCover || `https://picsum.photos/seed/${channelForm.name.replace(/\s+/g, '')}/600/300`,
        });
      }

      // setIsSubmitting(false);
      setIsCreating(false);
      setCoverFile(null);
      showNotification(channelForm.id ? 'Channel updated successfully!' : 'Channel created successfully!');
    } catch (err) {
      console.error("Channel publication failed:", err);
      // alert("Failed to publish channel. Please try again.");
      // setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setChannelForm(prev => ({ ...prev, coverUrl: url }));
      setCoverFile(file);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this channel?')) {
      ChannelStore.deleteChannel(id).catch(err => {
        console.error("Delete channel fail:", err);
      });
      setActiveChannelId(null);
      showNotification('Channel deleted');
    }
  };

  const handleSubscribe = async (channelId: string) => {
    ChannelStore.toggleSubscribe(channelId, currentUserId).catch(err => {
      console.error("Subscribe fail:", err);
    });
    const channel = channels.find(c => c.id === channelId);
    const isSubbed = channel?.subscribers.includes(currentUserId);
    showNotification(isSubbed ? 'Unsubscribed from Channel' : 'Subscribed to Channel updates!');
  };

  const handleCreatePost = async (isLive: boolean = false) => {
    if (!postInput.trim() && !isLive) return;
    if (!activeChannelId) return;

    ChannelStore.addPost(activeChannelId, {
      authorId: currentUserId,
      authorName: activeChannel?.name || 'Channel Owner',
      content: isLive ? '🔴 LIVE STREAM IN PROGRESS' : postInput,
      isLive
    }).catch(err => {
      console.error("Post creation fail:", err);
    });

    setPostInput('');
    showNotification(isLive ? 'Live broadcast started!' : 'Post published!');

    if (isLive) {
      window.dispatchEvent(new CustomEvent('new-message', {
        detail: {
          title: '🔴 Transmisión En Vivo / Live Stream',
          body: `¡El canal "${activeChannel?.name || 'Broadcast'}" ha iniciado una transmisión en vivo en IMChat!`,
          senderId: 'live'
        }
      }));
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentInput.trim() || !activeChannelId) return;

    ChannelStore.addComment(activeChannelId, postId, {
      authorName: currentUserName,
      text: commentInput.trim(),
    }).catch(err => {
      console.error("Comment fail:", err);
    });
    setCommentInput('');
  };

  const handleDeletePost = async (postId: string) => {
    if (!activeChannelId) return;
    if (!confirm('Are you sure you want to delete this broadcast?')) return;

    ChannelStore.deletePost(activeChannelId, postId).catch(err => {
      console.error("Delete post fail:", err);
    });
    showNotification('Post removed successfully.');
  };


  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!activeChannelId) return;

    await ChannelStore.deleteComment(activeChannelId, postId, commentId);
    showNotification('Comment removed by moderator.');
  };

  // Views

  const renderChannelList = () => (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Channels</h1>
        <button 
          onClick={handleOpenCreate} 
          className="px-3 py-1.5 flex items-center gap-2 rounded-full bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      <div className="flex flex-col p-4 gap-4 overflow-y-auto pb-24">
        {channels.map(channel => (
          <div 
            key={channel.id}
            onClick={() => setActiveChannelId(channel.id)}
            className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow bg-white active:scale-[0.98] transform duration-100"
          >
            <img src={channel.coverUrl} alt={channel.name} className="w-full h-32 object-cover" />
            <div className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-lg text-gray-900">{channel.name}</h3>
                {(channel.id === 'ch1' || channel.isVerified || channel.ownerEmail === 'admin@imchat.app') && (
                  <BadgeCheck className="w-[16px] h-[16px] text-white fill-[#0095f6]" />
                )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{channel.description}</p>
              <div className="flex items-center gap-1 mt-2 text-brand-blue font-medium text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>{(channel.subscribers ? channel.subscribers.length : 0)} Subscribers</span>
              </div>
            </div>
          </div>
        ))}
        {channels.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            No channels found. Create one!
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateChannel = () => (
    <motion.div 
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[120] flex flex-col w-full max-w-[500px] mx-auto"
    >
      <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => setIsCreating(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg">{channelForm.id ? 'Edit Channel' : 'New Channel'}</h2>
      </header>
      
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700 text-sm">Channel Cover Image</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden relative"
          >
            {channelForm.coverUrl ? (
              <img src={channelForm.coverUrl} className="w-full h-full object-cover" />
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-gray-500 font-medium text-sm">Upload Cover</span>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700 text-sm">Channel Name</label>
          <input 
            type="text" 
            value={channelForm.name}
            onChange={e => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="E.g., Tech Updates"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold text-gray-700 text-sm">Description</label>
          <textarea 
            value={channelForm.description}
            onChange={e => setChannelForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what your channel is about"
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-blue resize-none"
          />
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handlePublishChannel}
          disabled={!channelForm.name.trim()}
          className="w-full bg-brand-blue text-white font-bold py-3.5 rounded-xl disabled:bg-gray-300 transition-colors shadow-lg active:scale-95"
        >
          {channelForm.id ? 'Save Changes' : 'Create Channel'}
        </button>
      </div>
    </motion.div>
  );

  const renderChannelView = () => {
    if (!activeChannel) return null;
    const isOwner = activeChannel.ownerId === currentUserId;
    const isSubbed = activeChannel.subscribers.includes(currentUserId);

    return (
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-gray-50 z-[100] flex flex-col w-full max-w-[500px] mx-auto"
      >
        <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
           <button onClick={() => setActiveChannelId(null)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center active:scale-95">
             <ArrowLeft className="w-6 h-6" />
           </button>
           {isOwner && (
             <div className="relative">
               <button onClick={() => setShowChannelSettings(!showChannelSettings)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center active:scale-95">
                 <MoreVertical className="w-6 h-6" />
               </button>
               {showChannelSettings && (
                 <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl w-48 py-2 overflow-hidden border border-gray-100">
                   <button 
                     onClick={() => {
                        setChannelForm({ 
                          id: activeChannel.id, name: activeChannel.name, 
                          description: activeChannel.description, coverUrl: activeChannel.coverUrl 
                        });
                        setIsCreating(true);
                        setShowChannelSettings(false);
                     }}
                     className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 font-medium text-gray-700"
                   >
                     <Edit2 className="w-4 h-4" /> Edit Channel
                   </button>
                   <button 
                     onClick={() => { handleDeleteChannel(activeChannel.id); setShowChannelSettings(false); }}
                     className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 font-medium text-red-500"
                   >
                     <Trash2 className="w-4 h-4" /> Delete Channel
                   </button>
                 </div>
               )}
             </div>
           )}
        </header>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="h-64 relative w-full">
            <img src={activeChannel.coverUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
              <div className="flex flex-col gap-1">
                <h1 className="font-bold text-3xl tracking-tight leading-tight">{activeChannel.name}</h1>
                <span className="text-white/80 font-semibold text-xs flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md backdrop-blur-sm w-fit mt-1">
                  <Users className="w-3.5 h-3.5" /> 
                  <span>{(activeChannel.subscribers ? activeChannel.subscribers.length : 0)} Subscribers</span>
                </span>
              </div>
              {!isOwner && (
                <button 
                  onClick={() => handleSubscribe(activeChannel.id)}
                  title={isSubbed ? 'Unsubscribe from Channel' : 'Subscribe to Channel'}
                  className={`px-5 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all shadow-lg active:scale-95 border ${
                    isSubbed 
                      ? 'bg-white/15 hover:bg-white/25 text-white border-white/20 backdrop-blur-md' 
                      : 'bg-[#ff0055] hover:bg-pink-600 text-white border-transparent animate-pulse'
                  }`}
                >
                  {isSubbed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>
          </div>
          
          <div className="p-4 flex flex-col gap-4">
            <p className="text-gray-700 leading-relaxed text-sm">{activeChannel.description}</p>

            {isOwner && activeChannel.subscribers && activeChannel.subscribers.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 mt-2">
                <h3 className="font-bold text-gray-950 text-sm flex items-center justify-between">
                  <span>Manage Channel Subscribers ({activeChannel.subscribers.length})</span>
                  <span className="text-[10px] uppercase text-gray-400 font-bold">Owner Access</span>
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {activeChannel.subscribers.map((subId, idx) => (
                    <div key={subId} className="flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="font-mono text-xs text-gray-600">ID: {subId.substring(0, 8)}... {idx === 0 ? '(Latest)' : ''}</span>
                      <button 
                        type="button"
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this subscriber?")) {
                            await ChannelStore.removeFollower(activeChannel.id, subId);
                           }
                        }}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
                      >
                        Delete Subscriber
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isOwner && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 mt-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Megaphone className="w-4 h-4 text-brand-blue" /> Create Broadcast</h3>
                <textarea 
                  value={postInput}
                  onChange={e => setPostInput(e.target.value)}
                  placeholder="What's new?"
                  rows={2}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none text-sm resize-none"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCreatePost()} disabled={!postInput.trim()} className="flex-1 bg-brand-blue text-white font-semibold py-2 rounded-lg disabled:opacity-50">Post</button>
                  <button onClick={() => handleCreatePost(true)} className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
                    <Video className="w-4 h-4" /> Go Live
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-4">
              <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2">Recent Activity</h3>
              
              {activeChannel.posts.length === 0 && (
                <div className="text-center py-8 text-gray-500 italic">No broadcasts yet.</div>
              )}

              {activeChannel.posts.map(post => (
                <div key={post.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {post.isLive && (
                    <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> LIVE BROADCAST
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                         <img src={activeChannel.coverUrl} className="w-8 h-8 rounded-full object-cover" />
                         <div className="flex flex-col">
                           <div className="flex items-center gap-1">
                             <span className="font-bold text-sm text-gray-900">{activeChannel.name}</span>
                             {(activeChannel.id === 'ch1' || activeChannel.isVerified || activeChannel.ownerEmail === 'admin@imchat.app') && (
                               <BadgeCheck className="w-[14px] h-[14px] text-white fill-[#0095f6]" />
                             )}
                           </div>
                           <span className="text-xs text-gray-400">{new Date(post.timestamp).toLocaleDateString()}</span>
                         </div>
                       </div>
                       {isOwner && (
                         <button 
                           onClick={() => handleDeletePost(post.id)}
                           className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                           title="Delete Broadcast"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                    <p className={`text-gray-800 ${post.isLive ? 'font-bold text-lg' : ''}`}>{post.content}</p>
                    
                    <div className="flex flex-col gap-2.5 mt-2 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-4">
                         <button 
                           onClick={async () => {
                             await ChannelStore.likeChannelPost(activeChannel.id, post.id);
                           }}
                           className="flex items-center gap-1.5 text-gray-500 text-sm font-medium hover:text-brand-blue"
                         >
                           <Heart className={`w-4 h-4 ${post.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} /> 
                           <span>{post.likes || 0} Likes</span>
                         </button>
                         <button 
                           onClick={() => setActivePostComments(activePostComments === post.id ? null : post.id)}
                           className="flex items-center gap-1.5 text-gray-500 text-sm font-medium hover:text-brand-blue"
                         >
                           <MessageCircle className="w-4 h-4" /> {post.comments.length} Comments
                         </button>
                         <button 
                           onClick={async () => {
                             try {
                               await PostStore.addPost({
                                 userId: auth.currentUser?.uid || 'anonymous',
                                 user: {
                                   name: `${activeChannel.name} (Shared Channel)`,
                                   avatar: activeChannel.coverUrl || 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=150',
                                   location: 'Shared from Official Channel',
                                   isVerified: true
                                 },
                                 caption: post.content,
                                 image: activeChannel.coverUrl || '',
                                 mediaType: 'image',
                                 visibility: 'public'
                               });
                               alert("Broadcast shared successfully to public feed posts! Everyone can view, like, and comment on it there.");
                             } catch (err) {
                               console.error(err);
                               alert("Failed to share channel broadcast to public posts: " + err);
                             }
                           }}
                           className="flex items-center gap-1.5 text-gray-500 text-sm font-medium hover:text-indigo-600 ml-auto"
                           title="Share Channel post to public posts"
                         >
                           <Share2 className="w-4 h-4" /> Share to Feed
                         </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {activePostComments === post.id && (
                      <div className="mt-3 flex flex-col gap-3 bg-gray-50 p-3 rounded-lg">
                        {post.comments.length === 0 ? (
                          <div className="text-xs text-center text-gray-400">No comments yet. Be the first!</div>
                        ) : (
                          <div className="flex flex-col gap-3">
                             {post.comments.map(comment => (
                               <div key={comment.id} className="flex flex-col gap-0.5 group/comment">
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-1">
                                     <span className="text-xs font-bold text-gray-700">{comment.authorName}</span>
                                     {(comment.authorName === currentUserName || comment.authorName === 'Sean') && (
                                       <BadgeCheck className="w-[12px] h-[12px] text-white fill-[#0095f6]" />
                                     )}
                                   </div>
                                   {isOwner && (
                                     <button 
                                       onClick={() => handleDeleteComment(post.id, comment.id)}
                                       className="opacity-0 group-hover/comment:opacity-100 text-red-500 text-[10px] uppercase font-bold tracking-wider hover:underline"
                                     >
                                       Remove
                                     </button>
                                   )}
                                 </div>
                                 <p className="text-sm text-gray-800 bg-white p-2 rounded-lg border border-gray-100">{comment.text}</p>
                               </div>
                             ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="text" 
                            value={commentInput}
                            onChange={e => setCommentInput(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 text-sm py-2 px-3 border border-gray-200 rounded-full outline-none"
                            onKeyDown={e => {
                               if (e.key === 'Enter') handleComment(post.id);
                            }}
                          />
                          <button onClick={() => handleComment(post.id)} className="p-2 text-brand-blue disabled:text-gray-400" disabled={!commentInput.trim()}>
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {renderChannelList()}
      <AnimatePresence>
        {isCreating && renderCreateChannel()}
        {activeChannelId && !isCreating && renderChannelView()}
      </AnimatePresence>

      {/* Global Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[200] max-w-[400px] mx-auto bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between"
          >
            <span className="font-medium text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
