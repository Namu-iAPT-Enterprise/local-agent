import React from 'react';
import { Wrench } from 'lucide-react';

export default function Tools() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
      <Wrench size={40} strokeWidth={1.2} />
      <p className="text-sm">No tools configured</p>
    </div>
  );
}
