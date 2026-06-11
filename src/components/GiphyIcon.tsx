import React from 'react';

export const GiphyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="11" fill="black" />
    <path d="M17.5 7.5L15 5H9C7.89543 5 7 5.89543 7 7V17C7 18.1046 7.89543 19 9 19H17C18.1046 19 19 18.1046 19 17V9L17.5 7.5Z" fill="url(#giphy-gradient)" />
    <path d="M17.5 7.5H19L17.5 9V7.5Z" fill="#FF6666" />
    <defs>
      <linearGradient id="giphy-gradient" x1="7" y1="5" x2="19" y2="19" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFF35C" />
        <stop offset="0.33" stopColor="#00FF99" />
        <stop offset="0.66" stopColor="#00CCFF" />
        <stop offset="1" stopColor="#9933FF" />
      </linearGradient>
    </defs>
  </svg>
);

export default GiphyIcon;
