import React from 'react';

const templates = [
  { id: 'reminder', text: 'Reminder: ' },
  { id: 'update', text: 'Quick update: ' },
  { id: 'announcement', text: 'Announcement: ' },
];

export const TemplateLibrary = ({ onSelect }: { onSelect: (text: string) => void }) => (
  <div className="space-y-2">
    {templates.map(t => (
      <button
        key={t.id}
        onClick={() => onSelect(t.text)}
        className="block bg-slate-700 text-white px-3 py-1 rounded w-full text-left"
      >
        {t.text}
      </button>
    ))}
  </div>
);
