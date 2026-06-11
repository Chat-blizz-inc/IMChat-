import React from 'react';
import { Flame, TrendingUp, Users, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import UserAvatar from './components/UserAvatar';

interface TrendsPageProps {
  onBack: () => void;
  onNavigate: (nav: string) => void;
  followingState: Record<string, boolean>;
  onToggleFollow: (handle: string) => void;
  onUserSelected: (user: any) => void;
}

export default function TrendsPage({ onBack, onNavigate, followingState, onToggleFollow, onUserSelected }: TrendsPageProps) {
  const [sortBy, setSortBy] = React.useState<'volume' | 'growth'>('volume');

  const trendingTopics = [
    { tag: "#SummerVibes", posts: "128k", volume: 128000, category: "Lifestyle", growth: "+12%", growthNum: 12 },
    { tag: "#TechTrends2024", posts: "85k", volume: 85000, category: "Technology", growth: "+45%", growthNum: 45 },
    { tag: "#FutureOfAI", posts: "240k", volume: 240000, category: "Science", growth: "+80%", growthNum: 80 },
    { tag: "#IMChatCommunity", posts: "42k", volume: 42000, category: "Social", growth: "+5%", growthNum: 5 },
    { tag: "#HealthyLiving", posts: "92k", volume: 92000, category: "Health", growth: "+18%", growthNum: 18 },
    { tag: "#TravelGoals", posts: "110k", volume: 110000, category: "Travel", growth: "+22%", growthNum: 22 },
  ];

  const sortedTopics = React.useMemo(() => {
    return [...trendingTopics].sort((a, b) => {
      if (sortBy === 'volume') {
        return b.volume - a.volume;
      }
      return b.growthNum - a.growthNum;
    });
  }, [sortBy]);

  const featuredUsers = [
    { id: "sylvia_d", name: "Sylvia del Bosque", handle: "@sylvia_d", avatar: "" },
    { id: "lolasky", name: "LolaSky", handle: "@lolasky", avatar: "" },
    { id: "sean_surf", name: "Sean", handle: "@sean_surf", avatar: "" },
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-brand-blue p-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={onBack} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
          <TrendingUp className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-xl flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-400 fill-orange-400" />
          Trends
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-orange-400 to-rose-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">What's Hot?</h2>
            <p className="text-white/80 text-sm font-medium">Discover the most talked about topics in your network right now.</p>
          </div>
          <Flame className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
        </div>

        {/* Trending List */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-2">
            <h3 className="font-bold text-gray-900 border-l-4 border-brand-blue pl-3">Top Hashtags</h3>
            
            {/* Sort Toggle Controls */}
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200">
              <button 
                onClick={() => setSortBy('volume')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'volume' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                📊 Sort by Volume
              </button>
              <button 
                onClick={() => setSortBy('growth')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'growth' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ⚡ Sort by Growth
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {sortedTopics.map((topic, idx) => {
              const isTop3 = idx < 3;
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={topic.tag} 
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-450 uppercase tracking-tighter">{topic.category}</span>
                      {isTop3 && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-orange-400 to-rose-500 text-white animate-pulse tracking-wide uppercase shadow-sm">
                          ⚡ Trending Now
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors flex items-center gap-1.5 truncate">
                      <span className="text-brand-blue text-sm font-black font-mono">#{idx + 1}</span>
                      <span className="truncate">{topic.tag}</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{topic.posts} posts</p>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-sm font-black text-green-500">{topic.growth}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto mt-1 group-hover:text-brand-blue transition-all group-hover:translate-x-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Rising Stars */}
        <section className="bg-gray-50 -mx-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-gray-900">Rising Stars</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {featuredUsers.map((user) => (
              <div 
                key={user.handle} 
                className="flex-shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-32 text-center"
              >
                <div className="cursor-pointer group" onClick={() => onUserSelected({ id: user.id, name: user.name, avatar: user.avatar })}>
                  <UserAvatar 
                    src={user.avatar} 
                    name={user.name} 
                    size="lg"
                    className="mx-auto mb-3 border-2 border-brand-blue p-0.5 group-hover:scale-105 transition-transform"
                  />
                  <h5 className="text-xs font-bold text-gray-900 truncate group-hover:text-brand-blue transition-colors">{user.name}</h5>
                </div>
                <p className="text-[10px] text-gray-500 truncate mb-3">{user.handle}</p>
                <button 
                  onClick={() => onToggleFollow(user.id)}
                  className={`${followingState[user.id] ? 'bg-gradient-to-r from-[#7e22ce] to-[#9333ea] text-white shadow-purple-200/20' : 'bg-brand-blue text-white'} text-[10px] font-bold px-3 py-1 rounded-full w-full transition-all active:scale-95`}
                >
                  {followingState[user.id] ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
