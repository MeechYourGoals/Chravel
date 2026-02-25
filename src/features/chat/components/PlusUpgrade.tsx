import React from 'react';
import { Crown, Sparkles, Send, MessageCircle } from 'lucide-react';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { useTripVariant } from '@/contexts/TripVariantContext';

export const PlusUpgrade = () => {
  const { upgradeToPlus } = useConsumerSubscription();
  const { accentColors } = useTripVariant();

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden relative">
      {/* Blurred Preview Content */}
      <div className="p-6 filter blur-sm opacity-60">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Concierge</h3>
          </div>
        </div>

        {/* Mock conversation preview */}
        <div className="space-y-4 mb-6">
          <div className="bg-gray-800 rounded-2xl p-4 max-w-xs">
            <p className="text-gray-300 text-sm">Find vegetarian restaurants near our Airbnb</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-4 ml-8">
            <p className="text-gray-300 text-sm">
              Here are 3 sushi spots near your Basecamp ranked by reviews...
            </p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 max-w-xs">
            <p className="text-gray-300 text-sm">Suggest nightlife spots within walking distance</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-4 ml-8">
            <p className="text-gray-300 text-sm">
              Looks like your group prefers day adventures. Want to add this kayaking trip?
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Ask me anything about travel..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
            disabled
          />
          <button className="bg-blue-600 p-3 rounded-xl" disabled>
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div
            className={`w-16 h-16 bg-gradient-to-r ${accentColors.gradient} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            <Crown size={32} className="text-white" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-3">
            ✨ Unlock Smart Trip Planning with Plus
          </h3>
          <p className="text-gray-300 mb-6">
            Your personal AI travel assistant is ready to build the perfect trip.
          </p>

          <div className="space-y-2 text-left mb-8">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">✅</span> AI Chatbot
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">✅</span> Smart suggestions based on your Basecamp
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">✅</span> Tailored recs using group preferences
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">✅</span> Real-time help planning food, activities,
              and more
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
            <p className="text-white font-semibold">$9.99/month – Start your free trial today</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={upgradeToPlus}
              className={`w-full bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white font-bold py-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg text-lg`}
            >
              🔓 Unlock with Plus
            </button>
            <button className="text-gray-400 hover:text-white text-sm">No thanks</button>
          </div>
        </div>
      </div>
    </div>
  );
};
