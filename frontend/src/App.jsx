import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import TemplateSelector from './components/TemplateSelector';

function App() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('fiction');
  const [previewUrl, setPreviewUrl] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      setFile(acceptedFiles[0]);
      setPreviewUrl(null);
    }
  });

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
  };

  const handleUpload = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('template', selectedTemplate);

    try {
      const response = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });

      // Create a preview URL for the formatted document
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setPreviewUrl(url);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'formatted-book.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            KDP Formatter Pro
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Upload your .docx manuscript and get KDP-ready formatted files
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <TemplateSelector onTemplateSelect={handleTemplateSelect} />
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-blue-500">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-gray-600">
                  Drag and drop your .docx file here, or click to select
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Only .docx files are supported
                </p>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Selected file: {file.name}
              </p>
              <button
                onClick={handleUpload}
                disabled={processing}
                className={`mt-4 w-full py-2 px-4 rounded-md text-white font-medium
                  ${processing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {processing ? 'Processing...' : 'Upload and Format'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {previewUrl && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <iframe
              src={previewUrl}
              className="w-full h-96 border rounded-lg"
              title="Document Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 