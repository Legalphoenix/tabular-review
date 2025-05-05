// src/components/DocumentUploader.jsx
import React, { forwardRef, useCallback } from 'react';

// This component handles the hidden file input logic
const DocumentUploader = forwardRef(({ onDocumentsUploaded, multiple = true, accept = "application/pdf", id = "doc-upload-hidden" }, ref) => {

  const handleChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []).filter(
        (f) => f.type === accept // Use accept prop
      );
      // Create document objects including the File object
      const docs = files.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        file: f, // Keep the file object
        appendices: [] // Initialize appendices array
      }));
      if (docs.length) onDocumentsUploaded(docs);
      e.target.value = null; // Reset input
    },
    [onDocumentsUploaded, accept]
  );

  return (
    <input
      ref={ref}
      id={id} // Allow custom ID for multiple uploaders
      type="file"
      multiple={multiple}
      accept={accept}
      onChange={handleChange}
      className="hidden" // Keep it hidden
    />
  );
});

export default DocumentUploader;