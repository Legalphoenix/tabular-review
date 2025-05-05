// src/components/ReviewTable.jsx
import React from "react";
import Spinner from "./Spinner";
import {
    IoTrashOutline, IoPencil, IoPlay, IoReload,
    IoDocumentAttachOutline, IoChevronForward, IoFileTrayFullOutline
} from 'react-icons/io5';

// Helper to render bullet points
const renderBulletedList = (text) => {
    if (!text) return null;
    // Split by newline and filter out empty lines, trim whitespace, handle common bullet markers
    const lines = text.split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                      .map(line => line.replace(/^[\*\-\•]\s*/, '')); // Remove common bullet markers

    if (lines.length === 0) return <span className="text-gray-400 italic">Empty list</span>;

    return (
        <ul className="list-disc list-inside pl-1 space-y-1">
            {lines.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}


const ReviewTable = ({
  documents,
  columns,
  tableData,
  onRunCell,
  onRemoveDocument,
  onEditColumn,
  onAddAppendixClick,
  onRemoveAppendix,
}) => {
  const getCellStatus = (docId, colId) => tableData?.[docId]?.[colId]?.status || "idle";
  const getCellAnswer = (docId, colId) => tableData?.[docId]?.[colId]?.answer || "";

  return (
    <div className="shadow-sm rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="overflow-x-auto relative">
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-20 w-[250px] min-w-[200px] max-w-[350px]">
                Document
              </th>
              {columns.map((col) => (
                <th key={col.id} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[250px]">
                  <div className="flex items-center justify-between group">
                    <span className="truncate font-medium" title={col.label}>{col.label}</span>
                    <button
                      onClick={() => onEditColumn(col)}
                      className="ml-2 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      title={`Edit column: ${col.label}`}
                      aria-label={`Edit column: ${col.label}`}
                    >
                      <IoPencil size={14} />
                    </button>
                  </div>
                   {/* Optional: Display format subtly */}
                   {/* <div className="text-xs text-gray-400 font-normal normal-case">{col.format}</div> */}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-10 text-center text-sm text-gray-500 italic">
                  Click 'Add documents' above or drag & drop files here to begin.
                </td>
              </tr>
            )}
            {documents.map((doc, docIndex) => (
              <React.Fragment key={doc.id}>
                {/* Main Document Row */}
                <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="sticky left-0 bg-white hover:bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-800 border-r border-gray-200 z-10 align-top w-[250px] min-w-[200px] max-w-[350px]">
                    <span className="text-xs text-gray-400 mr-2">{docIndex + 1}</span>
                    <div className="inline-flex items-center justify-between w-[calc(100%-20px)]">
                      <span className="truncate" title={doc.name}>{doc.name}</span>
                      <div className="flex items-center space-x-1 flex-shrink-0">
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
                      <div className="text-xs text-gray-500 mt-1 pl-4">
                        {doc.appendices.length} appendix{doc.appendices.length > 1 ? 'es' : ''}
                      </div>
                    )}
                  </td>
                  {/* Data Cells for Main Document */}
                  {columns.map((col) => {
                    const status = getCellStatus(doc.id, col.id);
                    const answer = getCellAnswer(doc.id, col.id);
                    const isLoading = status === "loading";
                    const isError = status === "error";
                    const isDone = status === "done";
                    const hasAnswer = answer && answer.trim() !== '';
                    const isManual = col.format === 'Manual input';

                    return (
                      <td key={`${doc.id}-${col.id}`} className="px-4 py-3 text-sm text-gray-700 relative border-r border-gray-200 min-w-[250px] align-top group">
                        <div className="whitespace-pre-wrap break-words min-h-[3em] pb-6">
                           {/* --- Output Formatting --- */}
                            {isLoading && <div className="flex items-center text-gray-500"><Spinner size="h-4 w-4 mr-2"/> Processing...</div>}
                            {isError && <span className="text-red-500 text-xs italic">Error: {answer || 'Failed'}</span>}
                            {!isLoading && isDone && hasAnswer && col.format === 'Bulleted list' && renderBulletedList(answer)}
                            {!isLoading && isDone && hasAnswer && col.format !== 'Bulleted list' && <span className="text-gray-800">{answer}</span>}
                            {/* --- End Output Formatting --- */}
                            {!isLoading && isDone && !hasAnswer && <span className="text-gray-400 italic">No answer found</span>}
                            {!isLoading && !isError && status === 'idle' && <span className="text-gray-400 italic">-</span>}
                        </div>
                         {/* Hide button if Manual Input */}
                        {!isManual && (
                            <button
                                onClick={() => !isLoading && onRunCell(doc.id, col.id)}
                                disabled={isLoading}
                                className={`absolute bottom-2 right-2 p-1.5 rounded text-xs ${
                                    isLoading
                                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                    : isError
                                    ? 'text-orange-600 hover:bg-orange-100 opacity-0 group-hover:opacity-100'
                                    : 'text-indigo-600 hover:bg-indigo-100 opacity-0 group-hover:opacity-100'
                                } transition-opacity duration-150`}
                                title={isLoading ? "Processing..." : isError ? "Retry Review" : "Run Review"}
                                aria-label={isLoading ? "Processing cell" : isError ? `Retry review for ${doc.name} column ${col.label}` : `Run review for ${doc.name} column ${col.label}`}
                            >
                                {isLoading ? <Spinner size="h-4 w-4" /> : isError ? <IoReload size={16}/> : <IoPlay size={16} />}
                            </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
                 {/* Appendix Rows */}
                 {doc.appendices?.map((appendix) => (
                    <tr key={appendix.id} className="bg-gray-50 hover:bg-gray-100/80 transition-colors duration-150">
                        <td className="sticky left-0 bg-gray-50 hover:bg-gray-100/80 px-4 py-2 text-sm text-gray-600 border-r border-gray-200 z-10 align-top w-[250px] min-w-[200px] max-w-[350px]">
                            <div className="flex items-center justify-between pl-4">
                                <div className="flex items-center truncate">
                                    <IoChevronForward size={12} className="mr-1 text-gray-400 flex-shrink-0"/>
                                    <IoFileTrayFullOutline size={14} className="mr-1.5 text-gray-400 flex-shrink-0"/>
                                    <span className="truncate" title={appendix.name}>{appendix.name}</span>
                                </div>
                                <button
                                    onClick={() => onRemoveAppendix(doc.id, appendix.id)}
                                    className="ml-2 text-gray-400 hover:text-red-600 p-1 rounded hover:bg-white flex-shrink-0"
                                    title={`Remove appendix ${appendix.name}`}
                                    aria-label={`Remove appendix ${appendix.name}`}
                                >
                                    <IoTrashOutline size={15} />
                                </button>
                            </div>
                        </td>
                        {columns.map(col => (
                            <td key={`${appendix.id}-${col.id}`} className="px-4 py-2 text-sm text-gray-400 italic border-r border-gray-200 min-w-[250px] align-top">
                                -
                            </td>
                         ))}
                    </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewTable;