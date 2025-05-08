// src/components/ColumnEditorModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import {
    IoTextOutline,
    IoListOutline,
    IoToggleOutline,
    IoCalendarClearOutline,
    IoPricetagOutline,
    IoPricetagsOutline,
    IoDocumentTextOutline,
    IoCreateOutline,
    IoInformationCircleOutline,
    IoSparklesOutline,
    IoChevronDown,
    IoCheckmark,
} from 'react-icons/io5';

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

const ColumnEditorModal = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState(formatOptions[0].value);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    }
  }, [isOpen, initialData]);

   useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  const handleSave = () => {
    if (!label.trim()) {
      alert("Label cannot be empty.");
      return;
    }
    if (format !== 'Manual input' && !prompt.trim()) {
      alert("Prompt cannot be empty unless Format is 'Manual input'.");
      return;
    }

    const columnData = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      label: label.trim(),
      prompt: prompt.trim(),
      format: format,
    };
    onSave(columnData);
    onClose();
  };

  const handleAiGeneratePrompt = () => {
    // This functionality is in ColumnEditorPopover, so this is a placeholder
    // or could be removed if this modal isn't intended to have it.
    alert("AI Prompt Generation feature is typically in the Popover variant for this app.");
  };

  const handleFormatSelect = (value) => {
      setFormat(value);
      setIsDropdownOpen(false);
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit Column: ${initialData.label}` : 'Add New Column'}
      size="max-w-xl" // Using the size prop
    >
      <div className="space-y-5 p-1"> {/* p-1 if modal itself has p-4/p-5 */}
        {/* Format Section - Custom Dropdown */}
        <div>
          <label htmlFor="col-format-button-modal" className="block text-sm font-medium text-gray-700 mb-1">
            Format
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              id="col-format-button-modal"
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <span className="flex items-center">
                 {selectedOption.icon}
                <span className="ml-2 block truncate">{selectedOption.label}</span>
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                 <IoChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </button>

            {isDropdownOpen && (
              <ul
                className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                tabIndex="-1"
                role="listbox"
                aria-labelledby="col-format-button-modal"
              >
                {formatOptions.map((opt) => (
                  <li
                    key={opt.value}
                    className={`relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white ${format === opt.value ? 'bg-indigo-50 text-indigo-800 font-semibold' : ''}`}
                    id={`listbox-option-modal-${opt.value}`}
                    role="option"
                    aria-selected={format === opt.value}
                    onClick={() => handleFormatSelect(opt.value)}
                  >
                    <div className="flex items-center">
                       {opt.icon}
                      <span className={`ml-2 block truncate ${format === opt.value ? 'font-semibold' : 'font-normal'}`}>
                        {opt.label}
                      </span>
                    </div>
                    {format === opt.value ? (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 group-hover:text-white"> {/* Ensure checkmark color contrasts on hover */}
                         <IoCheckmark className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Label Section */}
        <div>
          <label htmlFor="col-label-modal" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            Label
            <span className="text-red-500 ml-0.5">*</span>
            <span title="The header displayed in the table." className="ml-1 text-gray-400 cursor-help"><IoInformationCircleOutline/></span>
          </label>
          <input
            id="col-label-modal"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter column header"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white"
          />
        </div>

        {/* Prompt Section - Conditionally hidden for Manual Input */}
        {format !== 'Manual input' && (
          <div>
            <label htmlFor="col-prompt-modal" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              Prompt
              {format !== 'Manual input' && <span className="text-red-500 ml-0.5">*</span>}
              <span title="The specific question sent to the AI based on the document text." className="ml-1 text-gray-400 cursor-help"><IoInformationCircleOutline/></span>
            </label>
            <textarea
              id="col-prompt-modal"
              rows="4"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the question for the AI..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white resize-none"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
          {format !== 'Manual input' ? (
            <button
              type="button"
              onClick={handleAiGeneratePrompt} // This will show an alert as per its definition
              className="flex items-center px-3 py-1.5 bg-white text-indigo-600 text-sm rounded-md border border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors duration-150"
              title="Generate prompt suggestion (Feature in Popover)"
            >
              <IoSparklesOutline className="mr-1.5" size={18}/> AI Generate
            </button>
          ) : <div />} {/* Placeholder to keep spacing */}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 text-sm font-medium"
            >
              {initialData ? 'Save Changes' : 'Add Column'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ColumnEditorModal;