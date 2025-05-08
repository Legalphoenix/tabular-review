// src/components/Modal.jsx
import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = "max-w-md" }) => {
  if (!isOpen) return null;

  // Handle Escape key press to close modal
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${size} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing when clicking on modal content
      >
        <div className="flex justify-between items-center p-4 md:p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            aria-label="Close modal"
          >
            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="p-4 md:p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;