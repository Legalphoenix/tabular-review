import React, { useState } from 'react';
import Modal from './Modal';

const ColumnManager = ({ columns, onColumnsChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null); // null for new, object for edit
  const [currentLabel, setCurrentLabel] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');

  const openModalForNew = () => {
    setEditingColumn(null);
    setCurrentLabel('');
    setCurrentPrompt('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (column) => {
    setEditingColumn(column);
    setCurrentLabel(column.label);
    setCurrentPrompt(column.prompt);
    setIsModalOpen(true);
  };

  const handleSaveColumn = () => {
    if (!currentLabel.trim() || !currentPrompt.trim()) {
      alert("Label and Prompt cannot be empty.");
      return;
    }

    if (editingColumn) {
      // Edit existing
      const updatedColumns = columns.map(col =>
        col.id === editingColumn.id
          ? { ...col, label: currentLabel.trim(), prompt: currentPrompt.trim() }
          : col
      );
      onColumnsChange(updatedColumns);
    } else {
      // Add new
      const newColumn = {
        id: crypto.randomUUID(),
        label: currentLabel.trim(),
        prompt: currentPrompt.trim(),
      };
      onColumnsChange([...columns, newColumn]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteColumn = (idToDelete) => {
    if (window.confirm('Are you sure you want to delete this column? This will remove its data from the table.')) {
      const filteredColumns = columns.filter(col => col.id !== idToDelete);
      onColumnsChange(filteredColumns); // Let App.jsx handle removing data
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-700">Review Columns</h3>
      <div className="space-y-2 mb-4">
        {columns.length === 0 && (
          <p className="text-sm text-gray-500 italic">No columns defined yet.</p>
        )}
        {columns.map((col) => (
          <div key={col.id} className="flex items-center justify-between p-2 border border-gray-200 rounded bg-white shadow-sm">
            <span className="font-medium text-gray-800 truncate mr-4" title={col.label}>{col.label}</span>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => openModalForEdit(col)}
                className="text-xs text-blue-600 hover:text-blue-800"
                aria-label={`Edit column ${col.label}`}
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteColumn(col.id)}
                className="text-xs text-red-600 hover:text-red-800"
                aria-label={`Delete column ${col.label}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={openModalForNew}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
      >
        Add New Column
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingColumn ? 'Edit Column' : 'Add New Column'}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="col-label" className="block text-sm font-medium text-gray-700 mb-1">
              Column Label (Header):
            </label>
            <input
              id="col-label"
              type="text"
              value={currentLabel}
              onChange={(e) => setCurrentLabel(e.target.value)}
              placeholder="e.g., Governing Law"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="col-prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Prompt for LLM:
            </label>
            <textarea
              id="col-prompt"
              rows="4"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder="e.g., What is the governing law specified in this document?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
             <p className="text-xs text-gray-500 mt-1">This is the specific question sent to the AI based on the document text.</p>
          </div>
          <div className="flex justify-end space-x-3">
             <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveColumn}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              {editingColumn ? 'Save Changes' : 'Add Column'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ColumnManager;