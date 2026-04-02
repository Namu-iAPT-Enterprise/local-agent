import React from 'react';
import { Bot } from 'lucide-react';

export default function Agents() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
      <Bot size={40} strokeWidth={1.2} />
      <p className="text-sm">No agents configured</p>
    </div>
  );
}
