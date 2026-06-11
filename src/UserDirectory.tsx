import { useState, useEffect } from 'react';
import { Search as SearchIcon, UserPlus, UserCheck, BadgeCheck } from 'lucide-react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import UserAvatar from './components/UserAvatar';
import { GroupStore, Group } from './lib/GroupStore';
import { ChannelStore, Channel } from './lib/ChannelStore';

interface User {
  id: string;
  name: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'moderator' | 'team' | 'user';
  isVerified?: boolean;
  avatar?: string;
  hideAvatarPublicly?: boolean;
}

export default function UserDirectory({ 
  onUserSelected, 
  followingState, 
  onToggleFollow,
  searchQuery = '',
  onOpenNav
}: { 
  onUserSelected: (user: User) => void;
  followingState: Record<string, boolean>;
  onToggleFollow: (id: string) => void;
  searchQuery?: string;
  onOpenNav?: (navId: string) => void;
}) {
  const [search, setSearch] = useState(searchQuery);
  const [activeTab, setActiveTab] = useState<'people' | 'groups' | 'channels'>('people');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const OWNER_EMAILS = ['mobilephonesky987@gmail.com', 'contact@imchat.im'];

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        setLoading(false);
        return;
      }

      const unsubscribeSnap = onSnapshot(query(collection(db, "users"), limit(1000)), (snapshot) => {
        const usersData: User[] = [];
        snapshot.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() } as User);
        });
        setUsers(usersData);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
        setLoading(false);
      });

      return unsubscribeSnap;
    });

    return () => unsub();
  }, []);

  // Subscribe to Groups & Channels
  useEffect(() => {
    const updateGroups = () => setGroups(GroupStore.getGroups());
    updateGroups();
    return GroupStore.subscribe(updateGroups);
  }, []);

  useEffect(() => {
    const updateChannels = () => setChannels(ChannelStore.getChannels());
    updateChannels();
    return ChannelStore.subscribe(updateChannels);
  }, []);

  // Search filter implementation
  const filteredUsers = users.filter(n => (n?.name || '').toLowerCase().includes((search || '').toLowerCase()));
  
  const filteredGroups = groups.filter(g => 
    (g?.title || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (g?.description || '').toLowerCase().includes((search || '').toLowerCase())
  );

  const filteredChannels = channels.filter(c => 
    (c?.name || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (c?.description || '').toLowerCase().includes((search || '').toLowerCase())
  );

  const handleJoinGroup = async (group: Group) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;
    
    const isAlreadyMember = group.members.some(m => m.userId === currentUserId);
    if (isAlreadyMember) return;

    try {
      await GroupStore.joinGroup(group.id, {
        userId: currentUserId,
        name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Member',
        role: 'member',
        avatar: auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      });
    } catch (err) {
      console.error("Failed to join group:", err);
    }
  };

  const handleToggleSubscribeChannel = async (channel: Channel) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    try {
      await ChannelStore.toggleSubscribe(channel.id, currentUserId);
    } catch (err) {
      console.error("Failed to toggle subscribe:", err);
    }
  };

  const getCount = () => {
    if (activeTab === 'people') return filteredUsers.length;
    if (activeTab === 'groups') return filteredGroups.length;
    return filteredChannels.length;
  };

  const RoleBadge = ({ role }: { role?: string }) => {
    if (!role || role === 'user') return null;
    
    const colors: Record<string, string> = {
      admin: 'bg-red-50 text-red-600 border-red-100',
      moderator: 'bg-green-50 text-green-600 border-green-100',
      vip: 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm',
      team: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      restricted: 'bg-gray-100 text-gray-500 border-gray-250 line-through'
    };
    
    const labels: Record<string, string> = {
      admin: 'Admin',
      moderator: 'Mod',
      vip: '👑 VIP Gold',
      team: 'IMChat Team',
      restricted: 'Restricted'
    };

    const colorClass = colors[role] || 'bg-gray-50 text-gray-500 border-gray-100';
    const labelText = labels[role] || role;

    return (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${colorClass}`}>
        {labelText}
      </span>
    );
  };

  return (
    <main className="flex-1 bg-white overflow-y-auto pb-20">
      <div className="px-4 py-2 sticky top-0 bg-white z-10 border-b border-gray-100 flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900 tracking-tight">Explore</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{getCount()} Results</span>
        </div>
      </div>

      <div className="p-4 bg-white">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-100 rounded-lg py-2 pl-10 pr-4 outline-none text-sm focus:ring-2 focus:ring-brand-blue/10 transition-all border-none"
          />
        </div>
      </div>

      {/* Modern High-Contrast Tabs */}
      <div className="flex border-b border-gray-100 bg-white sticky top-22 z-10">
        {(['people', 'groups', 'channels'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-3 text-sm font-semibold border-b-2 transition-all capitalize ${
              activeTab === tab 
                ? 'border-brand-blue text-brand-blue font-bold px-1' 
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab === 'people' ? 'People' : tab === 'groups' ? 'Groups' : 'Channels'}
          </button>
        ))}
      </div>
      
      <div className="flex flex-col mt-2">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
             <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
             <span className="text-sm text-gray-500 font-medium tracking-tight">Searching...</span>
          </div>
        ) : activeTab === 'people' ? (
          filteredUsers.length > 0 ? (
            <div className="mt-1">
              {filteredUsers.map((user) => {
                const isFollowing = followingState[user.id];
                const username = (user?.name || '').toLowerCase().replace(/\s+/g, '_');
                let displayAvatar = user.avatar;
                
                if (user.hideAvatarPublicly && user.id !== auth.currentUser?.uid) {
                  displayAvatar = undefined; // UserAvatar will handle alphabet fallback
                }

                return (
                  <div 
                    key={user.id} 
                    onClick={() => onUserSelected(user)}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50/50 cursor-pointer active:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-[54px] h-[54px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[1.5px] group-active:scale-95 transition-transform">
                          <UserAvatar 
                            src={displayAvatar} 
                            name={user.name}
                            size="md"
                            className="border-2 border-white"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm text-gray-900 leading-tight">@{username}</span>
                            {(user.isVerified || (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())) || (user.id === auth.currentUser?.uid && auth.currentUser?.email?.toLowerCase() && OWNER_EMAILS.includes(auth.currentUser.email.toLowerCase()))) && (
                              <BadgeCheck className="w-3.5 h-3.5 text-white fill-brand-blue" />
                            )}
                          </div>
                          <RoleBadge role={user.role} />
                        </div>
                        <span className="text-[13px] text-gray-500 font-normal leading-tight">{user.name}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFollow(user.id);
                      }}
                      className={`px-5 py-[7px] text-[13px] font-semibold rounded-lg transition-all active:scale-95 shadow-sm ${
                        isFollowing 
                          ? 'bg-gradient-to-r from-[#7e22ce] to-[#9333ea] text-white shadow-purple-200/20' 
                          : 'bg-brand-blue text-white border border-brand-blue hover:bg-blue-600'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                <SearchIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold">No results found</p>
              <p className="text-sm text-gray-500 mt-1">Try searching for other profiles.</p>
            </div>
          )
        ) : activeTab === 'groups' ? (
          filteredGroups.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {filteredGroups.map((group) => {
                const isMember = group.members?.some(m => m.userId === auth.currentUser?.uid);
                return (
                  <div 
                    key={group.id}
                    onClick={() => {
                      localStorage.setItem('explore_open_group_id', group.id);
                      if (onOpenNav) onOpenNav('group');
                    }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={group.coverUrl} className="w-[50px] h-[50px] rounded-xl object-cover border border-gray-100" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-900 leading-tight">{group.title}</span>
                        <span className="text-[11px] text-brand-blue font-medium mt-0.5">{group.members?.length || 0} members</span>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 max-w-[200px]">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isMember ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinGroup(group);
                          }}
                          className="px-4 py-1.5 bg-brand-blue text-white font-bold text-xs rounded-lg hover:bg-blue-600 active:scale-95 transition shadow-sm"
                        >
                          Join
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">Joined</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem('explore_open_group_id', group.id);
                          if (onOpenNav) onOpenNav('group');
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-lg active:scale-95 transition"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                <SearchIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold">No groups found</p>
              <p className="text-sm text-gray-500 mt-1">Try typing a different name or keyword.</p>
            </div>
          )
        ) : (
          filteredChannels.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {filteredChannels.map((channel) => {
                const isSubbed = channel.subscribers?.includes(auth.currentUser?.uid || '');
                return (
                  <div 
                    key={channel.id}
                    onClick={() => {
                      localStorage.setItem('explore_open_channel_id', channel.id);
                      if (onOpenNav) onOpenNav('channels');
                    }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={channel.coverUrl} className="w-[50px] h-[50px] rounded-xl object-cover border border-gray-100" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-900 leading-tight flex items-center gap-1">
                          {channel.name}
                          {(channel.id === 'ch1' || channel.isVerified || channel.ownerEmail === 'admin@imchat.app') && (
                            <BadgeCheck className="w-[14px] h-[14px] text-white fill-[#0095f6]" />
                          )}
                        </span>
                        <span className="text-[11px] text-purple-600 font-medium mt-0.5">{channel.subscribers?.length || 0} subscribers</span>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 max-w-[200px]">{channel.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSubscribeChannel(channel);
                        }}
                        className={`px-4 py-1.5 font-bold text-xs rounded-lg active:scale-95 transition shadow-sm ${
                          isSubbed 
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            : 'bg-brand-blue text-white hover:bg-blue-600'
                        }`}
                      >
                        {isSubbed ? 'Subscribed' : 'Subscribe'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem('explore_open_channel_id', channel.id);
                          if (onOpenNav) onOpenNav('channels');
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-lg active:scale-95 transition"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                <SearchIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold">No channels found</p>
              <p className="text-sm text-gray-500 mt-1">Try search queries for lifestyle or updates.</p>
            </div>
          )
        )}
      </div>
    </main>
  );
}

