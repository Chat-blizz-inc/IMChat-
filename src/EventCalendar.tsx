import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Plus, ChevronLeft, ChevronRight, 
  Share2, X, Gift, Utensils, Users, Music, Home, Map, Trophy, GraduationCap, Video, 
  Trash2, Tag, Sparkles, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EventStore, Event, EventCategory } from './lib/EventStore';
import { PostStore } from './lib/PostStore';
import { auth } from './firebase';

const CATEGORIES: EventCategory[] = [
  'Birthday', 'Catering', 'Entertainment', 'House Party', 'Meeting', 'Music', 'School Event', 'Sports', 'Tour', 'Webinar'
];

const categoryIcons: Record<EventCategory, any> = {
  'Birthday': Gift,
  'Entertainment': Trophy, 
  'Catering': Utensils,
  'Meeting': Users,
  'Music': Music,
  'House Party': Home,
  'Tour': Map,
  'Sports': Trophy,
  'School Event': GraduationCap,
  'Webinar': Video
};

const categoryColors: Record<EventCategory, string> = {
  'Birthday': 'bg-pink-50 text-pink-500',
  'Entertainment': 'bg-purple-50 text-purple-500',
  'Catering': 'bg-orange-50 text-orange-500',
  'Meeting': 'bg-blue-50 text-brand-blue',
  'Music': 'bg-indigo-50 text-indigo-500',
  'House Party': 'bg-red-50 text-red-500',
  'Tour': 'bg-green-50 text-green-500',
  'Sports': 'bg-yellow-50 text-yellow-500',
  'School Event': 'bg-sky-50 text-sky-500',
  'Webinar': 'bg-teal-50 text-teal-500'
};

function getEventStartDateTime(event: Event): Date {
  const d = event.date;
  const isUtcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  
  let year = d.getFullYear();
  let month = d.getMonth();
  let date = d.getDate();
  
  if (isUtcMidnight) {
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    date = d.getUTCDate();
  }
  
  const timeStr = event.time.trim();
  let hours = 0;
  let minutes = 0;
  
  const ampmMatch = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
  } else {
    const standardMatch = timeStr.match(/^(\d+):(\d+)/);
    if (standardMatch) {
      hours = parseInt(standardMatch[1], 10);
      minutes = parseInt(standardMatch[2], 10);
    }
  }
  
  return new Date(year, month, date, hours, minutes, 0, 0);
}

