// src/components/ColumnEditorPopover.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Spinner from './Spinner'; // Import Spinner
import {
    IoTextOutline, IoListOutline, IoToggleOutline, IoCalendarClearOutline,
    IoPricetagOutline, IoPricetagsOutline, IoDocumentTextOutline, IoCreateOutline,
    IoInformationCircleOutline, IoSparklesOutline, IoChevronDown, IoCheckmark
} from 'react-icons/io5';

const PROMPT_GENERATION_API_URL = 'http://localhost:5001/api/generate_prompt';

const formatOptions = [
    { value: 'Text', label: 'Text', icon: <IoTextOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Bulleted list', label: 'Bulleted list', icon: <IoListOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Yes/No', label: 'Yes/No', icon: <IoToggleOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Date', label: 'Date', icon: <IoCalendarClearOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Tag', label: 'Tag', icon: <IoPricetagOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Multiple tags', label: 'Multiple tags', icon: <IoPricetagsOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Verbatim', label: 'Verbatim', icon: <IoDocumentTextOutline className="mr-2 flex-shrink-0"/> },
    { value: 'Manual input', label: 'Manual input', icon: <IoCreateOutline className="mr-2 flex-shrink-0"/> },
];


const ColumnEditorPopover = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState(formatOptions[0].value);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptError, setPromptError] = useState('');
  const dropdownRef = useRef(null);

  const selectedOption = formatOptions.find(o => o.value === format) || formatOptions[0];

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setLabel(initialData.label);
        setPrompt(initialData.prompt);
        setFormat(initialData.format || formatOptions[0].value);
      } else {
        setLabel('');
        setPrompt('');
        setFormat(formatOptions[0].value);
      }
      setIsDropdownOpen(false);
      setIsGeneratingPrompt(false);
      setPromptError('');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSave = () => {
    if (!label.trim()) {
      alert("Label cannot be empty."); return;
    }
    if (format !== 'Manual input' && !prompt.trim()) {
      alert("Prompt cannot be empty unless Format is 'Manual input'."); return;
    }
    const columnData = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      label: label.trim(), prompt: prompt.trim(), format: format,
    };
    onSave(columnData);
    onClose();
  };

  const handleAiGeneratePrompt = async () => {
    if (!label.trim()) {
      alert("Please enter a Label first to generate a prompt.");
      return;
    }
    setIsGeneratingPrompt(true);
    setPromptError('');
    try {
        const response = await fetch(PROMPT_GENERATION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: label, format: format })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `HTTP error ${response.status}`);
        }
        if (data.suggested_prompt) {
            setPrompt(data.suggested_prompt);
        } else {
             throw new Error("API did not return a suggested prompt.");
        }
    } catch (error) {
        console.error("Failed to generate prompt:", error);
        setPromptError(`Failed: ${error.message}`);
    } finally {
        setIsGeneratingPrompt(false);
    }
  };

  const handleFormatSelect = (value) => {
    setFormat(value);
    setIsDropdownOpen(false);
    setPromptError('');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? `Edit: ${initialData.label}` : "Add New Column"} size="max-w-sm">
      <div className="p-1"> {/* Reduced padding inside modal content area if needed */}
        <div className="space-y-4">
          {/* Format Section */}
          <div>
            <label htmlFor="col-format-button-popover" className="block text-xs font-medium text-gray-500 mb-1">Format</label>
            <div className="relative" ref={dropdownRef}>
              <button id="col-format-button-popover" type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                <span className="flex items-center">{selectedOption.icon}<span className="ml-2 block truncate text-sm">{selectedOption.label}</span></span>
                <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2"><IoChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
              </button>
              {isDropdownOpen && (
                 <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {formatOptions.map((opt)=>(
                        <li
                            key={opt.value}
                            className={`relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-50 hover:text-indigo-900 ${format===opt.value?'bg-indigo-50 text-indigo-700':''}`}
                            id={`listbox-option-popover-${opt.value}`}
                            role="option"
                            aria-selected={format===opt.value}
                            onClick={()=>handleFormatSelect(opt.value)}
                        >
                            <div className="flex items-center text-sm">
                                {opt.icon}
                                <span className={`ml-2 block truncate ${format===opt.value?'font-semibold':'font-normal'}`}>{opt.label}</span>
                            </div>
                            {format===opt.value?(<span className={`absolute inset-y-0 right-0 flex items-center pr-4 ${format===opt.value?'text-indigo-600':'text-white'}`}><IoCheckmark className="h-5 w-5" aria-hidden="true"/></span>):null}
                        </li>
                    ))}
                 </ul>
               )}
            </div>
          </div>

          {/* Label Section */}
          <div>
            <label htmlFor="col-label-popover" className="flex items-center text-xs font-medium text-gray-500 mb-1">Label<span className="text-red-500 ml-0.5">*</span><span title="The header displayed in the table." className="ml-1 text-gray-400 cursor-help"><IoInformationCircleOutline/></span></label>
            <input id="col-label-popover" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Enter column header" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white"/>
          </div>

          {/* Prompt Section */}
          {format !== 'Manual input' && (
            <div>
              <label htmlFor="col-prompt-popover" className="flex items-center text-xs font-medium text-gray-500 mb-1">Prompt{format !== 'Manual input' && <span className="text-red-500 ml-0.5">*</span>}<span title="The specific question sent to the AI based on the document text." className="ml-1 text-gray-400 cursor-help"><IoInformationCircleOutline/></span></label>
              <textarea id="col-prompt-popover" rows="4" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter the question for the AI..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white resize-none"/>
               {promptError && <p className="text-xs text-red-500 mt-1">{promptError}</p>}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200"> {/* Increased border opacity */}
            {format !== 'Manual input' ? (
              <button
                type="button"
                onClick={handleAiGeneratePrompt}
                disabled={isGeneratingPrompt || !label.trim()}
                className="flex items-center px-3 py-1.5 bg-white text-indigo-600 text-sm rounded-md border border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title={!label.trim() ? "Enter a label first" : "Generate prompt suggestion"}
              >
                {isGeneratingPrompt ? <Spinner size="h-4 w-4" additionalClasses="mr-1.5"/> : <IoSparklesOutline className="mr-1.5" size={18}/>}
                 AI Generate
              </button>
            ) : <div />}

            <div className="flex justify-end space-x-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-200 text-sm font-medium">Cancel</button>
              <button type="button" onClick={handleSave} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 text-sm font-medium">{initialData ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ColumnEditorPopover;