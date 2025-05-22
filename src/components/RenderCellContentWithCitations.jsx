import React from 'react';

// Helper function to parse citations within a given text string
const parseCitations = (textToParse, docAnnotatedDetails, onOpenPdfViewer) => {
  if (!textToParse) return ['']; // Return array with empty string to avoid issues if textToParse is null/undefined
  if (!docAnnotatedDetails || !docAnnotatedDetails.original_files_manifest || !onOpenPdfViewer) {
    return [textToParse]; // Return plain text if details for citation mapping are missing
  }

  const citationRegex = /\[ref:P(\d+)S([A-Z])\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(textToParse)) !== null) {
    if (match.index > lastIndex) {
      parts.push(textToParse.substring(lastIndex, match.index));
    }

    const annotatedPageNum = parseInt(match[1], 10);
    const sectionLetter = match[2];
    let targetOriginalFilePath = '';
    let targetPageInOriginalFile = 0;
    let currentPageOffset = 0;

    for (const fileInManifest of docAnnotatedDetails.original_files_manifest) {
      if (annotatedPageNum <= currentPageOffset + fileInManifest.page_count) {
        targetOriginalFilePath = fileInManifest.path;
        targetPageInOriginalFile = annotatedPageNum - currentPageOffset;
        break;
      }
      currentPageOffset += fileInManifest.page_count;
    }

    if (targetOriginalFilePath && targetPageInOriginalFile > 0) {
      parts.push(
        <button
          key={`${match.index}-${annotatedPageNum}-${sectionLetter}`}
          onClick={() =>
            onOpenPdfViewer(
              targetOriginalFilePath,
              targetPageInOriginalFile,
              sectionLetter,
              docAnnotatedDetails.sections_per_page
            )
          }
          className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
          title={`View Page ${targetPageInOriginalFile} of ${targetOriginalFilePath.substring(targetOriginalFilePath.lastIndexOf('/') + 1)} (Annotated P${annotatedPageNum}S${sectionLetter})`}
        >
          {`[P${annotatedPageNum}S${sectionLetter}]`}
        </button>
      );
    } else {
      parts.push(match[0]); // If citation cannot be mapped, render it as text
    }
    lastIndex = citationRegex.lastIndex;
  }

  if (lastIndex < textToParse.length) {
    parts.push(textToParse.substring(lastIndex));
  }
  
  // If parts is empty (e.g. textToParse was empty string), return array with empty string
  return parts.length > 0 ? parts : ['']; 
};


const RenderCellContentWithCitations = ({
  text,
  docAnnotatedDetails, // Contains original_files_manifest, sections_per_page
  onOpenPdfViewer, // Function to call when a citation is clicked
  colFormat // e.g., "Bulleted list", "Text"
}) => {
  if (!text) {
    return null;
  }

  // If it's not a bulleted list or if details for citation mapping are missing,
  // revert to parsing the whole text block at once (previous behavior, wrapped in a div).
  if (colFormat !== "Bulleted list" || !docAnnotatedDetails || !docAnnotatedDetails.original_files_manifest || !onOpenPdfViewer) {
    return (
      <div>
        {parseCitations(text, docAnnotatedDetails, onOpenPdfViewer).map((part, index) => (
          <React.Fragment key={index}>{part}</React.Fragment>
        ))}
      </div>
    );
  }

  // Line-by-line processing for "Bulleted list" format
  const elements = [];
  let inList = false;
  let currentListItems = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trimStart(); // Keep trailing spaces for content, trim leading for bullet check
    const bulletMatch = trimmedLine.match(/^([*-•])\s*(.*)/); // Support *, -, •

    if (bulletMatch) {
      const listItemContent = bulletMatch[2];
      const processedListItemContent = parseCitations(listItemContent, docAnnotatedDetails, onOpenPdfViewer);
      
      if (!inList) {
        inList = true;
        currentListItems = []; // Start a new list
      }
      currentListItems.push(<li key={lineIndex}>{processedListItemContent.map((part, partIndex) => <React.Fragment key={partIndex}>{part}</React.Fragment>)}</li>);
    } else { // Not a bullet point
      if (inList) { // End of the current list
        elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside pl-1 space-y-0.5">{currentListItems}</ul>);
        inList = false;
        currentListItems = [];
      }
      // Handle non-list lines (including empty lines which will result in an empty div or just parsed content)
      // If line is empty after trimming, it might represent a paragraph break or just empty space.
      // For simplicity, we process it. If parseCitations returns [''], the div will be empty.
      if (line.trim() !== '') { // Only create divs for non-empty lines
        const processedLineContent = parseCitations(line, docAnnotatedDetails, onOpenPdfViewer);
        elements.push(<div key={lineIndex}>{processedLineContent.map((part, partIndex) => <React.Fragment key={partIndex}>{part}</React.Fragment>)}</div>);
      } else if (elements.length > 0 && ! (elements[elements.length-1].type === 'ul' && lines[lineIndex-1]?.trim().match(/^([*-•])\s*(.*)/)) ) {
        // Add a visual break for empty lines if they are not immediately after a list or another break.
        // This prevents multiple <br> for consecutive empty lines.
        // This is a simple heuristic and might need refinement.
        // Or, simply let empty lines result in empty <div> which might be fine.
        // For now, let's create a div for a non-empty line, and effectively ignore purely empty lines if they aren't list terminators.
      }
    }
  });

  // After the loop, if still in a list, add the final list
  if (inList) {
    elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside pl-1 space-y-0.5">{currentListItems}</ul>);
  }

  return <>{elements.map((element, index) => <React.Fragment key={`elem-${index}`}>{element}</React.Fragment>)}</>;
};

export default RenderCellContentWithCitations;
