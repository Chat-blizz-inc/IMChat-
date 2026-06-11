import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Search, Users, Shield, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FAQS = [
  {
    question: "How do I create a new event?",
    answer: "You can create an event by tapping the '+' icon in the Event Calendar top right corner, or by clicking the 'Add Event' button right here on the FAQ page!"
  },
  {
    question: "Can I upload a cover image for my event?",
    answer: "Yes! When creating or editing an event, you'll see a 'Cover Image' section where you can upload a photo to make your event stand out."
  },
  {
    question: "What categories are available for events?",
    answer: "We support Birthday, Entertainment, Catering, Meeting, Music, House Party, Tour, Sports, School Event, and Webinar categories."
  },
  {
    question: "Is there aLimit on the number of events I can create?",
    answer: "Currently, you can create up to 100 events in your personal calendar. Events are stored locally on your device."
  },
  {
    question: "How can I share an event with friends?",
    answer: "Each event has a 'Share' icon. Tapping it will open your device's native share menu or copy a link to your clipboard."
  }
];

export default function FAQPage({ onBack }: { onBack: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'account' | 'privacy' | 'safety'>('all');

  const filteredFaqs = FAQS.filter(f => 
    (f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle },
    { id: 'account', label: 'Account', icon: Users },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'safety', label: 'Safety', icon: Bell }
  ];

  return (
    <div className="absolute inset-0 z-[60] bg-[#f0f2f5] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-[#1c1e21]" />
        </button>
        <h1 className="text-[20px] font-bold text-[#1c1e21]">Help Center</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Facebook Style Search Header */}
        <div className="bg-gradient-to-b from-brand-blue to-brand-blue/90 px-6 py-12 text-center">
          <h2 className="text-white text-2xl font-bold mb-6">How can we help you?</h2>
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search help articles..."
              className="w-full bg-white border-none rounded-full pl-12 pr-4 py-4 text-[16px] shadow-lg outline-none focus:ring-2 focus:ring-white/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-brand-blue text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-200'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 px-2">Popular Questions</h3>
              {filteredFaqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <button 
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <span className="font-bold text-[#1c1e21] text-[15px]">{faq.question}</span>
                    {openIndex === idx ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  
                  <AnimatePresence>
                    {openIndex === idx && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-4 text-[14px] text-gray-600 leading-relaxed border-t border-gray-50 pt-3"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Account Settings</h3>
                <ul className="space-y-3">
                  {['Login & Password', 'Account Security', 'Personal Information', 'Deactivation'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-brand-blue font-bold hover:underline cursor-pointer">
                      <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Privacy & Safety</h3>
                <ul className="space-y-3">
                  {['Blocking Users', 'Profile Visibility', 'Reporting Content', 'Two-Factor Auth'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-brand-blue font-bold hover:underline cursor-pointer">
                      <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
