import React from 'react';

export const InviteInstructions = () => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <h4 className="text-white font-medium mb-1">How it works</h4>
      <ul className="text-gray-300 text-xs space-y-0.5">
        <li>• Share the link with friends you want to invite</li>
        <li>• They'll be able to join your trip instantly</li>
        <li>• Collaborators can chat, add places, and more</li>
      </ul>
    </div>
  );
};