import React from 'react';

export const AdminDashboard = () => {
  // TODO: Implement scheduled messages with unified messaging
  const scheduledMessages: any[] = [];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Scheduled Messages</h1>
      <ul className="space-y-2">
        {scheduledMessages.map(m => (
          <li key={m.id} className="border border-slate-700 rounded p-3">
            <p>{m.content}</p>
            <p className="text-xs text-slate-400">{new Date(m.sendAt).toLocaleString()}</p>
            <p className="text-xs">Priority: {m.priority}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
