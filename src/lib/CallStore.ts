
export type CallType = 'audio' | 'video';
export type CallStatus = 'incoming' | 'outgoing' | 'missed' | 'rejected';

export interface CallLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: CallType;
  status: CallStatus;
  timestamp: Date;
  duration?: number; // in seconds
}

class CallStoreClass {
  private logs: CallLog[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const saved = localStorage.getItem('imchat_call_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      } catch (e) {
        console.error('Failed to parse call logs', e);
        this.logs = [];
      }
    } else {
      // Add some mock data for initial view
      this.logs = [
        {
          id: 'mock1',
          userId: 'sarah_id',
          userName: 'Sarah Connor',
          userAvatar: 'https://picsum.photos/seed/sarah/150/150',
          type: 'audio',
          status: 'missed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
        },
        {
          id: 'mock2',
          userId: 'john_id',
          userName: 'John Doe',
          userAvatar: 'https://picsum.photos/seed/john/150/150',
          type: 'video',
          status: 'incoming',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
          duration: 342
        },
        {
          id: 'mock3',
          userId: 'elena_id',
          userName: 'Elena',
          userAvatar: 'https://picsum.photos/seed/elena/150/150',
          type: 'audio',
          status: 'outgoing',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
          duration: 120
        }
      ];
      this.save();
    }
  }

  private save() {
    localStorage.setItem('imchat_call_logs', JSON.stringify(this.logs));
    this.notify();
  }

  getLogs() {
    return [...this.logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  addLog(log: Omit<CallLog, 'id' | 'timestamp'>) {
    const newLog: CallLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date(),
    };
    this.logs.unshift(newLog);
    // Keep only last 100 calls
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    this.save();
    return newLog;
  }

  clearLogs() {
    this.logs = [];
    this.save();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const CallStore = new CallStoreClass();
