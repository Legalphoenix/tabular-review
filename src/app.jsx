// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import DocumentUploader from './components/DocumentUploader';
import ColumnEditorPopover from './components/ColumnEditorPopover';
import ReviewTable from './components/ReviewTable';
import ActionBar from './components/ActionBar';

// Ensure API URLs are correct
const API_URL = 'http://localhost:5001/api/generate'; // For cell generation
const PROMPT_GENERATION_API_URL = 'http://localhost:5001/api/generate_prompt'; // For AI prompt generation

function App() {
  // === State ===
  const [documents, setDocuments] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState({});
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false);
  const [editingColumnData, setEditingColumnData] = useState(null);
  const [reviewTitle, setReviewTitle] = useState("Untitled Review");
  const [currentDocIdForAppendix, setCurrentDocIdForAppendix] = useState(null);

  // === Refs ===
  const mainFileInputRef = useRef(null);
  const appendixFileInputRef = useRef(null);

  // === Handlers ===

  const handleReviewTitleChange = (event) => {
    setReviewTitle(event.target.value);
  };

  const handleAddDocumentClick = () => {
    mainFileInputRef.current?.click();
  };

  const handleDocumentsUploaded = useCallback((newDocs) => {
    setDocuments((prev) => {
      const existingNames = new Set(prev.map(d => d.name));
      const uniqueNewDocs = newDocs.filter(nd => nd?.id && nd?.name && nd?.file && !existingNames.has(nd.name));
      if (uniqueNewDocs.length === 0 && newDocs.length > 0) {
         alert("Some or all selected documents already exist (based on name).");
      }
      return [...prev, ...uniqueNewDocs];
    });
  }, []);

  const removeDoc = useCallback((idToRemove) => {
     const docToRemove = documents.find(d => d.id === idToRemove);
     if (window.confirm(`Are you sure you want to remove "${docToRemove?.name}" and all its data?`)) {
        setDocuments((p) => p.filter((d) => d.id !== idToRemove));
     }
  }, [documents]);

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
          const currentAppendices = doc.appendices || [];
          const existingAppendixNames = new Set(currentAppendices.map(a => a.name));
          const newAppendices = appendixDocs
             .filter(apDoc => apDoc?.id && apDoc?.name && apDoc?.file)
             .map(apDoc => ({ id: apDoc.id, name: apDoc.name, file: apDoc.file }))
             .filter(na => !existingAppendixNames.has(na.name));
           if (newAppendices.length === 0 && appendixDocs.length > 0) {
                alert("Some or all selected appendices already exist for this document (based on name).");
           }
          return { ...doc, appendices: [...currentAppendices, ...newAppendices] };
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
           const appendixToRemove = (doc.appendices || []).find(app => app.id === appendixIdToRemove);
           if (appendixToRemove && window.confirm(`Remove appendix "${appendixToRemove.name}"?`)) {
                return { ...doc, appendices: (doc.appendices || []).filter(app => app.id !== appendixIdToRemove) };
           }
        }
        return doc;
      })
    );
  }, []);

  const handleAddColumnClick = () => { openColumnModalForNew(); };

  const openColumnModalForNew = () => {
    setEditingColumnData(null);
    setIsColumnPopoverOpen(true);
  };

  const openColumnModalForEdit = (columnData) => {
    setEditingColumnData(columnData);
    setIsColumnPopoverOpen(true);
  };

  const handleSaveColumn = useCallback((columnData) => {
    let columnDefinitionChanged = false;
    const isEditing = columns.some(c => c.id === columnData.id);
    setColumns(prevCols => {
        if (isEditing) {
            const oldCol = prevCols.find(c => c.id === columnData.id);
            if (oldCol?.label !== columnData.label || oldCol?.prompt !== columnData.prompt || oldCol?.format !== columnData.format) {
                 columnDefinitionChanged = true;
            }
            return prevCols.map(col => col.id === columnData.id ? columnData : col);
        } else {
            columnDefinitionChanged = true;
            return [...prevCols, columnData];
        }
    });
    if (isEditing && columnDefinitionChanged) {
        setTableData(prevData => {
            const newData = { ...prevData };
            let cellsReset = false;
            Object.keys(newData).forEach(docId => {
                if (newData[docId] && newData[docId][columnData.id] && newData[docId][columnData.id].status !== 'idle') {
                    newData[docId] = { ...newData[docId], [columnData.id]: { ...newData[docId][columnData.id], status: 'idle' } };
                    cellsReset = true;
                }
            });
            return cellsReset ? newData : prevData;
        });
    }
    setIsColumnPopoverOpen(false);
  }, [columns]);

  const handleRemoveColumn = useCallback((idToDelete) => {
    setColumns(prevCols => prevCols.filter(col => col.id !== idToDelete));
  }, []);

  const handleCellContentSave = useCallback((docId, colId, newValue) => {
    setTableData(prevData => {
      const docRow = prevData[docId] || {};
      const currentCell = docRow[colId] || { status: 'idle' };
      if (currentCell.answer === newValue && currentCell.status === 'done') {
          return prevData;
      }
      return { ...prevData, [docId]: { ...docRow, [colId]: { ...currentCell, status: 'done', answer: newValue } } };
    });
  }, []);

  const runCell = useCallback(
    async (docId, colId) => {
      const doc = documents.find((d) => d.id === docId);
      const col = columns.find((c) => c.id === colId);
      if (!doc || !col || !doc.file || col.format === 'Manual input') {
        if (col?.format === 'Manual input') { console.log(`Skipping Manual Input: ${col.label}`); }
        else {
          console.error("Cannot run review: Missing document, column, or file.", { docId, colId });
          setTableData((p) => ({ ...p, [docId]: { ...(p[docId] || {}), [colId]: { status: "error", answer: "Missing doc/col info" }}}));
        }
        return;
      }
      setTableData((p) => ({ ...p, [docId]: { ...(p[docId] || {}), [colId]: { ...((p[docId] || {})[colId] || {}), status: "loading" }}}));
      let finalPrompt = col.prompt;
      switch (col.format) {
        case 'Yes/No': finalPrompt += "\n\nAnswer only with 'Yes' or 'No'."; break;
        case 'Bulleted list': finalPrompt += "\n\nFormat the answer as a bulleted list (using '*' or '-' for each point)."; break;
        case 'Date': finalPrompt += "\n\nExtract the date. If possible, format it as YYYY-MM-DD. If multiple dates are relevant, list them."; break;
        // ... (other cases)
      }
      const form = new FormData();
      form.append("file", doc.file, doc.name);
      form.append("prompt", finalPrompt);
      try {
        const res = await fetch(API_URL, { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed with status ${res.status}`);
        setTableData((p) => ({ ...p, [docId]: { ...(p[docId] || {}), [colId]: { status: "done", answer: data.answer || '' }}}));
      } catch (e) {
        console.error("API Error during runCell:", e);
        setTableData((p) => ({ ...p, [docId]: { ...(p[docId] || {}), [colId]: { status: "error", answer: String(e.message || "Request failed") }}}));
      }
    },
    [documents, columns]
  );

  const runAll = useCallback(() => {
    let cellsToRun = 0;
    documents.forEach((d) =>
      columns.forEach((c) => {
        if (c.format === 'Manual input') return;
        const st = tableData?.[d.id]?.[c.id]?.status;
        if (st === "idle" || st === "error") { runCell(d.id, c.id); cellsToRun++; }
      })
    );
    if (cellsToRun === 0) { alert("No cells needed processing."); }
  }, [documents, columns, tableData, runCell]);

  const exportCSV = useCallback(() => {
    // ... (exportCSV logic remains the same)
    if (!documents.length || !columns.length) { alert("No data to export."); return; }
    const headers = ["Document (Appendices)", ...columns.map((c) => c.label)].join(",");
    const rows = documents.map((d) => {
      let docNameWithAppendices = d.name;
      if (d.appendices?.length > 0) { docNameWithAppendices += ` (+${d.appendices.length} appx: ${d.appendices.map(a => a.name).join(', ')})`; }
      const escapedDocName = /[,"\n]/.test(docNameWithAppendices) ? `"${docNameWithAppendices.replace(/"/g, '""')}"` : docNameWithAppendices;
      const cells = columns.map((c) => {
        const ans = tableData?.[d.id]?.[c.id]?.answer || "";
        const escapedAns = ans.replace(/"/g, '""');
        return /[,"\n]/.test(ans) ? `"${escapedAns}"` : ans;
      });
      return [escapedDocName, ...cells].join(",");
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
    } else {
      alert("CSV export failed (browser compatibility issue).");
    }
  }, [documents, columns, tableData]);

  useEffect(() => {
    setTableData(currentTableData => {
      const newTableData = {};
      let hasChanged = false;
      documents.forEach(doc => {
        newTableData[doc.id] = {};
        columns.forEach(col => {
          const existingCellData = currentTableData[doc.id]?.[col.id];
          if (existingCellData) { newTableData[doc.id][col.id] = existingCellData; }
          else { newTableData[doc.id][col.id] = { status: "idle", answer: "" }; hasChanged = true; }
        });
      });
      const oldDocKeysLength = Object.keys(currentTableData).length;
      const newDocKeysLength = Object.keys(newTableData).length;
      if (oldDocKeysLength !== newDocKeysLength) { hasChanged = true; }
      else {
        for (const docId of Object.keys(newTableData)) {
          const oldColKeysLength = Object.keys(currentTableData[docId] || {}).length;
          const newColKeysLength = Object.keys(newTableData[docId]).length;
          if (oldColKeysLength !== newColKeysLength) { hasChanged = true; break; }
        }
      }
      return hasChanged ? newTableData : currentTableData;
    });
  }, [documents, columns]);

  const canRunOrExport = documents.length > 0 && columns.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <ActionBar
        reviewTitle={reviewTitle}
        onReviewTitleChange={handleReviewTitleChange}
        onAddDocumentClick={handleAddDocumentClick}
        onAddColumnClick={openColumnModalForNew}
        onRunAllClick={runAll}
        onExportClick={exportCSV}
        canRunOrExport={canRunOrExport}
      />
      <DocumentUploader ref={mainFileInputRef} onDocumentsUploaded={handleDocumentsUploaded} id="main-doc-uploader"/>
      <DocumentUploader ref={appendixFileInputRef} onDocumentsUploaded={handleAppendicesUploaded} id="appendix-doc-uploader" multiple={true}/>

      <main className="flex-grow p-4 md:p-6 overflow-auto flex flex-col"> {/* Added flex flex-col to main */}
        <ColumnEditorPopover
          isOpen={isColumnPopoverOpen}
          onClose={() => setIsColumnPopoverOpen(false)}
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
          onRemoveColumn={handleRemoveColumn}
          onAddAppendixClick={handleAddAppendixClick}
          onRemoveAppendix={handleRemoveAppendix}
          onAddDocumentClick={handleAddDocumentClick}
          onAddColumnClick={openColumnModalForNew}
          onCellContentSave={handleCellContentSave}
        />
      </main>
    </div>
  );
}

export default App;