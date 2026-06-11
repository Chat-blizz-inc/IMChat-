import React from 'react';

export const SelfieIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiZZkjmk2k7pGxW_JY8wN8gXIjR4rR59FanGR5nu5Dz9C380bHkTCmxy6xYb802A9K4umeuNc5UUqcBDDN4Y2-KnTNfwT1TfkV4wqxhb3bYYRf4OJfJg02mj08TuHEyCnqp3gbRlqqCdukPxy09gQauA3NRbmsq4_oMTTzzaJEHiRUnV7jji9ZamIjWSK4/s1600/taking-a-selfie-1.png" 
    alt="Take a Selfie" 
    className={`${className} object-contain`}
    referrerPolicy="no-referrer"
  />
);

export default SelfieIcon;
