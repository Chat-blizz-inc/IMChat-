import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Plus, Search, Shield, Image as ImageIcon, ChevronRight, Hash, 
  MessageCircle, MoreVertical, X, Phone, Video, Edit2, Trash2, UserPlus, Ban, ArrowLeft,
  Smile, Star, BadgeCheck, Loader2, Clock
} from 'lucide-react';
import GiphyPicker from './components/GiphyPicker';
import UserAvatar from './components/UserAvatar';

import { GroupStore, Group, GroupMember, GroupPost, GroupRole } from './lib/GroupStore';
import { uploadToCloudinary } from './lib/cloudinary';

const BusinessStore = {
  logAdClick: (id: string) => console.log('ad click', id)
};

const fileToCompressedBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(e.target?.result as string || '');
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

const getGroupGradient = (title: string, id: string) => {
  const gradients = [
    'from-indigo-600 via-blue-600 to-indigo-800',
    'from-emerald-500 via-teal-600 to-emerald-700',
    'from-purple-600 via-fuchsia-600 to-pink-800',
    'from-rose-500 via-red-500 to-orange-600',
    'from-violet-600 via-indigo-600 to-blue-700',
    'from-cyan-500 via-sky-600 to-blue-800',
  ];
  let code = 0;
  const str = (title || '') + (id || '');
  for (let i = 0; i < str.length; i++) {
    code += str.charCodeAt(i);
  }
  return gradients[code % gradients.length];
};

const getGroupInitials = (title: string): string => {
  if (!title) return "GP";
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.trim().substring(0, 2).toUpperCase();
};

const isCustomCover = (url?: string): boolean => {
  if (!url) return false;
  if (url.includes('images.unsplash.com/photo-1522071820081-009f0129c71c')) return false;
  return true;
};

interface GroupsSystemProps {
  currentUserId: string;
  currentUserName: string;
  profileImg: string;
}

