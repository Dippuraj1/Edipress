import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TemplateSelector({ onTemplateSelect }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/templates');
        setTemplates(response.data);
        if (response.data.length > 0) {
          setSelectedTemplate(response.data[0].id);
          onTemplateSelect(response.data[0].id);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load templates');
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [onTemplateSelect]);

  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    onTemplateSelect(templateId);
  };

  if (loading) {
    return <div className="text-center py-4">Loading templates...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>;
  }

  return (
    <div className="mb-6">
      <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
        Select Book Template
      </label>
      <select
        id="template"
        value={selectedTemplate}
        onChange={handleTemplateChange}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      {selectedTemplate && (
        <p className="mt-2 text-sm text-gray-500">
          {templates.find(t => t.id === selectedTemplate)?.description}
        </p>
      )}
    </div>
  );
}

export default TemplateSelector; 