import React from 'react';
import { IoDocumentsOutline, IoAddCircleOutline, IoPlayCircleOutline, IoDownloadOutline } from 'react-icons/io5';

const ActionBar = ({
  onAddDocumentClick,
  onAddColumnClick,
  onRunAllClick,
  onExportClick,
  canRunOrExport // Boolean to disable buttons if no docs/cols
}) => {
  const buttonClass = "flex items-center px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";
  const primaryButtonClass = "flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";

  return (
    <div className="mb-6 p-3 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-between sticky top-0 z-20"> {/* Sticky bar */}
      {/* Left side actions */}
      <div className="flex items-center space-x-3">
         <h2 className="text-lg font-semibold text-gray-800 mr-4">Tabular Review</h2> {/* Example Title */}
         <button onClick={onAddDocumentClick} className={buttonClass}>
           <IoDocumentsOutline className="mr-1.5" size={18}/> Add Documents
         </button>
         <button onClick={onAddColumnClick} className={buttonClass}>
            <IoAddCircleOutline className="mr-1.5" size={18}/> Add Column
         </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3">
        <button onClick={onExportClick} className={buttonClass} disabled={!canRunOrExport}>
            <IoDownloadOutline className="mr-1.5" size={18}/> Export
        </button>
        <button onClick={onRunAllClick} className={primaryButtonClass} disabled={!canRunOrExport}>
            <IoPlayCircleOutline className="mr-1.5" size={18}/> Run all
        </button>
      </div>
    </div>
  );
};

export default ActionBar;