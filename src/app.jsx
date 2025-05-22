// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import DocumentUploader from './components/DocumentUploader';
import ColumnEditorPopover from './components/ColumnEditorPopover';
import ReviewTable from './components/ReviewTable';
import ActionBar from './components/ActionBar';
import PdfViewerModal from './components/PdfViewerModal';

// Ensure API URLs are correct
const API_URL = 'http://localhost:5001/api/generate'; // For cell generation
const PROMPT_GENERATION_API_URL = 'http://localhost:5001/api/generate_prompt'; // For AI prompt generation
const PREPROCESS_API_URL = 'http://localhost:5001/api/preprocess_pdf'; // For preprocessing PDFs

function App() {
  // === State ===
  // New document state structure:
  // {
  //   id: "unique_react_key",
  //   user_given_name: "original_filename.pdf",
  //   main_pdf_file: File,
  //   appendix_pdf_files: [], // Array of File objects
  //   is_processing: false,
  //   processing_error: null,
  //   annotated_doc_details: null // Populated by /api/preprocess_pdf response
  // }
  const [documents, setDocuments] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState({});
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false);
  const [editingColumnData, setEditingColumnData] = useState(null);
  const [reviewTitle, setReviewTitle] = useState("Untitled Review");
  const [currentDocIdForAppendix, setCurrentDocIdForAppendix] = useState(null);
  const [pdfViewerModalProps, setPdfViewerModalProps] = useState({
    isOpen: false,
    filePath: '',
    pageNumber: 1,
    sectionLetter: 'A',
    sectionsPerPage: 10, // Default, will be overridden by doc-specific value
    // originalFilesManifest is not stored here, but passed to handler that needs it
  });

  // === Refs ===
  const mainFileInputRef = useRef(null);
  const appendixFileInputRef = useRef(null);

  // === Handlers ===

  const handleReviewTitleChange = (event) => {
    setReviewTitle(event.target.value);
  };

  const handleOpenPdfViewer = useCallback((targetFilePath, targetPageNumber, targetSectionLetter, docSectionsPerPage) => {
    setPdfViewerModalProps({
      isOpen: true,
      filePath: targetFilePath,
      pageNumber: targetPageNumber,
      sectionLetter: targetSectionLetter,
      sectionsPerPage: docSectionsPerPage || 10,
    });
  }, []);

  const handleClosePdfViewer = useCallback(() => {
    setPdfViewerModalProps(prev => ({ ...prev, isOpen: false, filePath: '' })); // Clear filePath on close
  }, []);

  const handleAddDocumentClick = () => {
    mainFileInputRef.current?.click();
  };

  const triggerPreprocess = useCallback(async (docIdToUpdate, mainPdfFile, appendixPdfFilesArray) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc =>
        doc.id === docIdToUpdate ? { ...doc, is_processing: true, processing_error: null } : doc
      )
    );

    const formData = new FormData();
    formData.append('main_pdf', mainPdfFile, mainPdfFile.name);
    (appendixPdfFilesArray || []).forEach((file) => {
      formData.append('appendix_pdfs', file, file.name);
    });

    try {
      const response = await fetch(PREPROCESS_API_URL, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Preprocessing failed with status ' + response.status }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.id === docIdToUpdate ? { ...doc, is_processing: false, annotated_doc_details: result } : doc
        )
      );
    } catch (error) {
      console.error('Preprocessing error:', error);
      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.id === docIdToUpdate ? { ...doc, is_processing: false, processing_error: error.message } : doc
        )
      );
    }
  }, []);

  const handleDocumentsUploaded = useCallback((newDocs) => { // newDocs from DocumentUploader are {id, name, file}
    const docsToAdd = [];
    const existingNames = new Set(documents.map(d => d.user_given_name));

    newDocs.forEach(doc => {
      if (existingNames.has(doc.name)) {
        alert(`Document with name "${doc.name}" already exists.`);
        return;
      }
      if (!doc.id || !doc.name || !doc.file) return;

      const newDocEntry = {
        id: doc.id, // Use ID from DocumentUploader
        user_given_name: doc.name,
        main_pdf_file: doc.file,
        appendix_pdf_files: [], // Initially no appendices
        is_processing: false,
        processing_error: null,
        annotated_doc_details: null
      };
      docsToAdd.push(newDocEntry);
    });

    if (docsToAdd.length > 0) {
      setDocuments(prev => [...prev, ...docsToAdd]);
      docsToAdd.forEach(docEntry => {
        triggerPreprocess(docEntry.id, docEntry.main_pdf_file, docEntry.appendix_pdf_files);
      });
    }
  }, [documents, triggerPreprocess]);

  const removeDoc = useCallback((idToRemove) => {
     const docToRemove = documents.find(d => d.id === idToRemove);
     if (window.confirm(`Are you sure you want to remove "${docToRemove?.user_given_name}" and all its data?`)) {
        // Future: Call /api/cleanup_processing_job/<processing_id> if docToRemove.annotated_doc_details?.processing_id exists
        setDocuments((p) => p.filter((d) => d.id !== idToRemove));
        // Also clear related tableData if necessary, though useEffect should handle this
     }
  }, [documents]);

  const handleAddAppendixClick = (mainDocId) => {
    setCurrentDocIdForAppendix(mainDocId);
    appendixFileInputRef.current?.click();
  };

  const handleAppendicesUploaded = useCallback((appendixFiles) => { // appendixFiles are {id, name, file} from DocumentUploader
    if (!currentDocIdForAppendix || appendixFiles.length === 0) return;
    const targetDocId = currentDocIdForAppendix;

    let updatedDocForPreprocessing = null;

    setDocuments(prevDocs => {
      const newDocs = prevDocs.map(doc => {
        if (doc.id === targetDocId) {
          const existingAppendixNames = new Set(doc.appendix_pdf_files.map(f => f.name));
          const uniqueNewAppendixFiles = appendixFiles
            .filter(apFile => apFile?.file && !existingAppendixNames.has(apFile.name))
            .map(apFile => apFile.file);

          if (uniqueNewAppendixFiles.length === 0 && appendixFiles.length > 0) {
            alert("Some or all selected appendices already exist for this document (based on name).");
          }
          
          if (uniqueNewAppendixFiles.length > 0) {
            const updatedEntry = {
              ...doc,
              appendix_pdf_files: [...doc.appendix_pdf_files, ...uniqueNewAppendixFiles]
            };
            updatedDocForPreprocessing = updatedEntry;
            return updatedEntry;
          }
        }
        return doc;
      });
      return newDocs;
    });
    
    if (updatedDocForPreprocessing) {
        triggerPreprocess(
            updatedDocForPreprocessing.id, 
            updatedDocForPreprocessing.main_pdf_file, 
            updatedDocForPreprocessing.appendix_pdf_files
        );
    }
    setCurrentDocIdForAppendix(null);
  }, [currentDocIdForAppendix, triggerPreprocess]);

  const handleRemoveAppendix = useCallback((mainDocId, appendixFileToRemove) => { // appendixFileToRemove is a File object
    let updatedDocForPreprocessing = null;
    setDocuments(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === mainDocId) {
          if (window.confirm(`Remove appendix "${appendixFileToRemove.name}"?`)) {
            const newAppendixFiles = doc.appendix_pdf_files.filter(
              appFile => appFile.name !== appendixFileToRemove.name || appFile.size !== appendixFileToRemove.size // Basic check
            );
            updatedDocForPreprocessing = { ...doc, appendix_pdf_files: newAppendixFiles };
            return updatedDocForPreprocessing;
          }
        }
        return doc;
      })
    );

    if (updatedDocForPreprocessing) {
      triggerPreprocess(
        updatedDocForPreprocessing.id,
        updatedDocForPreprocessing.main_pdf_file,
        updatedDocForPreprocessing.appendix_pdf_files
      );
    }
  }, [triggerPreprocess]);

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

      if (!doc || !col || col.format === 'Manual input') {
        if (col?.format === 'Manual input') { console.log(`Skipping Manual Input: ${col.label}`); }
        else { console.error("Cannot run review: Missing document or column.", { docId, colId }); }
        return;
      }

      if (doc.is_processing) {
        alert("Document is still processing. Please wait.");
        return;
      }
      if (doc.processing_error) {
        alert(`Cannot run cell: Document preprocessing failed: ${doc.processing_error}`);
        setTableData((p) => ({ ...p, [docId]: { ...(p[docId] || {}), [colId]: { status: "error", answer: `Preprocessing failed: ${doc.processing_error}` }}}));
        return;
      }
      if (!doc.annotated_doc_details?.annotated_pdf_path) {
        alert("Annotated document path not available. Preprocessing might not have completed successfully.");
        setTableData((p) => ({ ...p, [docId]: { ...(p[docId] || {}), [colId]: { status: "error", answer: "Annotated PDF not ready" }}}));
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

      // Append citation instruction
      finalPrompt += "\n\nWhen referencing information from the document, you MUST use the format [ref:P<page_number>S<section_letter>]. For example, if the information is on Page 7 in Section D, cite it as [ref:P7SD]. The document pages are labeled 'Page X' and sections are labeled 'Section A', 'Section B', etc. Ensure you use this exact format for all references.";
      
      const form = new FormData();
      form.append("annotated_pdf_path", doc.annotated_doc_details.annotated_pdf_path);
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
      let docNameWithAppendices = d.user_given_name;
      // Display appendix file names from appendix_pdf_files
      if (d.appendix_pdf_files?.length > 0) { 
        docNameWithAppendices += ` (+${d.appendix_pdf_files.length} appx: ${d.appendix_pdf_files.map(f => f.name).join(', ')})`; 
      }
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
          onOpenPdfViewer={handleOpenPdfViewer} 
        />
      </main>
      <PdfViewerModal {...pdfViewerModalProps} onClose={handleClosePdfViewer} />
    </div>
  );
}

export default App;