
export type EventCategory = 
  | 'Birthday' 
  | 'Entertainment' 
  | 'Catering' 
  | 'Meeting' 
  | 'Music' 
  | 'House Party' 
  | 'Tour' 
  | 'Sports' 
  | 'School Event' 
  | 'Webinar';

export interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  location: string;
  category: EventCategory;
  description?: string;
  creatorId: string;
  coverImage?: string;
  isPromoted?: boolean;
  promotionBudget?: number;
  interestedUserIds?: string[];
  followers?: string[];
}

class EventStoreClass {
  private events: Event[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const saved = localStorage.getItem('imchat_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.events = parsed.map((evt: any) => ({
          ...evt,
          date: new Date(evt.date),
          interestedUserIds: evt.interestedUserIds || [],
          followers: evt.followers || [],
          isPromoted: !!evt.isPromoted,
          promotionBudget: evt.promotionBudget || 0
        }));
      } catch (e) {
        console.error('Failed to parse events', e);
        this.events = [];
      }
    }
    
    if (this.events.length === 0) {
      this.events = [
        {
          id: '1',
          title: 'Design Team Sync',
          date: new Date(),
          time: '10:00 AM',
          location: 'Conference Room B',
          category: 'Meeting',
          creatorId: 'sys',
          coverImage: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=400',
          isPromoted: true,
          promotionBudget: 500,
          interestedUserIds: [],
          followers: []
        },
        {
          id: '2',
          title: 'Tech Webinar 2026',
          date: new Date(Date.now() + 86400000 * 2), // 2 days later
          time: '3:00 PM',
          location: 'Online / Zoom',
          category: 'Webinar',
          creatorId: 'sys',
          coverImage: 'https://images.unsplash.com/photo-1591115765373-520b7a21769b?auto=format&fit=crop&q=80&w=400',
          isPromoted: false,
          promotionBudget: 0,
          interestedUserIds: [],
          followers: []
        }
      ];
      this.save();
    }
  }

  private save() {
    localStorage.setItem('imchat_events', JSON.stringify(this.events));
    this.notify();
  }

  getEvents() {
    return [...this.events].sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      return a.date.getTime() - b.date.getTime();
    });
  }

  addEvent(evt: Omit<Event, 'id' | 'interestedUserIds' | 'followers' | 'isPromoted' | 'promotionBudget'> & Partial<Event>) {
    const newEvent: Event = {
      ...evt,
      id: Math.random().toString(36).substring(2, 11),
      interestedUserIds: evt.interestedUserIds || [],
      followers: evt.followers || [],
      isPromoted: !!evt.isPromoted,
      promotionBudget: evt.promotionBudget || 0
    };
    this.events.push(newEvent);
    this.save();
    return newEvent;
  }

  toggleInterested(eventId: string, userId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    const ids = event.interestedUserIds || [];
    if (ids.includes(userId)) {
      event.interestedUserIds = ids.filter(id => id !== userId);
    } else {
      event.interestedUserIds = [...ids, userId];
    }
    this.save();
  }

  toggleFollow(eventId: string, userId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    const fols = event.followers || [];
    if (fols.includes(userId)) {
      event.followers = fols.filter(id => id !== userId);
    } else {
      event.followers = [...fols, userId];
    }
    this.save();
  }

  promoteEvent(eventId: string, cost: number) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;
    event.isPromoted = true;
    event.promotionBudget = (event.promotionBudget || 0) + cost;
    this.save();
    return true;
  }

  deleteEvent(id: string) {
    this.events = this.events.filter(e => e.id !== id);
    this.save();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l());
  }
}

export const EventStore = new EventStoreClass();
