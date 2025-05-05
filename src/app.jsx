// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import DocumentUploader from './components/DocumentUploader';
import ColumnEditorModal from './components/ColumnEditorModal';
import ReviewTable from './components/ReviewTable';
import ActionBar from './components/ActionBar';

const API_URL = 'http://localhost:5001/api/generate';

function App() {
  // State structure: [{ id, name, file, appendices: [{ id, name, file }] }]
  const [documents, setDocuments] = useState([]);
   // State structure: [{ id, label, prompt, format }]
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState({});
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnData, setEditingColumnData] = useState(null);

  const mainFileInputRef = useRef(null);
  const appendixFileInputRef = useRef(null);
  const [currentDocIdForAppendix, setCurrentDocIdForAppendix] = useState(null);

  // --- Document and Appendix Handlers (keep existing logic from previous step) ---
    const handleAddDocumentClick = () => {
        mainFileInputRef.current?.click();
    };
    const handleDocumentsUploaded = useCallback((newDocs) => {
        setDocuments((prev) => {
            const existingNames = new Set(prev.map(d => d.name));
            const uniqueNewDocs = newDocs.filter(nd => !existingNames.has(nd.name));
            return [...prev, ...uniqueNewDocs.filter(d => d && d.id && d.name && d.file)];
        });
        setTableData((prev) => {
            const data = { ...prev };
            newDocs.forEach((doc) => {
                if (!data[doc.id]) {
                    data[doc.id] = {};
                    columns.forEach((col) => {
                        data[doc.id][col.id] = { status: "idle", answer: "" };
                    });
                }
            });
            return data;
        });
    }, [columns]);
    const removeDoc = useCallback((idToRemove) => {
        setDocuments((p) => p.filter((d) => d.id !== idToRemove));
        setTableData((p) => {
            const data = { ...p };
            delete data[idToRemove];
            return data;
        });
    }, []);
    const handleAddAppendixClick = (mainDocId) => {
        setCurrentDocIdForAppendix(mainDocId);
        appendixFileInputRef.current?.click();
    };
    const handleAppendicesUploaded = useCallback((appendixDocs) => {
        if (!currentDocIdForAppendix || appendixDocs.length === 0) return;
        const targetDocId = currentDocIdForAppendix;
        setDocuments(prevDocs =>
            prevDocs.map(doc => {
                if (doc.id === targetDocId) {
                    const newAppendices = appendixDocs.map(apDoc => ({
                        id: apDoc.id,
                        name: apDoc.name,
                        file: apDoc.file,
                    }));
                    const existingAppendixNames = new Set(doc.appendices.map(a => a.name));
                    const uniqueNewAppendices = newAppendices.filter(na => !existingAppendixNames.has(na.name));
                    return { ...doc, appendices: [...doc.appendices, ...uniqueNewAppendices] };
                }
                return doc;
            })
        );
        setCurrentDocIdForAppendix(null);
    }, [currentDocIdForAppendix]);
    const handleRemoveAppendix = useCallback((mainDocId, appendixIdToRemove) => {
        setDocuments(prevDocs =>
            prevDocs.map(doc => {
                if (doc.id === mainDocId) {
                    return { ...doc, appendices: doc.appendices.filter(app => app.id !== appendixIdToRemove) };
                }
                return doc;
            })
        );
    }, []);

  // --- Column Handling (keep existing logic from previous step) ---
    const openColumnModalForNew = () => {
        setEditingColumnData(null);
        setIsColumnModalOpen(true);
    };
    const openColumnModalForEdit = (columnData) => {
        setEditingColumnData(columnData);
        setIsColumnModalOpen(true);
    };
    const handleSaveColumn = useCallback((columnData) => {
        const isEditing = columns.some(c => c.id === columnData.id);
        if (isEditing) {
            setColumns(prevCols => prevCols.map(col => col.id === columnData.id ? columnData : col));
            setTableData(prevData => {
                const newData = {...prevData};
                Object.keys(newData).forEach(docId => {
                    if (newData[docId][columnData.id]) {
                        newData[docId][columnData.id].status = 'idle';
                    }
                });
                return newData;
            });
        } else {
            setColumns(prevCols => [...prevCols, columnData]);
            setTableData(prevData => {
                const newData = { ...prevData };
                Object.keys(newData).forEach(docId => {
                    if (!newData[docId][columnData.id]) {
                        newData[docId][columnData.id] = { status: 'idle', answer: '' };
                    }
                });
                return newData;
            });
        }
        setIsColumnModalOpen(false);
    }, [columns]);


  // --- LLM Interaction (MODIFIED to use format) ---
  const runCell = useCallback(
    async (docId, colId) => {
      const doc = documents.find((d) => d.id === docId);
      const col = columns.find((c) => c.id === colId);

      // Skip if manual input or missing data
      if (!doc || !col || !doc.file || col.format === 'Manual input') {
          if (col && col.format === 'Manual input') {
              console.log(`Skipping run for Manual Input column: ${col.label}`);
                // Optionally set status to 'done' for manual if desired, or leave idle
                // setTableData((p) => ({ ...p, [docId]: { ...p[docId], [colId]: { status: 'done', answer: p[docId]?.[colId]?.answer || '' }}}));
          } else {
             console.error("Main document or column not found, or file missing:", docId, colId);
             setTableData((p) => ({ ...p, [docId]: { ...p[docId], [colId]: { status: "error", answer: "Missing document or column info" }}}));
          }
          return;
      }

      // Set loading state
      setTableData((p) => ({
        ...p,
        [docId]: {
          ...p[docId],
          [colId]: { status: "loading", answer: p[docId]?.[colId]?.answer || '' }
        }
      }));

      // --- Modify prompt based on format ---
      let finalPrompt = col.prompt;
      switch (col.format) {
        case 'Yes/No':
          finalPrompt += "\n\nAnswer only with 'Yes' or 'No'.";
          break;
        case 'Bulleted list':
          finalPrompt += "\n\nFormat the answer as a bulleted list (using '*' or '-' for each point).";
          break;
        case 'Date':
          finalPrompt += "\n\nExtract the date. If possible, format it as YYYY-MM-DD. If multiple dates are relevant, list them.";
          break;
        case 'Tag':
           finalPrompt += "\n\nIdentify the single most relevant tag or keyword for this based on the document context.";
           break;
        case 'Multiple tags':
           finalPrompt += "\n\nIdentify all relevant tags or keywords based on the document context, separated by commas.";
           break;
        case 'Verbatim':
           finalPrompt += "\n\nExtract the relevant text verbatim from the document exactly as it appears.";
           break;
        // Text format doesn't need specific modification unless desired
        case 'Text':
        default:
            // No specific instruction added for plain text
            break;
      }
      // -------------------------------------

      const form = new FormData();
      form.append("file", doc.file, doc.name);
      form.append("prompt", finalPrompt); // Send the potentially modified prompt

      try {
        const res = await fetch(API_URL, { method: "POST", body: form });
        if (!res.ok) {
             const errorData = await res.json().catch(() => ({ error: `HTTP error! status: ${res.status}` }));
             throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
         }
        const { answer } = await res.json();
        setTableData((p) => ({
          ...p,
          [docId]: { ...p[docId], [colId]: { status: "done", answer: answer || '' } }
        }));
      } catch (e) {
         console.error("API Error in runCell:", e);
        setTableData((p) => ({
          ...p,
          [docId]: { ...p[docId], [colId]: { status: "error", answer: String(e) } }
        }));
      }
    },
    [documents, columns] // Depend on documents and columns
  );

  // --- Run All / Export Handlers (keep existing logic) ---
    const runAll = useCallback(() => {
        console.log("Running all reviews...");
        documents.forEach((d) =>
            columns.forEach((c) => {
                if (c.format === 'Manual input') return; // Skip manual columns
                const st = tableData?.[d.id]?.[c.id]?.status;
                if (st === "idle" || st === "error") runCell(d.id, c.id);
            })
        );
    }, [documents, columns, tableData, runCell]);

    const exportCSV = useCallback(() => {
        if (!documents.length || !columns.length) return;
        const headers = ["Document (Appendices)", ...columns.map((c) => c.label)].join(",");
        const rows = documents.map((d) => {
            let docNameWithAppendices = d.name;
            if (d.appendices && d.appendices.length > 0) {
                docNameWithAppendices += ` (+${d.appendices.length} appx: ${d.appendices.map(a => a.name).join(', ')})`;
            }
            const escapedDocName = /[,"\n]/.test(docNameWithAppendices) ? `"${docNameWithAppendices.replace(/"/g, '""')}"` : docNameWithAppendices;
            return [
                escapedDocName,
                ...columns.map((c) => {
                    const ans = tableData?.[d.id]?.[c.id]?.answer || "";
                    const escapedAns = ans.replace(/"/g, '""');
                    return /[,"\n]/.test(ans) ? `"${escapedAns}"` : ans;
                })
            ].join(",");
        });
        const csvContent = [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "tabular_review_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }, [documents, columns, tableData]);

  // Effect to initialize table data
  useEffect(() => {
    setTableData((prevData) => {
      const data = { ...prevData };
      documents.forEach((doc) => {
        if (!data[doc.id]) data[doc.id] = {};
        columns.forEach((c) => {
          if (!data[doc.id][c.id]) {
            data[doc.id][c.id] = { status: "idle", answer: "" };
          }
        });
      });
      return data;
    });
  }, [documents, columns]);

  const canRunOrExport = documents.length > 0 && columns.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ActionBar
        onAddDocumentClick={handleAddDocumentClick}
        onAddColumnClick={openColumnModalForNew}
        onRunAllClick={runAll}
        onExportClick={exportCSV}
        canRunOrExport={canRunOrExport}
      />
      <DocumentUploader
         ref={mainFileInputRef}
         onDocumentsUploaded={handleDocumentsUploaded}
         id="main-doc-uploader"
      />
      <DocumentUploader
          ref={appendixFileInputRef}
          onDocumentsUploaded={handleAppendicesUploaded}
          id="appendix-doc-uploader"
          multiple={true}
      />
      <main className="flex-grow p-4 md:p-6 overflow-y-auto">
        <ColumnEditorModal
          isOpen={isColumnModalOpen}
          onClose={() => setIsColumnModalOpen(false)}
          onSave={handleSaveColumn}
          initialData={editingColumnData}
        />
        <ReviewTable
          documents={documents}
          columns={columns}
          tableData={tableData}
          onRunCell={runCell}
          onRemoveDocument={removeDoc}
          onEditColumn={openColumnModalForEdit}
          onAddAppendixClick={handleAddAppendixClick}
          onRemoveAppendix={handleRemoveAppendix}
        />
      </main>
    </div>
  );
}

export default App;