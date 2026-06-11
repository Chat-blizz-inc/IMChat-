import React from 'react';
import { ArrowLeft, Crown, Check, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface Membership {
  id: string;
  name: string;
  price: string;
  color: string;
  icon: any;
  features: string[];
  recommended?: boolean;
}

const memberships: Membership[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: 'Free',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Check,
    features: [
      'Access to standard chat',
      'Joining public communities',
      'Standard video quality',
      'Basic AI assistance'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99/mo',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Zap,
    features: [
      'HD video generation',
      'Unlimited group creation',
      'Advanced AI assistant',
      'No advertisements',
      'Custom profile themes'
    ],
    recommended: true
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '$24.99/mo',
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    icon: Crown,
    features: [
      '4K Cinematic Veo generation',
      'Verified Gold Badge',
      'Professional networking tools',
      'Priority customer support',
      'Early access to new features',
      'Featured in "Rising Stars"'
    ]
  }
];

export default function MembershipPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-brand-blue p-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={onBack} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-xl">Membership</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-12">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-black text-gray-900 mt-4">Upgrade Your Experience</h2>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Choose the perfect plan to unlock the full potential of IMChat.
          </p>
        </div>

        <div className="space-y-6 max-w-sm mx-auto">
          {memberships.map((m, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={m.id}
              className={`bg-white rounded-3xl p-6 border-2 relative overflow-hidden transition-all hover:shadow-xl ${
                m.recommended ? 'border-brand-blue shadow-lg scale-[1.02]' : 'border-gray-100 shadow-sm'
              }`}
            >
              {m.recommended && (
                <div className="absolute top-0 right-0 bg-brand-blue text-white text-[10px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-widest">
                  Recommended
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${m.color}`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{m.name}</h3>
                  <p className="text-brand-blue font-black">{m.price}</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {m.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                  m.recommended
                    ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20 hover:brightness-110'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {m.id === 'standard' ? 'Current Plan' : `Get ${m.name}`}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