export default function EventCalendar({ onBack, defaultIsCreating = false }: { onBack: () => void, defaultIsCreating?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>(EventStore.getEvents());
  const [isCreating, setIsCreating] = useState(defaultIsCreating);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState<EventCategory>('Meeting');
  const [newCover, setNewCover] = useState<string | null>(null);

  useEffect(() => {
    if (defaultIsCreating) setIsCreating(true);
  }, [defaultIsCreating]);

  useEffect(() => {
    const unsub = EventStore.subscribe(() => {
      setEvents(EventStore.getEvents());
    });
    return unsub;
  }, []);

  // Request Browser Notification Permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Periodic check to trigger browser notifications when event starts within 15 mins
  useEffect(() => {
    const checkUpcomingEvents = () => {
      try {
        const now = new Date();
        const fifteenMinutesMs = 15 * 60 * 1000;
        
        let notifiedSet = new Set<string>();
        try {
          const saved = sessionStorage.getItem('notified_events');
          if (saved) notifiedSet = new Set(JSON.parse(saved));
        } catch {}

        let updated = false;

        events.forEach(evt => {
          if (notifiedSet.has(evt.id)) return;

          const eventTime = getEventStartDateTime(evt);
          const diff = eventTime.getTime() - now.getTime();

          // If the event starts within the next 15 minutes (and hasn't passed by more than 1 minute)
          if (diff >= -60000 && diff <= fifteenMinutesMs) {
            notifiedSet.add(evt.id);
            updated = true;

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const minutesLeft = Math.ceil(diff / 60000);
              const notificationTitle = `Upcoming: ${evt.title}`;
              const notificationBody = minutesLeft > 0 
                ? `Starts in ${minutesLeft} minutes at ${evt.time} (${evt.location}).`
                : `Starting now at ${evt.time} (${evt.location}).`;

              new Notification(notificationTitle, {
                body: notificationBody,
                icon: evt.coverImage || 'https://api.dicebear.com/7.x/adventurer/svg?seed=calendar',
              });
            }
          }
        });

        if (updated) {
          try {
            sessionStorage.setItem('notified_events', JSON.stringify(Array.from(notifiedSet)));
          } catch {}
        }
      } catch (err) {
        console.error("Error in browser notification checker:", err);
      }
    };

    // Run check once immediately on events change
    checkUpcomingEvents();

    const interval = setInterval(checkUpcomingEvents, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [events]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCover(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = (evt: Event) => {
    const shareData = {
      title: evt.title,
      text: `Join me for ${evt.title} at ${evt.location} on ${evt.date.toLocaleDateString()}!`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      alert('Event details copied to clipboard!');
    }
  };

  const handleShareToFeed = async (evt: Event) => {
    const userName = auth.currentUser?.displayName || 'User';
    const userAvatarUrl = auth.currentUser?.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=calendar_user';
    await PostStore.addPost({
      user: { name: userName, avatar: userAvatarUrl, location: 'Shared an Event 📅' },
      userId: auth.currentUser?.uid || 'me',
      image: evt.coverImage || 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=600',
      mediaType: 'image',
      caption: `📅 Come to my event: "${evt.title}"! \n📍 Location: ${evt.location}\n⏰ Time: ${evt.time}\n🗓️ Date: ${evt.date.toLocaleDateString()}\nClick "Interested" below to join and register! ⭐`,
      visibility: 'public',
      eventData: {
        id: evt.id,
        title: evt.title,
        date: evt.date.toISOString(),
        time: evt.time,
        location: evt.location,
        category: evt.category,
        coverImage: evt.coverImage,
        creatorId: evt.creatorId,
        interestedCount: evt.interestedUserIds?.length || 0,
        isPromoted: evt.isPromoted,
        promotionBudget: evt.promotionBudget
      }
    });
    alert('Event shared in the Posts section successfully! 📮 All users can now see and join.');
  };

  const handleBuyPromotion = async (evt: Event) => {
    const budgetStr = prompt("Enter the budget in USD to promote this event (minimum $10):", "50");
    if (!budgetStr) return;
    const budget = parseFloat(budgetStr);
    if (isNaN(budget) || budget < 10) {
      alert("Invalid budget. The minimum amount is $10.");
      return;
    }
    
    try {
      const success = EventStore.promoteEvent(evt.id, budget);
      if (success) {
        const userName = auth.currentUser?.displayName || 'User';
        const userAvatarUrl = auth.currentUser?.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=calendar_user';
        
        // Post as a promoted ad block on the main posts feed
        await PostStore.addPost({
          user: { name: 'PROMOTED EVENT', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=promoted_channel', location: 'Promoted Event 🔥' },
          userId: 'system-promoted',
          image: evt.coverImage || 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=600',
          mediaType: 'image',
          caption: `🚀 FEATURED EVENT! 🚀\nDon't miss: "${evt.title}"\nJoin now by clicking "Interested" on this post!`,
          visibility: 'public',
          eventData: {
            id: evt.id,
            title: evt.title,
            date: evt.date.toISOString(),
            time: evt.time,
            location: evt.location,
            category: evt.category,
            coverImage: evt.coverImage,
            creatorId: evt.creatorId,
            interestedCount: evt.interestedUserIds?.length || 0,
            isPromoted: true,
            promotionBudget: budget
          }
        });
        
        alert(`Congratulations! Your event "${evt.title}" has been promoted with a budget of $${budget}. It will now be featured at the top of the events list and in the posts feed.`);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing promotion. Check the console.");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newTime) return;

    EventStore.addEvent({
      title: newTitle,
      date: new Date(newDate),
      time: newTime,
      location: newLocation || 'Remote/Online',
      category: newCategory,
      creatorId: 'me',
      coverImage: newCover || `https://picsum.photos/seed/${newTitle.replace(/\s+/g, '')}/800/400`
    });

    // Reset
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewLocation('');
    setNewCover(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this event?')) {
      EventStore.deleteEvent(id);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 flex flex-col">
      <header className="bg-brand-blue p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 active:scale-95 transition-transform hover:bg-white/10 rounded-full text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-bold tracking-tight text-xl italic">Event Calendar</h1>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full active:scale-95 transition-all text-white"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 bg-white">
        <div className="p-4 mb-4">
          <div className="flex items-center justify-between mb-8 mt-2">
            <h2 className="font-bold text-[22px] text-[#1c1e21]">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 bg-[#f0f2f5] rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-5 h-5 text-[#1c1e21]" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-2 bg-[#f0f2f5] rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Next Month"
              >
                <ChevronRight className="w-5 h-5 text-[#1c1e21]" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-6">
            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => (
              <div key={d} className="text-[13px] font-bold text-gray-500 tracking-wider h-10 flex items-center justify-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2">
            {/* Calendar Padding for start of month */}
            {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}
            
            {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1;
              const hasEvent = events.some(e => e.date.getDate() === day && e.date.getMonth() === currentDate.getMonth());
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
              return (
                <div 
                  key={i} 
                  className={`relative h-12 flex items-center justify-center text-[16px] font-medium transition-all ${
                    isToday
                      ? 'bg-brand-blue text-white rounded-[14px] shadow-lg shadow-brand-blue/30 scale-110 z-10' 
                      : 'text-[#1c1e21] hover:bg-gray-100 rounded-[14px] cursor-pointer'
                  }`}
                >
                  {day}
                  {hasEvent && !isToday && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-blue" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Upcoming Events</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {events.length} Events
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {events.length > 0 ? (
              events.map((evt) => {
                const Icon = categoryIcons[evt.category] || CalendarIcon;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={evt.id} 
                    className={`bg-white rounded-3xl shadow-sm overflow-hidden border transition-all duration-300 group ${
                      evt.isPromoted 
                        ? 'border-yellow-400/50 bg-gradient-to-b from-amber-50/20 to-white hover:shadow-md' 
                        : 'border-gray-100 hover:shadow-sm'
                    }`}
                  >
                    {evt.coverImage && (
                      <div className="w-full h-32 relative">
                        <img src={evt.coverImage} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                        
                        <div className={`absolute top-3 left-3 p-2 rounded-xl flex items-center gap-1.5 ${categoryColors[evt.category] || 'bg-blue-50 text-brand-blue'} shadow-lg backdrop-blur-sm`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{evt.category}</span>
                        </div>

                        {evt.isPromoted && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 border border-yellow-400 text-white rounded-xl shadow-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3 animate-pulse text-yellow-300" />
                            <span>DESTACADO</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 flex gap-4 items-start pb-2">
                      <div className={`p-3 rounded-2xl flex flex-col items-center justify-center min-w-[60px] ${categoryColors[evt.category] || 'bg-blue-50 text-brand-blue'}`}>
                        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">
                          {evt.date.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-2xl font-black">{evt.date.getDate()}</span>
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-bold text-gray-900 text-[16px] mb-1.5 leading-tight">{evt.title}</h4>
                        
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{evt.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium overflow-hidden">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 self-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(evt);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-brand-blue transition-all active:scale-90"
                          title="Share Link"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        {evt.creatorId === 'me' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(evt.id);
                            }}
                            className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-all active:scale-90"
                            title="Delete Event"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Event Interaction Actions Footer */}
                    <div className="px-4 pb-3.5 pt-2 flex flex-wrap gap-2 items-center justify-between border-t border-gray-50 bg-gray-50/40 text-left">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        <span>{evt.interestedUserIds?.length || 0} inscritos</span>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            EventStore.toggleInterested(evt.id, auth.currentUser?.uid || 'me');
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 ${
                            evt.interestedUserIds?.includes(auth.currentUser?.uid || 'me')
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                              : 'bg-white hover:bg-gray-100 border border-gray-150 text-[#1c1e21]'
                          }`}
                        >
                          <Heart className={`w-3.1 h-3.1 ${evt.interestedUserIds?.includes(auth.currentUser?.uid || 'me') ? 'fill-white text-white' : 'text-gray-400'}`} />
                          <span>Me Interesa</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareToFeed(evt);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-xl text-[#1c1e21] font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                        >
                          <span>Compartir</span>
                        </button>

                        {!evt.isPromoted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuyPromotion(evt);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-amber-500/10 animate-pulse"
                          >
                            <Sparkles className="w-3 h-3 text-yellow-200" />
                            <span>Promover</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <CalendarIcon className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">No events scheduled</p>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="mt-4 text-brand-blue font-bold text-sm hover:underline"
                >
                  Create your first event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh] my-4"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-blue/5 to-transparent">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Create Event</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Schedule something fun</p>
                </div>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="p-2 bg-gray-100 rounded-2xl text-gray-500 hover:bg-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Event Cover Image</label>
                  <div 
                    className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[28px] overflow-hidden flex flex-col items-center justify-center relative hover:border-brand-blue/40 transition-colors group cursor-pointer"
                    onClick={() => document.getElementById('coverInput')?.click()}
                  >
                    {newCover ? (
                      <>
                        <img src={newCover} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm">
                          Change Image
                        </div>
                      </>
                    ) : (
                      <>
                        <Plus className="w-8 h-8 text-gray-300 mb-1" strokeWidth={1.5} />
                        <span className="text-xs font-bold text-gray-400">Upload Cover</span>
                      </>
                    )}
                    <input 
                      id="coverInput"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Event Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="E.g. Summer Beach Party 🏖️"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-blue/20 focus:bg-white rounded-2xl px-5 py-3 transition-all outline-none font-bold text-gray-900"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-blue/20 focus:bg-white rounded-2xl px-5 py-3 transition-all outline-none font-bold text-gray-900"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Time</label>
                    <input 
                      required
                      type="time" 
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-blue/20 focus:bg-white rounded-2xl px-5 py-3 transition-all outline-none font-bold text-gray-900"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Enter location or 'Webinar'"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-blue/20 focus:bg-white rounded-2xl pl-12 pr-5 py-3 transition-all outline-none font-bold text-gray-900"
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Select Category</label>
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {CATEGORIES.map(cat => {
                      const CategoryIcon = categoryIcons[cat] || CalendarIcon;
                      const isActive = newCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-sm font-bold active:scale-95 ${
                            isActive 
                              ? 'border-brand-blue bg-blue-50 text-brand-blue shadow-sm' 
                              : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <CategoryIcon className={`w-4 h-4 ${isActive ? 'text-brand-blue' : 'text-gray-400'}`} />
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="sticky bottom-0 w-full bg-brand-blue text-white font-black py-4 rounded-[40px] shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mb-2"
                >
                  <Plus className="w-6 h-6" strokeWidth={3} />
                  CREATE EVENT
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
