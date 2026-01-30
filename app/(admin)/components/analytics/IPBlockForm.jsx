"use client";
import React, { useState, useEffect } from 'react';
import { FaBan, FaSave, FaTimes, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import api from '@/lib/api';

const IPBlockForm = ({ ip, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    ipAddress: '',
    reason: '',
    description: '',
    isActive: true,
    expiresAt: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ip) {
      setFormData({
        ipAddress: ip.ipAddress || '',
        reason: ip.reason || '',
        description: ip.description || '',
        isActive: ip.isActive !== false,
        expiresAt: ip.expiresAt ? new Date(ip.expiresAt).toISOString().split('T')[0] : '',
      });
    }
  }, [ip]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate IP address
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(formData.ipAddress)) {
        throw new Error('Please enter a valid IP address (e.g., 192.168.1.1)');
      }

      // Validate expiry date if provided
      if (formData.expiresAt && new Date(formData.expiresAt) <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }

      const submitData = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
      };

      let response;
      if (ip) {
        response = await api.put(`/analytics/ip-block?id=${ip._id}`, submitData);
      } else {
        response = await api.post(`/analytics/ip-block`, submitData);
      }

      onSave(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(typeof msg === 'string' ? msg : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 border-b border-red-200/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaBan className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {ip ? 'Edit IP Block' : 'Block New IP'}
                </h3>
                <p className="text-red-100 text-xs">
                  {ip ? 'Update existing IP block settings' : 'Create new IP block'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/20"
              disabled={isSubmitting}
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <FaExclamationTriangle className="text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* IP Address */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              IP Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="ipAddress"
                value={formData.ipAddress}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder="192.168.1.1"
                required
                disabled={isSubmitting}
                pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                title="Please enter a valid IP address"
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <FaBan className="text-sm" />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50 backdrop-blur-sm transition-all duration-200 appearance-none"
              required
              disabled={isSubmitting}
            >
              <option value="">Select a reason</option>
              <option value="Spam/Bot">🤖 Spam/Bot</option>
              <option value="Suspicious Activity">⚠️ Suspicious Activity</option>
              <option value="Testing/Development">🧪 Testing/Development</option>
              <option value="Internal Traffic">🏢 Internal Traffic</option>
              <option value="Other">📋 Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50 backdrop-blur-sm transition-all duration-200 resize-none"
              rows="3"
              placeholder="Add notes about this IP block..."
              disabled={isSubmitting}
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expires At <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="expiresAt"
                value={formData.expiresAt}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                min={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <FaClock className="text-sm" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for permanent block
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-5 h-5 text-red-600 focus:ring-2 focus:ring-red-500 border-gray-200 rounded transition-all duration-200"
              disabled={isSubmitting}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              <span className={formData.isActive ? "text-green-600" : "text-gray-500"}>
                {formData.isActive ? 'Active Block' : 'Inactive'}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/50">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-transparent border-r-transparent animate-spin"></div>
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FaSave className="text-sm" />
                  <span>{ip ? 'Update' : 'Block'}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IPBlockForm;
