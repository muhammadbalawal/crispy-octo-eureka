'use client';

import { useState, useEffect } from 'react';
import { configManager } from '../lib/config-manager.js';

export default function ConfigModal({ isOpen, onClose, onSave, initialConfig, showManager = false }) {
  const [config, setConfig] = useState({
    name: '',
    type: 'openai',
    baseUrl: '',
    apiKey: '',
    model: '',
  });
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);

  // Only sync to local form state on initial config change, to avoid reverting user input on model load failure
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  // Based on current form model and available model list, decide whether to use custom input
  useEffect(() => {
    if (config.model) {
      if (models.length > 0) {
        const exists = models.some(m => m.id === config.model);
        setUseCustomModel(!exists);
      } else {
        setUseCustomModel(true);
      }
    }
  }, [models, config.model]);

  const handleLoadModels = async () => {
    if (!config.type || !config.baseUrl || !config.apiKey) {
      setError('Please fill in provider type, base URL, and API key first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        type: config.type,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
      });

      const response = await fetch(`/api/models?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load models');
      }

      setModels(data.models);
      if (data.models.length > 0) {
        // If current model is not in the newly loaded list, switch to list selection mode
        if (config.model && !data.models.some(m => m.id === config.model)) {
          setUseCustomModel(false);
          setConfig(prev => ({ ...prev, model: data.models[0].id }));
        } else if (!config.model && !useCustomModel) {
          // If no model selected and not in manual input mode, auto-select the first one
          setConfig(prev => ({ ...prev, model: data.models[0].id }));
        }
      }
    } catch (err) {
      setError(err.message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!config.type || !config.baseUrl || !config.apiKey || !config.model) {
      setError('Please fill in all required fields');
      return;
    }

    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded border border-gray-300 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">LLM Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">Note: If access password is enabled, server-side configuration will take priority</p>
          </div>

          {/* Provider Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g., My OpenAI"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Provider Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Type <span className="text-red-500">*</span>
            </label>
            <select
              value={config.type}
              onChange={(e) => setConfig({ ...config, type: e.target.value, model: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder={config.type === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1'}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Load Models Button */}
          <div>
            <button
              onClick={handleLoadModels}
              disabled={loading}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 transition-colors duration-200 font-medium"
            >
              {loading ? 'Loading models...' : 'Load Available Models'}
            </button>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Recommended: claude-sonnet-4.5</p>

            {/* Toggle between selection and custom input */}
            {models.length > 0 && (
              <div className="mb-2 flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={!useCustomModel}
                    onChange={() => {
                      setUseCustomModel(false);
                      if (models.length > 0) {
                        setConfig({ ...config, model: models[0].id });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Select from list</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={useCustomModel}
                    onChange={() => {
                      setUseCustomModel(true);
                      setConfig({ ...config, model: '' });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Manual input</span>
                </label>
              </div>
            )}

            {/* Model Selection Dropdown */}
            {models.length > 0 && !useCustomModel && (
              <select
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}

            {/* Custom Model Input */}
            {(useCustomModel || models.length === 0) && (
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="e.g., gpt-4, claude-3-opus-20240229"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors duration-200"
          >
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}
