import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Loader2, CheckCircle2, Ticket, LifeBuoy } from 'lucide-react';
import { supabase } from './lib/supabase';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'closed';
  created_at: string;
}

interface SupportSystemProps {
  onBack: () => void;
  userId: string;
  userEmail: string;
}

export default function SupportSystem({ onBack, userId, userEmail }: SupportSystemProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [userId]);

  const fetchTickets = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !supabase) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: userId,
            subject,
            description,
            status: 'open'
          }
        ]);

      if (error) throw error;

      setSubject('');
      setDescription('');
      setShowCreate(false);
      fetchTickets();
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="bg-white p-4 flex items-center justify-between border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
            <X className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-gray-900 tracking-tight">Support Center</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Powered by Supabase</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-brand-blue text-white p-2 rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
            <p className="text-sm font-medium text-gray-400">Loading your tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm flex flex-col items-center gap-4 mt-10">
            <div className="w-20 h-20 bg-blue-50 text-brand-blue rounded-full flex items-center justify-center">
              <LifeBuoy className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900">No active tickets</h3>
              <p className="text-sm text-gray-500">Have a problem? Create a support ticket and our team will help you shortly.</p>
            </div>
            <button 
              onClick={() => setShowCreate(true)}
              className="mt-2 bg-brand-blue text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition-all shadow-md"
            >
              Start New Ticket
            </button>
          </div>
        ) : (
          tickets.map(ticket => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={ticket.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  ticket.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {ticket.status}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
              <h4 className="font-bold text-gray-900">{ticket.subject}</h4>
              <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 w-full max-w-[500px] mx-auto bg-white rounded-t-[40px] z-[70] p-6 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">New Ticket</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-semibold outline-none focus:ring-2 focus:ring-brand-blue"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your problem in detail..."
                    rows={4}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 text-sm outline-none resize-none focus:ring-2 focus:ring-brand-blue"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <><Send className="w-5 h-5" /> Submit Ticket</>
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const Plus = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
