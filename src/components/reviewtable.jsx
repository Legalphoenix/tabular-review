// src/components/ReviewTable.jsx
import React, { useState, useEffect, useRef } from "react"; // Removed useCallback as it wasn't used here
import Spinner from "./Spinner";
import {
    IoTrashOutline, IoPencil, IoPlay, IoReload,
    IoDocumentAttachOutline, IoChevronForward, IoFileTrayFullOutline,
    IoAddOutline, IoEllipsisVertical, IoPinOutline, IoCheckmarkDoneOutline,
    IoCloseCircleOutline, IoArrowDownOutline, IoArrowUpOutline, IoFilterOutline
} from 'react-icons/io5';

const renderBulletedList = (text) => {
    if (!text) return null;
    const lines = text.split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                      .map(line => line.replace(/^[\*\-\•]\s*/, ''));
    if (lines.length === 0) return <span className="text-gray-400 italic">Empty list</span>;
    return (
        <ul className="list-disc list-inside pl-1 space-y-1">
            {lines.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
};

const EditableCellContent = ({ initialValue, onSave, format }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            const len = inputRef.current.value.length;
            inputRef.current.setSelectionRange(len, len);
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleChange = (e) => {
        setValue(e.target.value);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (value !== initialValue) {
            onSave(value);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            inputRef.current.blur();
        } else if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="absolute inset-0 w-full h-full p-2 text-sm border-2 border-indigo-500 rounded-md resize-none focus:outline-none z-10 bg-white shadow-md"
                rows={Math.max(3, (value?.split('\n').length || 1) + 1 )}
            />
        );
    }
    
    const displayContent = () => {
        if (!value && value !== 0) return <span className="text-gray-400 italic">-</span>; // Handle empty, null, undefined but allow 0
        if (format === 'Bulleted list') return renderBulletedList(value);
        return value;
    };

    return (
         <div onDoubleClick={handleDoubleClick} className="block w-full h-full cursor-text min-h-[2.5em] whitespace-pre-wrap break-words p-3">
            {displayContent()}
        </div>
    )
};


const ColumnHeaderMenu = ({ column, onEditColumn, onDeleteColumn }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleDelete = () => {
         if (window.confirm(`Are you sure you want to delete the column "${column.label}"? This action cannot be undone.`)) {
            onDeleteColumn(column.id);
         }
         setIsOpen(false);
    }

    const handleEdit = () => {
        onEditColumn(column);
        setIsOpen(false);
    }

    const handleNotImplemented = (feature) => {
        alert(`${feature} feature not implemented.`);
        setIsOpen(false);
    }

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="ml-1 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none"
                title="Column options"
            >
                <IoEllipsisVertical size={16} />
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <button onClick={handleEdit} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                            <IoPencil size={16} className="mr-3 text-gray-500"/> Edit column
                        </button>
                        <button onClick={() => handleNotImplemented('Pin')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                           <IoPinOutline size={16} className="mr-3 text-gray-500"/> Pin column
                        </button>
                         <div className="border-t border-gray-100 my-1"></div>
                         <button onClick={() => handleNotImplemented('Mark reviewed')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                           <IoCheckmarkDoneOutline size={16} className="mr-3 text-gray-500"/> Mark all as reviewed
                        </button>
                         <button onClick={() => handleNotImplemented('Mark unreviewed')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                           <IoCloseCircleOutline size={16} className="mr-3 text-gray-500"/> Mark all as unreviewed
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={handleDelete} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800" role="menuitem">
                            <IoTrashOutline size={16} className="mr-3 text-red-500"/> Delete column
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                         <button onClick={() => handleNotImplemented('Sort A-Z')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                           <IoArrowDownOutline size={16} className="mr-3 text-gray-500"/> Sort A-Z
                        </button>
                         <button onClick={() => handleNotImplemented('Sort Z-A')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                           <IoArrowUpOutline size={16} className="mr-3 text-gray-500"/> Sort Z-A
                        </button>
                         <button onClick={() => handleNotImplemented('Filter')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                           <IoFilterOutline size={16} className="mr-3 text-gray-500"/> Filter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const ReviewTable = ({
  documents,
  columns,
  tableData,
  onRunCell,
  onRemoveDocument,
  onEditColumn,
  onRemoveColumn,
  onAddAppendixClick,
  onRemoveAppendix,
  onAddDocumentClick,
  onAddColumnClick,
  onCellContentSave,
}) => {
  const getCellStatus = (docId, colId) => tableData?.[docId]?.[colId]?.status || "idle";
  const getCellAnswer = (docId, colId) => tableData?.[docId]?.[colId]?.answer || "";

  const showEmptyStateMessage = documents.length === 0 && columns.length === 0;

  return (
    <div className="shadow-sm rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col flex-grow">
      <div className="overflow-x-auto flex-grow relative"> {/* Ensure this container can grow */}
        {showEmptyStateMessage && (
            <div className="absolute inset-0 flex items-center justify-center z-0">
                <p className="text-center py-10 text-gray-500 italic">
                    No documents or columns yet. <br/>Click "Add documents" or "Add columns" to get started.
                </p>
            </div>
        )}
        <table className="min-w-full divide-y divide-gray-200 border-collapse"> {/* Removed table-fixed for now */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="sticky left-0 bg-gray-50 px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-20 w-[280px] min-w-[200px] max-w-[400px]"> {/* Slightly wider doc column */}
                Document
              </th>
              {columns.map((col) => (
                <th key={col.id} scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[250px]"> {/* Let content push width */}
                  <div className="flex items-center justify-between group">
                    <span className="truncate font-medium" title={col.label}>{col.label}</span>
                    <ColumnHeaderMenu
                        column={col}
                        onEditColumn={onEditColumn}
                        onDeleteColumn={onRemoveColumn}
                    />
                  </div>
                </th>
              ))}
               <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[150px] w-[150px]">
                  <button onClick={onAddColumnClick} className="flex items-center text-gray-500 hover:text-indigo-600 w-full">
                     <IoAddOutline className="mr-1"/> Add column
                  </button>
               </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Render add document row even if documents array is empty, but not if empty state message is shown */}
            {(!showEmptyStateMessage || documents.length > 0) && documents.map((doc, docIndex) => (
              <React.Fragment key={doc.id}>
                <tr className="hover:bg-gray-50/50 transition-colors duration-150 group">
                  <td className="sticky left-0 bg-white group-hover:bg-gray-50/50 px-3 py-2.5 text-sm font-medium text-gray-800 border-r border-gray-200 z-10 align-top w-[280px] min-w-[200px] max-w-[400px]">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xs text-gray-400 mr-1.5">{docIndex + 1}.</span>
                            <span className="truncate" title={doc.name}>{doc.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2">
                            <button
                            onClick={() => onAddAppendixClick(doc.id)}
                            className="text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-gray-100"
                            title="Add appendix document"
                            aria-label={`Add appendix to ${doc.name}`}
                            >
                            <IoDocumentAttachOutline size={16} />
                            </button>
                            <button
                            onClick={() => onRemoveDocument(doc.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                            title={`Remove ${doc.name} and its appendices`}
                            aria-label={`Remove ${doc.name}`}
                            >
                            <IoTrashOutline size={16} />
                            </button>
                        </div>
                    </div>
                    {doc.appendices && doc.appendices.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1 pl-5">
                        {doc.appendices.length} appendix{doc.appendices.length > 1 ? 'es' : ''}
                      </div>
                    )}
                  </td>
                  {columns.map((col) => {
                    const status = getCellStatus(doc.id, col.id);
                    const answer = getCellAnswer(doc.id, col.id);
                    const isLoading = status === "loading";
                    const isError = status === "error";
                    const isManual = col.format === 'Manual input';

                    return (
                      <td key={`${doc.id}-${col.id}`} className="text-sm text-gray-700 relative border-r border-gray-200 min-w-[250px] align-top group"> {/* Removed px-0 py-0, EditableCellContent has p-3 */}
                        <div className="max-h-60 overflow-y-auto min-h-[3.5em] pb-7 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded"> {/* Wrapper for scroll, EditableCell has padding */}
                          {isLoading && <div className="flex items-center text-gray-500 p-3"><Spinner size="h-4 w-4" additionalClasses="mr-2"/> Processing...</div>}
                          {isError && <span className="text-red-500 text-xs italic p-3 block">Error: {answer || 'Failed'}</span>}
                          {!isLoading && !isError &&
                              <EditableCellContent
                                initialValue={answer}
                                onSave={(newValue) => onCellContentSave(doc.id, col.id, newValue)}
                                format={col.format}
                              />
                          }
                        </div>
                        {!isManual && (
                          <button
                            onClick={() => !isLoading && onRunCell(doc.id, col.id)}
                            disabled={isLoading}
                            className={`absolute bottom-1.5 right-1.5 p-1 rounded ${
                              isLoading ? 'text-gray-400 cursor-not-allowed' :
                              isError ? 'text-orange-500 hover:bg-orange-100' :
                              'text-indigo-500 hover:bg-indigo-100'
                            } opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150`}
                            title={isLoading ? "Processing..." : isError ? "Retry Review" : "Run Review"}
                          >
                            {isLoading ? <Spinner size="h-4 w-4" /> : isError ? <IoReload size={16}/> : <IoPlay size={16} />}
                          </button>
                        )}
                      </td>
                    );
                  })}
                   <td className="px-3 py-2.5 border-r border-gray-200 min-w-[150px] w-[150px] align-top"></td>
                </tr>
                 {doc.appendices?.map((appendix) => (
                    <tr key={appendix.id} className="bg-gray-50 hover:bg-gray-100/80 transition-colors duration-150 group">
                        <td className="sticky left-0 bg-gray-50 group-hover:bg-gray-100/80 px-3 py-1.5 text-sm text-gray-600 border-r border-gray-200 z-10 align-top w-[280px] min-w-[200px] max-w-[400px]">
                            <div className="flex items-center justify-between pl-4">
                                <div className="flex items-center truncate">
                                    <IoChevronForward size={12} className="mr-1 text-gray-400 flex-shrink-0"/>
                                    <IoFileTrayFullOutline size={14} className="mr-1.5 text-gray-400 flex-shrink-0"/>
                                    <span className="truncate" title={appendix.name}>{appendix.name}</span>
                                </div>
                                <button
                                    onClick={() => onRemoveAppendix(doc.id, appendix.id)}
                                    className="ml-2 text-gray-400 hover:text-red-600 p-1 rounded hover:bg-white flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={`Remove appendix ${appendix.name}`}
                                >
                                    <IoTrashOutline size={15} />
                                </button>
                            </div>
                        </td>
                        {columns.map(col => (
                            <td key={`${appendix.id}-${col.id}`} className="px-3 py-1.5 text-sm text-gray-400 italic border-r border-gray-200 min-w-[250px] align-top">
                                -
                            </td>
                         ))}
                         <td className="px-3 py-1.5 border-r border-gray-200 min-w-[150px] w-[150px] align-top"></td>
                    </tr>
                ))}
              </React.Fragment>
            ))}

             {/* "Add document" row - always show if not in complete empty state */}
             {!showEmptyStateMessage && (
             <tr>
                <td className="sticky left-0 bg-white px-3 py-2.5 text-sm font-medium border-r border-gray-200 z-10 w-[280px] min-w-[200px] max-w-[400px] align-top">
                    <button onClick={onAddDocumentClick} className="flex items-center text-gray-500 hover:text-indigo-600 w-full">
                       <IoAddOutline className="mr-1"/> Add document
                    </button>
                </td>
                 {columns.map(col => (
                    <td key={`placeholder-doc-${col.id}`} className="px-3 py-2.5 border-r border-gray-200 min-w-[250px] align-top"></td>
                 ))}
                  <td className="px-3 py-2.5 border-r border-gray-200 min-w-[150px] w-[150px] align-top"></td>
             </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewTable;