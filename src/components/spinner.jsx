// src/components/Spinner.jsx
import React from 'react';

const Spinner = ({ size = "h-4 w-4", additionalClasses = "" }) => (
  <div
    className={`inline-block ${size} animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${additionalClasses}`}
    role="status"
  />
);

export default Spinner;