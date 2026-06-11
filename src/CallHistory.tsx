
import React, { useState, useEffect } from 'react';
import { 
  Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, 
  MoreVertical, Trash2, Search, Info, ArrowLeft, PhoneForwarded
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CallStore, CallLog, CallStatus } from './lib/CallStore';
import UserAvatar from './components/UserAvatar';

interface CallHistoryProps {
  onBack?: () => void;
  onInitCall?: (userId: string, userName: string, userAvatar: string, type: 'audio' | 'video') => void;
  onVisitProfile?: (user: { id: string, name: string, avatar: string }) => void;
}

export default function CallHistory({ onBack, onInitCall, onVisitProfile }: CallHistoryProps) {
  const [logs, setLogs] = useState<CallLog[]>(CallStore.getLogs());
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    return CallStore.subscribe(() => {
      setLogs(CallStore.getLogs());
    });
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.status === 'missed';
    const matchesSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusIcon = (status: CallStatus) => {
    switch (status) {
      case 'incoming': return <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />;
      case 'outgoing': return <PhoneOutgoing className="w-3.5 h-3.5 text-green-500" />;
      case 'missed': return <PhoneMissed className="w-3.5 h-3.5 text-red-500" />;
      case 'rejected': return <PhoneMissed className="w-3.5 h-3.5 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusText = (log: CallLog) => {
    const time = log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = log.timestamp.toLocaleDateString();
    const isToday = new Date().toLocaleDateString() === date;
    
    let statusLabel = '';
    switch (log.status) {
      case 'incoming': statusLabel = 'Incoming'; break;
      case 'outgoing': statusLabel = 'Outgoing'; break;
      case 'missed': statusLabel = 'Missed'; break;
      case 'rejected': statusLabel = 'Rejected'; break;
    }

    return `${isToday ? 'Today' : date}, ${time}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-teal-400 bg-clip-text text-transparent italic">Calls</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (confirm('Clear all call history?')) CallStore.clearLogs();
            }}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs / Filter */}
      <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-2">
        <div className="flex-1 flex bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-500'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('missed')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${filter === 'missed' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500'}`}
          >
            Missed
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search recent calls" 
            className="w-full bg-gray-50 rounded-xl py-2 pl-10 pr-4 text-sm border-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="flex flex-col">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={log.id} 
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div 
                  className="relative shrink-0"
                >
                  <div className="cursor-pointer" onClick={() => onVisitProfile?.({ id: log.userId, name: log.userName, avatar: log.userAvatar })}>
                    <UserAvatar 
                      src={log.userAvatar} 
                      name={log.userName}
                      size="lg"
                      className="border border-gray-100 shadow-sm" 
                    />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onInitCall?.(log.userId, log.userName, log.userAvatar, log.type);
                    }}
                    className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md border border-gray-100 active:scale-90 transition-all z-20 hover:bg-blue-50"
                  >
                    {log.type === 'video' ? (
                      <Video className="w-3.5 h-3.5 text-brand-blue fill-brand-blue/10" />
                    ) : (
                      <Phone className="w-3.5 h-3.5 text-brand-blue fill-brand-blue/10" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div 
                    className="flex items-center justify-between mb-0.5 cursor-pointer group/name"
                    onClick={() => onVisitProfile?.({ id: log.userId, name: log.userName, avatar: log.userAvatar })}
                  >
                    <h3 className={`font-bold truncate group-hover/name:text-brand-blue transition-colors ${log.status === 'missed' ? 'text-red-500' : 'text-gray-900'}`}>
                      {log.userName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(log.status)}
                    <span className="text-[12px] text-gray-500 font-medium tracking-tight">
                      {getStatusText(log)}
                    </span>
                    {log.duration && log.duration > 0 && (
                      <span className="text-[11px] text-gray-400">
                        • {formatDuration(log.duration)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onInitCall?.(log.userId, log.userName, log.userAvatar, log.type);
                    }}
                    className="p-2.5 rounded-full bg-gray-50 text-brand-blue hover:bg-brand-blue/10 active:scale-90 transition-all shadow-sm border border-gray-100"
                  >
                    {log.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100">
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm font-medium">No call logs found</p>
              {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
