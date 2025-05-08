// src/components/ActionBar.jsx
import React from 'react';
import {
    IoDocumentsOutline, IoAddCircleOutline, IoPlayCircleOutline, IoDownloadOutline,
    IoPencil
} from 'react-icons/io5'; // Removed unused icons

const ActionBar = ({
  reviewTitle,
  onReviewTitleChange,
  onAddDocumentClick,
  onAddColumnClick,
  onRunAllClick,
  onExportClick,
  canRunOrExport
}) => {
  const buttonClass = "flex items-center px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shadow-sm";
  const primaryButtonClass = "flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";
  const iconClass = "mr-1.5";

  return (
    <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Left side */}
      <div className="flex items-center space-x-3">
         <div className="group relative flex items-center">
             <input
                type="text"
                value={reviewTitle}
                onChange={onReviewTitleChange}
                className="text-lg font-semibold text-gray-800 border-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-0.5 bg-transparent hover:bg-gray-100 w-auto min-w-[150px]"
                placeholder="Untitled Review"
             />
             <IoPencil size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>
         </div>
         <div className="h-5 w-px bg-gray-300"></div>
         <button onClick={onAddDocumentClick} className={buttonClass}>
           <IoDocumentsOutline className={iconClass} size={18}/> Add documents
         </button>
         <button onClick={onAddColumnClick} className={buttonClass}>
            <IoAddCircleOutline className={iconClass} size={18}/> Add columns
         </button>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">
        {/* Removed Language, Templates, Uploads, Share */}
        <button onClick={onExportClick} className={buttonClass} disabled={!canRunOrExport}>
            <IoDownloadOutline className={iconClass} size={18}/> Export
        </button>
        <button onClick={onRunAllClick} className={primaryButtonClass} disabled={!canRunOrExport}>
            <IoPlayCircleOutline className={iconClass} size={18}/> Run all
        </button>
      </div>
    </div>
  );
};

export default ActionBar;