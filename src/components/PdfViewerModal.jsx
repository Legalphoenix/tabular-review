import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { PDFViewer, PDFLinkService, EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set the worker path for PDF.js using Vite's ?url import
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString(); // Old method
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const PdfViewerModal = ({
  isOpen,
  onClose,
  filePath,
  pageNumber, // 1-based
  sectionLetter,
  sectionsPerPage
}) => {
  const viewerContainerRef = useRef(null);
  const pdfViewerRef = useRef(null);
  const pdfDocRef = useRef(null); // To store the PDFDocumentProxy for cleanup & page dimension access

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewerReady, setViewerReady] = useState(false); // For triggering navigation

  // Effect for initializing and cleaning up the PDF viewer
  useEffect(() => {
    if (!isOpen || !filePath) {
      // Cleanup existing viewer and document if modal is closed or path is missing
      if (pdfViewerRef.current) {
        pdfViewerRef.current.cleanup();
        pdfViewerRef.current.setDocument(null);
        // pdfViewerRef.current = null; // Handled by subsequent setDocument(null) and cleanup
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(err => console.error("Error destroying PDF doc:", err));
        pdfDocRef.current = null;
      }
      setViewerReady(false);
      setError(null);
      setIsLoading(false); // Reset loading state
      return;
    }

    // Ensure viewer container is available
    if (!viewerContainerRef.current) {
        console.error("Viewer container ref not available yet.");
        return;
    }
    
    // Clear previous state
    setIsLoading(true);
    setError(null);
    setViewerReady(false);
    
    // If a viewer instance exists, clean it up before creating a new one
    if (pdfViewerRef.current) {
        pdfViewerRef.current.cleanup();
        pdfViewerRef.current.setDocument(null);
    }
    if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(err => console.error("Error destroying previous PDF doc:", err));
        pdfDocRef.current = null;
    }


    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });

    const newPdfViewer = new PDFViewer({
      container: viewerContainerRef.current,
      eventBus: eventBus,
      linkService: linkService,
      removePageBorders: true,
      // textLayerMode: 2, // Enable text selection
      // annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS, // Enable forms
    });
    pdfViewerRef.current = newPdfViewer;
    linkService.setViewer(newPdfViewer);

    const loadingTask = pdfjsLib.getDocument(filePath);
    loadingTask.promise
      .then(pdfDocument => {
        pdfDocRef.current = pdfDocument; // Store for cleanup and access
        newPdfViewer.setDocument(pdfDocument);
        linkService.setDocument(pdfDocument, null);
        setIsLoading(false);
        setViewerReady(true); // Indicate viewer is ready for navigation
      })
      .catch(err => {
        console.error('Failed to load PDF:', err);
        setError(`Failed to load PDF: ${err.message}`);
        setIsLoading(false);
        if (pdfDocRef.current) { // Should be null here, but for safety
            pdfDocRef.current.destroy().catch(e => console.error("Error destroying PDF doc on load fail:", e));
            pdfDocRef.current = null;
        }
      });

    return () => {
      // Cleanup function when component unmounts or dependencies change
      // This is crucial to prevent memory leaks
      setIsLoading(false); // Ensure loading is false on cleanup
      setViewerReady(false);
      if (pdfViewerRef.current) {
        pdfViewerRef.current.cleanup();
        pdfViewerRef.current.setDocument(null); // Important to release document from viewer
        // pdfViewerRef.current = null; // Not strictly necessary to null out ref here
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(err => console.error("Error destroying PDF doc during cleanup:", err));
        pdfDocRef.current = null;
      }
    };
  }, [isOpen, filePath]); // Re-run if modal opens/closes or file path changes

  // Effect for scrolling to the specified page and section
  useEffect(() => {
    if (!viewerReady || !pdfViewerRef.current || !pdfDocRef.current || !pageNumber || !sectionLetter) {
      return;
    }
    
    const scrollToSection = async () => {
      try {
        if (pageNumber <= 0 || pageNumber > pdfDocRef.current.numPages) {
          console.error(`Invalid page number for scrolling: ${pageNumber}`);
          setError(`Cannot scroll to page ${pageNumber}: PDF has ${pdfDocRef.current.numPages} pages.`);
          return;
        }

        const pdfPage = await pdfDocRef.current.getPage(pageNumber);
        const pdfPointPageHeight = pdfPage.getViewport({ scale: 1.0 }).height;
        const sectionIndex = sectionLetter.charCodeAt(0) - 'A'.charCodeAt(0);

        if (sectionIndex < 0 || sectionIndex >= sectionsPerPage) {
          console.error(`Invalid section letter or index: ${sectionLetter} (index ${sectionIndex}) for ${sectionsPerPage} sections.`);
          // Scroll to top of page if section is invalid
           pdfViewerRef.current.scrollPageIntoView({ pageNumber, destArray: [null, { name: 'XYZ' }, 0, pdfPointPageHeight, null] });
          return;
        }
        
        // Y-coordinate for XYZ (distance from bottom-left page origin, to appear at viewer top)
        // This makes the top of the section align with the top of the viewer.
        const dest_y = pdfPointPageHeight * (1 - sectionIndex / sectionsPerPage);
        
        pdfViewerRef.current.scrollPageIntoView({
          pageNumber: pageNumber,
          destArray: [null, { name: 'XYZ' }, 0, dest_y, null], // X=0, Y=dest_y, Z=0 (no zoom change)
        });

      } catch (err) {
        console.error("Error scrolling to section:", err);
        setError(`Error scrolling to section: ${err.message}`);
      }
    };

    scrollToSection();

  }, [viewerReady, pageNumber, sectionLetter, sectionsPerPage]); // Depends on viewer and navigation props

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-xl w-full max-w-3xl xl:max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <h3 className="text-lg md:text-xl font-semibold truncate pr-2">
            PDF Viewer - {filePath ? filePath.substring(filePath.lastIndexOf('/') + 1) : ''}
            {pdfDocRef.current && pageNumber ? ` (Page ${pageNumber} of ${pdfDocRef.current.numPages})` : ''}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl md:text-3xl p-1 -m-1 leading-none"
            aria-label="Close PDF viewer"
          >
            &times;
          </button>
        </div>
        <div 
            ref={viewerContainerRef} 
            className="flex-grow overflow-auto border border-gray-300 bg-gray-50 relative" // relative for PDF.js UI elements
            style={{ minHeight: 'calc(90vh - 100px)' }} // Ensure substantial height
        >
          {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10"><div className="p-4 text-center text-gray-700">Loading PDF...</div></div>}
          {error && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10"><div className="p-4 text-center text-red-600">Error: {error}</div></div>}
          {/* The PDFViewer component will create its own internal structure including 'div.pdfViewer' */}
          <div className="pdfViewer"></div> {/* PDFViewer expects this div to exist inside the container */}
        </div>
      </div>
    </div>
  );
};

export default PdfViewerModal;
