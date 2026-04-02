import React, { useState, useRef } from 'react';
import { Plus, ChevronUp, Check, X, Upload } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

import wp1 from '../../assets/wallpapers/1.png';
import wp2 from '../../assets/wallpapers/2.png';
import wp3 from '../../assets/wallpapers/3.png';
import wp4 from '../../assets/wallpapers/4.png';
import wp5 from '../../assets/wallpapers/5.png';
import wp6 from '../../assets/wallpapers/6.png';
import wp7 from '../../assets/wallpapers/7.png';
import wp8 from '../../assets/wallpapers/8.png';
import wp9 from '../../assets/wallpapers/9.png';
import wp10 from '../../assets/wallpapers/10.png';

const wallpapers = [
  { id: 'wp1', label: 'Wallpaper 1', url: wp1 },
  { id: 'wp2', label: 'Wallpaper 2', url: wp2 },
  { id: 'wp3', label: 'Wallpaper 3', url: wp3 },
  { id: 'wp4', label: 'Wallpaper 4', url: wp4 },
  { id: 'wp5', label: 'Wallpaper 5', url: wp5 },
  { id: 'wp6', label: 'Wallpaper 6', url: wp6 },
  { id: 'wp7', label: 'Wallpaper 7', url: wp7 },
  { id: 'wp8', label: 'Wallpaper 8', url: wp8 },
  { id: 'wp9', label: 'Wallpaper 9', url: wp9 },
  { id: 'wp10', label: 'Wallpaper 10', url: wp10 },
];

function WallpaperCard({
  id, label, url, selected, onSelect, onRemove,
}: {
  id: string; label: string; url: string; selected: boolean;
  onSelect: () => void; onRemove?: () => void;
}) {
  return (
    <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${selected ? 'border-blue-500' : 'border-transparent hover:border-gray-300'}`}>
      {/* Full card click area */}
      <button onClick={onSelect} className="w-full h-24 block relative">
        <img src={url} alt={label} className="w-full h-full object-cover" />
        {/* Label */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 pointer-events-none">
          <span className="text-white text-[10px] font-medium leading-tight line-clamp-1">{label}</span>
        </div>
        {/* Checkmark */}
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center pointer-events-none">
            <Check size={11} className="text-white" />
          </div>
        )}
      </button>
      {/* Remove button (only for uploaded) */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center transition-colors"
        >
          <X size={10} className="text-white" />
        </button>
      )}
    </div>
  );
}

export default function Display() {
  const { theme, setTheme, setBgImage, selectedWallpaperId, setSelectedWallpaperId } = useTheme();
  const [scale, setScale] = useState(100);
  const [wallpaperOpen, setWallpaperOpen] = useState(true);
  const [uploadedOpen, setUploadedOpen] = useState(true);
  const [customWallpapers, setCustomWallpapers] = useState<{ id: string; label: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedWallpaperId;

  const select = (id: string, url: string) => {
    setSelectedWallpaperId(id);
    setBgImage(url);
  };

  const deselect = () => {
    setSelectedWallpaperId(null);
    setBgImage(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const id = `custom-${Date.now()}-${Math.random()}`;
      const label = file.name.replace(/\.[^/.]+$/, '');
      setCustomWallpapers((prev) => [...prev, { id, label, url }]);
      select(id, url);
    });
    e.target.value = '';
  };

  const removeCustom = (id: string) => {
    setCustomWallpapers((prev) => {
      const item = prev.find((w) => w.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((w) => w.id !== id);
    });
    if (selected === id) deselect();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Theme */}
      <div className="flex flex-col gap-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 rounded-xl overflow-hidden border-2 transition-all ${theme === 'light' ? 'border-blue-500' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            <div className="bg-white p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-gray-200" />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="h-1.5 bg-gray-300 rounded w-3/4" />
                  <div className="h-1.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-gray-100 rounded-lg border border-gray-200" />
              <div className="flex gap-1">
                <div className="h-6 flex-1 bg-gray-100 rounded" />
                <div className="h-6 flex-1 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="bg-gray-100 px-3 py-1.5 text-center text-xs font-medium text-gray-600">Light</div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 rounded-xl overflow-hidden border-2 transition-all ${theme === 'dark' ? 'border-blue-500' : 'border-transparent hover:border-gray-600 dark:hover:border-gray-500'}`}
          >
            <div className="bg-gray-950 p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-gray-700" />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="h-1.5 bg-gray-600 rounded w-3/4" />
                  <div className="h-1.5 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-gray-900 rounded-lg border border-gray-700" />
              <div className="flex gap-1">
                <div className="h-6 flex-1 bg-gray-800 rounded" />
                <div className="h-6 flex-1 bg-gray-700 rounded" />
              </div>
            </div>
            <div className="bg-gray-900 px-3 py-1.5 text-center text-xs font-medium text-gray-400">Dark</div>
          </button>
        </div>
      </div>

      {/* Scale */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700 dark:text-gray-300 w-12">Scale</span>
        <span className="text-xs text-gray-400">-</span>
        <input
          type="range" min={50} max={150} value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="flex-1 accent-gray-800"
        />
        <span className="text-xs text-gray-400">+</span>
        <span className="text-sm text-gray-600 dark:text-gray-400 w-10 text-right">{scale}%</span>
        <button onClick={() => setScale(100)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap">
          Reset zoom
        </button>
      </div>

      {/* Wallpapers section */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setWallpaperOpen(!wallpaperOpen)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <ChevronUp size={14} className={`transition-transform ${wallpaperOpen ? '' : 'rotate-180'}`} />
          Wallpapers
          {selected && wallpapers.some((w) => w.id === selected) && (
            <button onClick={(e) => { e.stopPropagation(); deselect(); }} className="ml-auto text-xs text-gray-400 hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
        </button>

        {wallpaperOpen && (
          <div className="grid grid-cols-4 gap-3">
            {wallpapers.map((w) => (
              <WallpaperCard
                key={w.id}
                {...w}
                selected={selected === w.id}
                onSelect={() => selected === w.id ? deselect() : select(w.id, w.url)}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Uploaded Wallpapers section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setUploadedOpen(!uploadedOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <ChevronUp size={14} className={`transition-transform ${uploadedOpen ? '' : 'rotate-180'}`} />
            User Uploaded Wallpapers
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload size={12} /> Upload
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </div>

        {uploadedOpen && (
          customWallpapers.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
            >
              <Upload size={20} />
              <span className="text-xs">Click to upload images</span>
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {customWallpapers.map((w) => (
                <WallpaperCard
                  key={w.id}
                  {...w}
                  selected={selected === w.id}
                  onSelect={() => selected === w.id ? deselect() : select(w.id, w.url)}
                  onRemove={() => removeCustom(w.id)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
