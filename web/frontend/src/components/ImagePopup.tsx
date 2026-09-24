import React from 'react';

interface ImagePopupProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImagePopup: React.FC<ImagePopupProps> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close image"
        >
          <span className="text-white text-2xl font-bold">×</span>
        </button>

        {/* Image */}
        <img
          src={imageUrl}
          alt="Uploaded image"
          className="block mx-auto my-auto max-w-[90vw] max-h-[80vh] rounded-lg border border-zinc-800/20 light:border-slate-200/20 shadow-xl"
        />
      </div>
    </div>
  );
};