export default function GroupsSystem({ currentUserId, currentUserName, profileImg }: GroupsSystemProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [listSubTab, setListSubTab] = useState<'explore' | 'activity'>('explore');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    return localStorage.getItem('explore_open_group_id') || null;
  });
  
  useEffect(() => {
    const fetchGroups = () => setGroups(GroupStore.getGroups());
    fetchGroups();
    return GroupStore.subscribe(fetchGroups);
  }, []);

  const [view, setView] = useState<'list' | 'create' | 'detail' | 'invite'>(() => {
    const override = localStorage.getItem('explore_open_group_id');
    if (override) {
      localStorage.removeItem('explore_open_group_id');
      return 'detail';
    }
    return 'list';
  });

  // Create Group Form Statete
  const [cgTitle, setCgTitle] = useState('');
  const [cgDesc, setCgDesc] = useState('');
  const [cgCover, setCgCover] = useState('');
  const [cgCoverFile, setCgCoverFile] = useState<File | null>(null);
  const [cgPrivate, setCgPrivate] = useState(false);

  // Edit Group Name State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupTitle, setEditGroupTitle] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupCover, setEditGroupCover] = useState('');
  const [editGroupCoverFile, setEditGroupCoverFile] = useState<File | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Post / Interaction State
  const [postInput, setPostInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [showGiphy, setShowGiphy] = useState(false);

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const myRole = activeGroup?.members.find(m => m.userId === currentUserId)?.role;
  const isMember = !!myRole;
  const isAdmin = myRole === 'owner' || myRole === 'moderator';

  const [isUploading, setIsUploading] = useState(false);

  const handleCreateGroup = async () => {
    if (!cgTitle.trim()) return;

    setIsUploading(true);
    try {
      let finalCover = '';
      const groupUid = `im_g_${Date.now()}`;
      if (cgCoverFile) {
        try {
          const res = await uploadToCloudinary(cgCoverFile, 'image', groupUid);
          if (res && res.secure_url) {
            finalCover = res.secure_url;
          } else {
            finalCover = await fileToCompressedBase64(cgCoverFile);
          }
        } catch (e) {
          finalCover = await fileToCompressedBase64(cgCoverFile);
        }
      }

      await GroupStore.addGroup({
        uid: groupUid,
        title: cgTitle,
        description: cgDesc,
        coverUrl: finalCover,
        isPrivate: false,
        members: [{ userId: currentUserId, name: currentUserName, role: 'owner', avatar: profileImg }],
      });

      setView('list');
      setCgTitle('');
      setCgDesc('');
      setCgCover('');
      setCgCoverFile(null);
    } catch (err) {
      console.error("Group creation failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const userRole = group?.members.find(m => m.userId === currentUserId)?.role;
    if (userRole !== 'owner') {
      alert("Permission denied. Only users with the 'owner' role are permitted to delete this group.");
      return;
    }
    if (confirm("Are you sure you want to completely delete this group?")) {
      try {
        await GroupStore.deleteGroup(groupId);
        setView('list');
      } catch (err: any) {
        alert(err.message || "Failed to delete group.");
      }
    }
  };

  const handleJoin = async (groupId: string) => {
    GroupStore.joinGroup(groupId, { userId: currentUserId, name: currentUserName, role: 'member', avatar: profileImg }).catch(err => console.error("Join group fail:", err));
    GroupStore.addPost(groupId, {
      authorId: 'system',
      authorName: 'System',
      content: `${currentUserName} joined the group.`,
      topic: 'System',
    }).catch(err => console.error("Join notice fail:", err));
  };

  const handleLeave = async (groupId: string) => {
    if (confirm("Are you sure you want to leave this group?")) {
      GroupStore.leaveGroup(groupId, currentUserId).catch(err => console.error("Leave group fail:", err));
      GroupStore.addPost(groupId, {
        authorId: 'system',
        authorName: 'System',
        content: `${currentUserName} left the group.`,
        topic: 'System',
      }).catch(err => console.error("Leave notice fail:", err));
      setView('list');
    }
  };

  const handleAddPost = async (mediaFile?: File) => {
    if (!postInput.trim() && !mediaFile) return;
    if (!activeGroupId) return;

    // Background post
    // setIsUploading(true);
    try {
      let mediaUrl = undefined;
      if (mediaFile) {
        const res = await uploadToCloudinary(mediaFile, 'image');
        if (res) mediaUrl = res.secure_url;
      }

      await GroupStore.addPost(activeGroupId, {
        authorId: currentUserId,
        authorName: currentUserName,
        content: postInput,
        topic: topicInput || 'General',
        mediaUrl
      });
      setPostInput('');
      setTopicInput('');
    } catch (err) {
      console.error("Failed to add group post:", err);
    } finally {
      // setIsUploading(false);
    }
  };


  const handleCreatePost = async () => {
    if (!postInput.trim() || !activeGroupId) return;
    
    // Extract tagged users
    const tags = postInput.match(/@(\w+)/g)?.map(tag => tag.substring(1)) || [];
    
    try {
      await GroupStore.addPost(activeGroupId, {
        authorId: currentUserId,
        authorName: currentUserName,
        content: postInput,
        topic: topicInput || undefined,
        taggedUsers: tags
      });

      setPostInput('');
      setTopicInput('');
      setShowTagMenu(false);
    } catch (err) {
      console.error("Failed to create group post:", err);
    }
  };

  const handleInputChange = (val: string) => {
    setPostInput(val);
    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && lastAtPos >= val.length - 10) {
      const query = val.substring(lastAtPos + 1);
      if (!query.includes(' ')) {
        setTagSearch(query);
        setShowTagMenu(true);
        return;
      }
    }
    setShowTagMenu(false);
  };

  const insertTag = (name: string) => {
    const lastAtPos = postInput.lastIndexOf('@');
    const newVal = postInput.substring(0, lastAtPos) + `@${name} ` + postInput.substring(postInput.length);
    setPostInput(newVal);
    setShowTagMenu(false);
  };

  const handleSendGif = async (url: string) => {
    if (!activeGroupId) return;
    GroupStore.addPost(activeGroupId, {
      authorId: currentUserId,
      authorName: currentUserName,
      content: '',
      mediaUrl: url,
    }).catch(err => console.error("GIF post fail:", err));
    setShowGiphy(false);
  };

  const handleToggleRole = async (groupId: string, userId: string) => {
    const g = groups.find(g => g.id === groupId);
    if (!g) return;
    const member = g.members.find(m => m.userId === userId);
    if (!member) return;

    const newRole: GroupRole = member.role === 'member' ? 'moderator' : 'member';
    const updatedMembers = g.members.map(m => m.userId === userId ? { ...m, role: newRole } : m);
    
    GroupStore.updateGroup(groupId, { members: updatedMembers }).catch(err => console.error("Role toggle fail:", err));
  };

  const handleDeletePost = async (groupId: string, postId: string) => {
    const g = groups.find(g => g.id === groupId);
    if (!g) return;
    const updatedPosts = g.posts.filter(p => p.id !== postId);
    GroupStore.updateGroup(groupId, { posts: updatedPosts }).catch(err => console.error("Post delete fail:", err));
  };

  const handleBanUser = async (groupId: string, userId: string) => {
    if (confirm("Ban this user from the group?")) {
      const g = groups.find(g => g.id === groupId);
      if (!g) return;
      const updatedMembers = g.members.filter(m => m.userId !== userId);
      GroupStore.updateGroup(groupId, { members: updatedMembers }).catch(err => console.error("Ban fail:", err));
    }
  };

  const handleInviteFakeUser = () => {
    if (!searchUsers) return;
    alert(`Invitation sent to ${searchUsers}! They have been notified.`);
    setSearchUsers('');
    setView('detail');
  };

  if (view === 'create') {
    return (
      <div className="flex flex-col h-full bg-gray-50 absolute inset-0 z-50">
        <header className="bg-white p-4 flex items-center justify-between border-b border-gray-100 sticky top-0 shadow-sm z-10">
          <button onClick={() => setView('list')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full active:scale-95"><X className="w-6 h-6"/></button>
          <h1 className="font-bold text-lg text-gray-900 tracking-tight">Agregar Grupo / Add Group</h1>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
             <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">Cargar Portada / Upload Group Cover</label>
             <div className="relative w-full h-44 bg-gray-150 rounded-2xl overflow-hidden group border border-gray-200 shadow-sm flex flex-col items-center justify-center">
               {cgCover ? (
                 <>
                   <img src={cgCover} className="w-full h-full object-cover absolute inset-0 animate-fade-in" alt="Group Cover" />
                   <div className="absolute inset-0 bg-black/45 pointer-events-none" />
                 </>
               ) : (
                 <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center text-gray-400 p-4">
                   <Users className="w-10 h-10 mb-2 text-gray-400 opacity-70" />
                   <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 opacity-80 text-center">Un cover dinámico será asignado / Dynamic placeholder will be assigned</span>
                 </div>
               )}
               <label className="relative z-10 bg-black/70 backdrop-blur-md hover:bg-black/90 active:scale-95 px-5 py-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer text-white font-bold text-xs uppercase tracking-wider gap-2 shadow-lg border border-white/20">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCgCover(URL.createObjectURL(file));
                        setCgCoverFile(file);
                      }
                    }} 
                  />
                  <ImageIcon className="w-4 h-4 text-white animate-pulse" /> Cargar Portada / Upload Cover
               </label>
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">Nombre del Grupo / Group Title</label>
             <input type="text" value={cgTitle} onChange={e => setCgTitle(e.target.value)} placeholder="Ej. Desarrolladores IMChat, Amigos de Yolanda" className="w-full bg-white border border-gray-200 rounded-xl p-4 text-gray-900 font-semibold outline-none focus:border-brand-blue transition-colors shadow-sm" />
           </div>

           <div className="flex flex-col gap-2">
             <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">Descripción / Description</label>
             <textarea value={cgDesc} onChange={e => setCgDesc(e.target.value)} placeholder="¿De qué trata este grupo? / What is this group about?" rows={3} className="w-full bg-white border border-gray-200 rounded-xl p-4 text-gray-900 text-sm outline-none resize-none focus:border-brand-blue transition-colors shadow-sm" />
           </div>

           <div className="flex flex-col gap-2">
             <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">Privacidad: Público / Privacy: Public (Todos los grupos son públicos por defecto)</label>
             <div className="hidden">
               <button onClick={() => setCgPrivate(false)} className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors ${!cgPrivate ? 'bg-brand-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Público / Public</button>
               <button onClick={() => setCgPrivate(true)} className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 ${cgPrivate ? 'bg-brand-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                 <Shield className="w-4 h-4" /> Privado / Private
               </button>
             </div>
           </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
           <button 
             onClick={handleCreateGroup} 
             disabled={!cgTitle.trim() || isUploading} 
             className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-[0.65] disabled:cursor-not-allowed text-sm uppercase tracking-wider"
           >
             {isUploading ? (
               <>
                 
                 <span>Enviar / Crear Grupo (Send details & process)</span>
               </>
             ) : (
               <span>Enviar / Crear Grupo (Send details & process)</span>
             )}
           </button>
         </div>
       </div>
    );
  }

  if (view === 'invite' && activeGroup) {
     return (
       <div className="flex flex-col h-full bg-white absolute inset-0 z-50">
         <header className="p-4 flex items-center gap-3 border-b border-gray-100">
           <button onClick={() => setView('detail')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full active:scale-95"><ArrowLeft className="w-6 h-6"/></button>
           <h1 className="font-bold text-lg text-gray-900">Invite Members</h1>
         </header>
         <div className="p-4 flex flex-col gap-4">
           <p className="text-sm text-gray-500">Search existing users to invite to <strong className="text-gray-900">{activeGroup.title}</strong></p>
           <div className="flex bg-gray-100 rounded-xl p-3 items-center gap-2">
             <Search className="w-5 h-5 text-gray-400" />
             <input type="text" value={searchUsers} onChange={e=>setSearchUsers(e.target.value)} placeholder="Search handles or names..." className="bg-transparent outline-none flex-1 text-sm text-gray-900" />
           </div>
           {searchUsers && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col gap-2">
               <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue font-bold">U</div>
                   <span>{searchUsers}</span>
                 </div>
                 <button onClick={handleInviteFakeUser} className="bg-brand-blue text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:focus:scale-95">Send Invite</button>
               </div>
             </motion.div>
           )}
         </div>
       </div>
     );
  }

  if (view === 'detail' && activeGroup) {
    return (
      <div className="flex flex-col h-full bg-gray-50 absolute inset-0 z-40 overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-20 flex justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={() => { setActiveGroupId(null); setView('list'); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 active:scale-95"><X className="w-5 h-5"/></button>
          {isMember && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const input = document.getElementById('group-post-input');
                  input?.focus();
                  input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 active:scale-95"
              >
                <MessageCircle className="w-5 h-5"/>
              </button>
              {myRole === 'owner' && (
                <button 
                  onClick={() => {
                    setEditGroupTitle(activeGroup.title);
                    setEditGroupDesc(activeGroup.description || '');
                    setEditGroupCover(activeGroup.coverUrl || '');
                    setEditGroupCoverFile(null);
                    setIsEditingGroup(true);
                  }} 
                  className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 active:scale-95 transition-all"
                  title="Editar Nombre del Grupo / Edit Group Name"
                >
                  <Edit2 className="w-5 h-5"/>
                </button>
              )}
              {myRole === 'owner' && <button onClick={() => handleDeleteGroup(activeGroup.id)} className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 active:scale-95"><Trash2 className="w-5 h-5"/></button>}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full h-[250px] shrink-0">
            {isCustomCover(activeGroup.coverUrl) ? (
              <img src={activeGroup.coverUrl} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGroupGradient(activeGroup.title, activeGroup.id)} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/15" />
                <div className="font-black text-4xl text-white tracking-widest bg-white/20 px-5 py-2.5 rounded-2xl backdrop-blur-md z-10">{getGroupInitials(activeGroup.title)}</div>
                <Users className="w-56 h-56 absolute -right-6 -bottom-6 text-white/10 rotate-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
            <div className="absolute xl:bottom-4 bottom-4 left-4 right-4 flex flex-col gap-1.5">
               <div className="flex items-center gap-2">
                 {activeGroup.isPrivate && <Shield className="w-4 h-4 text-brand-blue" />}
                 <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{activeGroup.uid}</span>
               </div>
               <div className="flex items-center gap-2.5">
                 <h1 className="font-extrabold text-3xl tracking-tight text-white leading-tight">{activeGroup.title}</h1>
                 {myRole === 'owner' && (
                   <button 
                     onClick={() => {
                       setEditGroupTitle(activeGroup.title);
                       setEditGroupDesc(activeGroup.description || '');
                       setEditGroupCover(activeGroup.coverUrl || '');
                       setEditGroupCoverFile(null);
                       setIsEditingGroup(true);
                     }}
                     className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-1.5 rounded-lg transition-all active:scale-95 hover:scale-105"
                     title="Editar Nombre / Edit Name"
                   >
                     <Edit2 className="w-3.5 h-3.5" />
                   </button>
                 )}
               </div>
               <p className="text-gray-300 text-sm">{activeGroup.description}</p>
            </div>
          </div>

          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {activeGroup.members.slice(0,3).map(m => (
                  <UserAvatar 
                    key={m.userId} 
                    src={m.avatar} 
                    name={m.name}
                    size="xs"
                    className="border-2 border-white"
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700 ml-1">{activeGroup.members.length} Members</span>
            </div>
            {!isMember ? (
              <button onClick={() => handleJoin(activeGroup.id)} className="bg-brand-blue text-white font-bold px-5 py-2 rounded-full shadow-sm hover:shadow-md active:scale-95">Join Group</button>
            ) : (
              <div className="flex items-center gap-2">
                {myRole === 'owner' && (
                  <button 
                    onClick={() => {
                      setEditGroupTitle(activeGroup.title);
                      setEditGroupDesc(activeGroup.description || '');
                      setEditGroupCover(activeGroup.coverUrl || '');
                      setEditGroupCoverFile(null);
                      setIsEditingGroup(true);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-brand-blue font-bold px-4 py-2 rounded-full shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5"/> Edit Group
                  </button>
                )}
                <button onClick={() => setView('invite')} className="bg-gray-100 text-gray-800 font-bold px-4 py-2 rounded-full shadow-sm hover:bg-gray-200 active:scale-95 flex items-center gap-1"><UserPlus className="w-4 h-4"/> Invite</button>
              </div>
            )}
          </div>

          {/* Members List (Admin view) */}
          {isAdmin && (
            <div className="p-4 bg-white mt-2 flex flex-col gap-3">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-blue" /> Manage Members
              </h3>
              <div className="flex flex-col gap-2">
                {activeGroup.members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl transition-all hover:border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar 
                          src={m.avatar} 
                          name={m.name}
                          size="md"
                          className="border border-gray-200"
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${m.role === 'owner' ? 'bg-yellow-500' : m.role === 'moderator' ? 'bg-brand-blue' : 'bg-gray-400'}`}></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <div className="text-sm font-bold text-gray-900">{m.name}</div>
                          {(m.userId === currentUserId || m.name === 'Dan Abramov') && (
                            <BadgeCheck className="w-[14px] h-[14px] text-white fill-[#0095f6]" />
                          )}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-brand-blue flex items-center gap-1">
                          {m.role === 'owner' ? <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> : <Shield className="w-3 h-3" />}
                          {m.role}
                        </div>
                      </div>
                    </div>
                    
                    {m.userId !== currentUserId && (
                      <div className="flex items-center gap-1">
                        {myRole === 'owner' && (
                          <button 
                            onClick={() => handleToggleRole(activeGroup.id, m.userId)}
                            className={`p-2 rounded-xl transition-colors ${m.role === 'moderator' ? 'bg-blue-100 text-brand-blue' : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-brand-blue'}`}
                            title={m.role === 'moderator' ? "Demote to Member" : "Promote to Moderator"}
                          >
                            <Shield className="w-4 h-4"/>
                          </button>
                        )}
                        <button 
                          onClick={() => handleBanUser(activeGroup.id, m.userId)} 
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95"
                          title="Ban User"
                        >
                          <Ban className="w-4 h-4"/>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts / Activity Feed */}
          <div className="p-4 flex flex-col gap-4">
             {(() => {
               const itemsToRender: any[] = [];
               const activeGroupAds: any[] = [];
               
               activeGroup.posts.forEach((post, index) => {
                 itemsToRender.push({ type: 'post', data: post });
                 if ((index + 1) % 3 === 0 && activeGroupAds.length > 0) {
                   const adIndex = Math.floor((index / 3) % activeGroupAds.length);
                   itemsToRender.push({ type: 'ad', data: activeGroupAds[adIndex] });
                 }
               });
               
               if (activeGroup.posts.length === 0 && activeGroupAds.length > 0) {
                 activeGroupAds.forEach(ad => itemsToRender.push({ type: 'ad', data: ad }));
               }
               
               return itemsToRender.map((item, idx) => {
                 if (item.type === 'ad') {
                   const ad = item.data;
                   console.log('ad impression', ad.id);
                   return (
                     <div key={`group-ad-${ad.id}-${idx}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 text-left">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-[10px] border">
                             AD
                           </div>
                           <div className="flex flex-col">
                             <div className="flex items-center gap-1.5">
                               <span className="font-extrabold text-[13px] text-gray-900 tracking-tight leading-tight">{ad.campaignName}</span>
                               <span className="text-[8px] bg-blue-100 border border-blue-150 text-blue-600 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Patrocinador</span>
                             </div>
                             <span className="text-[9px] text-gray-400 font-bold tracking-wide">Publicidad del Grupo • Anuncio</span>
                           </div>
                         </div>
                       </div>
                       
                       <p className="text-gray-800 text-[14px] leading-relaxed whitespace-pre-line">{ad.caption}</p>
                       
                       {ad.image && (
                         <div className="rounded-xl overflow-hidden border border-gray-100 max-h-60 flex items-center justify-center bg-gray-50 cursor-pointer" onClick={() => {
                           BusinessStore.logAdClick(ad.id);
                           window.open(ad.ctaLink, '_blank');
                         }}>
                           <img src={ad.image} className="w-full h-auto object-cover" alt="Sponsor Banner" />
                         </div>
                       )}

                       <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide flex items-center gap-1.5">Plataforma IMChat Ads</span>
                         <button 
                           onClick={() => {
                             BusinessStore.logAdClick(ad.id);
                             window.open(ad.ctaLink, '_blank');
                           }}
                           className="bg-blue-600 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                         >
                           {ad.ctaText || 'Más Información'}
                         </button>
                       </div>
                     </div>
                   );
                 }
                 
                 const post = item.data;
                 return (
               <div key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                       {post.authorName.charAt(0)}
                     </div>
                     <div className="flex flex-col">
                       <div className="flex items-center gap-1">
                         <span className="font-bold text-sm text-gray-900 leading-tight">{post.authorName}</span>
                         {(post.authorId === 'my_id' || post.authorName === 'Dan Abramov') && (
                           <BadgeCheck className="w-[14px] h-[14px] text-white fill-[#0095f6]" />
                         )}
                       </div>
                       <span className="text-[10px] text-gray-400">{new Date(post.timestamp).toLocaleTimeString()}</span>
                     </div>
                   </div>
                   {isAdmin && post.authorId !== 'system' && (
                     <button onClick={() => handleDeletePost(activeGroup.id, post.id)} className="text-gray-400 hover:text-red-500 px-2 py-1"><Trash2 className="w-4 h-4"/></button>
                   )}
                 </div>
                 
                 {post.topic && (
                   <div className="inline-flex items-center gap-1 bg-blue-50 text-brand-blue px-2 py-0.5 rounded font-bold text-xs mt-1 w-fit">
                     <Hash className="w-3 h-3" /> {post.topic}
                   </div>
                 )}
                 <p className="text-gray-800 text-[15px]">
                    {post.content.split(' ').map((word, idx) => {
                      if (word.startsWith('@')) {
                        return <span key={idx} className="text-brand-blue font-bold cursor-pointer hover:underline">{word} </span>;
                      }
                      return word + ' ';
                    })}
                  </p>
                  {post.mediaUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 max-h-60 flex items-center justify-center bg-gray-50">
                      <img src={post.mediaUrl} className="max-w-full h-auto object-contain" alt="Post media" />
                    </div>
                  )}
                </div>
              );
            });
           })()}
          </div>
        </div>

        {/* Input Area */}
        {isMember && (
          <div className="p-3 bg-white border-t border-gray-200 z-10 flex flex-col gap-2 relative">
            <AnimatePresence>
               {showGiphy && (
                 <div className="absolute bottom-[calc(100%+10px)] left-4 right-4 z-50">
                    <GiphyPicker onSelect={handleSendGif} onClose={() => setShowGiphy(false)} type="gifs" />
                 </div>
               )}
            </AnimatePresence>
            {showTagMenu && (
              <div className="absolute bottom-[calc(100%+10px)] left-4 right-4 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 max-h-40 overflow-y-auto flex flex-col p-1">
                {activeGroup.members.filter(m => m.name.toLowerCase().includes(tagSearch.toLowerCase())).map(m => (
                  <button 
                    key={m.userId}
                    onClick={() => insertTag(m.name)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl text-left"
                  >
                    <UserAvatar 
                      src={m.avatar} 
                      name={m.name}
                      size="xs"
                      className="border border-gray-100"
                    />
                    <span className="text-sm font-bold text-gray-900">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 w-full">
               <input type="text" value={topicInput} onChange={e=>setTopicInput(e.target.value)} placeholder="Topic (Optional)" className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs outline-none w-1/3 text-brand-blue font-semibold placeholder-gray-400" />
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1 items-center">
              <button 
                onClick={() => setShowGiphy(!showGiphy)}
                className="p-2 text-gray-500 hover:text-brand-blue transition-colors rounded-lg"
              >
                <Smile className="w-5 h-5" />
              </button>
              <input 
                id="group-post-input" 
                type="text" 
                value={postInput} 
                onChange={e=>handleInputChange(e.target.value)} 
                placeholder="Post to group... use @ to tag" 
                className="bg-transparent px-3 py-2 outline-none flex-1 font-medium text-gray-900 text-sm" 
              />
              <button disabled={!postInput.trim()} onClick={handleCreatePost} className="bg-brand-blue text-white p-2 rounded-lg disabled:opacity-50 active:scale-95 transition-all"><MessageCircle className="w-5 h-5"/></button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {isEditingGroup && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[310] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-2xl flex flex-col p-6 text-left"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <h2 className="font-black text-lg text-gray-900">Editar Grupo / Edit Group</h2>
                  <button onClick={() => setIsEditingGroup(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 active:scale-95"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Nombre del Grupo / Group Name</label>
                    <input 
                      type="text" 
                      value={editGroupTitle} 
                      onChange={e => setEditGroupTitle(e.target.value)} 
                      placeholder="Ej. Mi increible grupo"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-sm"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Descripción / Description</label>
                    <textarea 
                      value={editGroupDesc} 
                      onChange={e => setEditGroupDesc(e.target.value)} 
                      placeholder="¿De qué trata este grupo?"
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 text-sm outline-none resize-none focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase font-bold">Portada del Grupo / Group Cover</label>
                    <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden group border border-gray-200 flex items-center justify-center">
                      {isCustomCover(editGroupCover) ? (
                        <>
                          <img src={editGroupCover} className="w-full h-full object-cover absolute inset-0" alt="New Cover Option" />
                          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                        </>
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getGroupGradient(editGroupTitle, activeGroupId || '')} flex items-center justify-center`}>
                          <span className="font-extrabold text-xs text-white bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur">{getGroupInitials(editGroupTitle)}</span>
                        </div>
                      )}
                      <label className="relative z-10 bg-black/70 hover:bg-black/90 active:scale-95 px-3.5 py-1.5 rounded-full flex items-center justify-center transition-all cursor-pointer text-white font-bold text-[10px] uppercase tracking-wider gap-1.5 shadow-md border border-white/10">
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           onChange={e => {
                             const file = e.target.files?.[0];
                             if (file) {
                               setEditGroupCover(URL.createObjectURL(file));
                               setEditGroupCoverFile(file);
                             }
                           }} 
                         />
                         <ImageIcon className="w-3.5 h-3.5 text-white" /> Sustituir Portada / Change Cover
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button 
                    onClick={() => setIsEditingGroup(false)} 
                    className="flex-1 py-3 bg-gray-150 hover:bg-gray-205 text-gray-700 font-extrabold text-xs rounded-xl active:scale-95 transition-all uppercase tracking-wider"
                  >
                    Cancelar / Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (!editGroupTitle.trim() || !activeGroupId) return;
                      setIsSavingGroup(true);
                      try {
                        let finalCover = editGroupCover;
                        if (editGroupCoverFile) {
                          try {
                            const res = await uploadToCloudinary(editGroupCoverFile, 'image', activeGroup.uid || activeGroupId);
                            if (res && res.secure_url) {
                              finalCover = res.secure_url;
                            } else {
                              finalCover = await fileToCompressedBase64(editGroupCoverFile);
                            }
                          } catch (err) {
                            finalCover = await fileToCompressedBase64(editGroupCoverFile);
                          }
                        }

                        await GroupStore.updateGroup(activeGroupId, {
                          title: editGroupTitle.trim(),
                          description: editGroupDesc.trim(),
                          coverUrl: finalCover
                        });
                        setIsEditingGroup(false);
                      } catch (err) {
                        console.error("Failed to update group fields:", err);
                        alert("Error updating group. Please try again.");
                      } finally {
                        setIsSavingGroup(false);
                      }
                    }}
                    disabled={isSavingGroup || !editGroupTitle.trim()}
                    className="flex-1 py-3 bg-brand-blue hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 disabled:opacity-50"
                  >
                    {isSavingGroup ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Guardar / Save'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // LIST VIEW
  const publicGroups = groups.filter(g => !g.isPrivate);
  const recentActivities = publicGroups.flatMap(g => 
    (g.posts || []).map(p => ({
      ...p,
      group: {
        id: g.id,
        title: g.title,
        coverUrl: g.coverUrl
      }
    }))
  ).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <header className="bg-white p-4 flex items-center justify-between border-b border-gray-100 z-10 shadow-sm sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-gray-900">Groups</h1>
        </div>
        <button 
          onClick={() => setView('create')}
          className="bg-brand-blue text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 hover:bg-blue-600 active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </header>

      {/* Modern Tab Switcher */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 z-10">
        <button
          onClick={() => setListSubTab('explore')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 ${
            listSubTab === 'explore'
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-205'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Explore Groups
        </button>
        <button
          onClick={() => setListSubTab('activity')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 ${
            listSubTab === 'activity'
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-205'
          }`}
        >
          <Clock className="w-3.5 h-3.5 animate-pulse" /> Recent Activity
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {listSubTab === 'explore' ? (
          <>
            {groups.map(g => (
              <div key={g.id} onClick={() => { setActiveGroupId(g.id); setView('detail'); }} className="bg-white border text-left border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col active:scale-[0.98]">
                <div className="h-[120px] relative w-full border-b border-gray-100">
                  {isCustomCover(g.coverUrl) ? (
                    <img src={g.coverUrl} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGroupGradient(g.title, g.id)} flex items-center justify-center relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="font-black text-xl text-white tracking-widest bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm z-10">{getGroupInitials(g.title)}</div>
                      <Users className="w-32 h-32 absolute -right-4 -bottom-4 text-white/10 rotate-12" />
                    </div>
                  )}
                  {g.isPrivate && (
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 flex items-center gap-1 rounded text-white text-[10px] font-bold">
                      <Shield className="w-3 h-3" /> PRIVATE
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1">
                   <div className="flex items-center gap-1.5">
                     <h2 className="font-bold text-gray-900 leading-tight">{g.title}</h2>
                     {g.id === 'g1' && <BadgeCheck className="w-[16px] h-[16px] text-white fill-[#0095f6]" />}
                   </div>
                   <div className="flex items-center gap-3 mt-1">
                     <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {g.members.length} members</span>
                     <span className="text-[10px] bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{g.uid}</span>
                   </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {/* System Chronology Welcome Ribbon */}
            <div className="bg-gradient-to-r from-blue-50/85 to-indigo-50/85 border border-indigo-100/50 rounded-2xl p-4 flex items-center justify-between text-left shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="font-extrabold text-sm text-indigo-950">System Chronology Feed</span>
                <span className="text-xs text-indigo-800/80">Real-time compilation of conversations from all public groups.</span>
              </div>
              <span className="bg-brand-blue text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm shadow-brand-blue/10">{recentActivities.length} Posts</span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="bg-white border border-gray-150 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3 shadow-xs my-4">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900">No activity registered yet</span>
                  <span className="text-xs text-gray-500 max-w-xs mt-1">Be the first to publish a post inside any group and make history!</span>
                </div>
                <button 
                  onClick={() => setListSubTab('explore')}
                  className="bg-brand-blue text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors active:scale-95 shadow-sm shadow-blue-500/15"
                >
                  Explore Groups
                </button>
              </div>
            ) : (
              recentActivities.map((post) => (
                <div 
                  key={`feed-${post.id}`} 
                  onClick={() => {
                    setActiveGroupId(post.group.id);
                    setView('detail');
                  }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:border-brand-blue/60 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3.5 text-left active:scale-[0.99]"
                >
                  {/* Card top row */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                        {post.authorName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-gray-900 leading-tight">{post.authorName}</span>
                          {(post.authorId === 'my_id' || post.authorName === 'Dan Abramov' || post.authorId === 'user_1') && (
                            <BadgeCheck className="w-[14px] h-[14px] text-white fill-[#0095f6]" />
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 font-semibold">{new Date(post.timestamp).toLocaleDateString()} {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Group link pill */}
                    <div className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 max-w-[150px] md:max-w-xs px-2.5 py-1 rounded-full border border-gray-200/60 transition-colors">
                      <span className="text-[10px] text-gray-600 font-bold truncate">{post.group.title}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>

                  {post.topic && (
                    <div className="inline-flex items-center gap-1 bg-blue-50 text-brand-blue px-2 py-0.5 rounded font-bold text-[10px] w-fit">
                      <Hash className="w-2.5 h-2.5" /> {post.topic}
                    </div>
                  )}

                  {/* Body Text */}
                  {post.content && (
                    <p className="text-gray-800 text-[14px] leading-relaxed break-words font-medium">
                      {post.content.split(' ').map((word, idx) => {
                        if (word.startsWith('@')) {
                          return <span key={idx} className="text-brand-blue font-bold cursor-pointer hover:underline">{word} </span>;
                        }
                        return word + ' ';
                      })}
                    </p>
                  )}

                  {/* Post Attachment image */}
                  {post.mediaUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-150 max-h-48 flex items-center justify-center bg-gray-50 mt-1">
                      <img src={post.mediaUrl} className="max-w-full h-auto object-contain" alt="Attachment media" />
                    </div>
                  )}

                  {/* Foot Action row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-50 text-[11px] font-bold text-brand-blue hover:text-blue-600">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> Join conversation
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">Click to open group</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
