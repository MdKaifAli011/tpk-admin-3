"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { FaBan, FaPlus, FaTrash, FaEdit, FaClock, FaShieldAlt, FaChartBar } from 'react-icons/fa';
import { usePermissions } from '../../../hooks/usePermissions';
import IPBlockTable from '../../../components/analytics/IPBlockTable';
import IPBlockForm from '../../../components/analytics/IPBlockForm';
import api from '@/lib/api';

const IPManagementPage = () => {
  const { canEdit, canDelete } = usePermissions();
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [stats, setStats] = useState({
    totalBlocked: 0,
    activeBlocks: 0,
    expiredBlocks: 0,
    inactiveBlocks: 0,
    todayAttempts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingIP, setEditingIP] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [status, setStatus] = useState('all'); // all, active, inactive, expired

  const fetchBlockedIPs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(status !== 'all' && { status }),
      });

      const response = await api.get(`/analytics/ip-block?${params}`);

      setBlockedIPs(response.data?.data || []);
      setStats(response.data?.stats || {});
      setPagination(prev => response.data?.pagination || prev);
      setError('');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load blocked IPs';
      setError(typeof msg === 'string' ? msg : 'Failed to load blocked IPs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, status]);

  useEffect(() => {
    fetchBlockedIPs();
  }, [fetchBlockedIPs]);

  const handleSave = () => {
    setShowForm(false);
    setEditingIP(null);
    fetchBlockedIPs();
  };

  const handleEdit = (ip) => {
    setEditingIP(ip);
    setShowForm(true);
  };

  const getApiErrorMessage = (err) => {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    return typeof msg === 'string' ? msg : 'Something went wrong';
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this IP block?')) {
      return;
    }
    try {
      setError('');
      await api.delete(`/analytics/ip-block?id=${id}`);
      fetchBlockedIPs();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleToggleStatus = async (ip) => {
    try {
      setError('');
      await api.put(`/analytics/ip-block?id=${ip._id}`, {
        ...ip,
        isActive: !ip.isActive,
      });
      fetchBlockedIPs();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IP Management</h1>
          <p className="text-gray-600">Manage blocked IP addresses for visit tracking</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
          >
            <FaBan />
            Block New IP
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Blocked</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBlocked}</p>
            </div>
            <FaShieldAlt className="text-red-500 text-2xl" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Blocks</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeBlocks}</p>
            </div>
            <FaBan className="text-green-500 text-2xl" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired Blocks</p>
              <p className="text-2xl font-bold text-orange-600">{stats.expiredBlocks}</p>
            </div>
            <FaClock className="text-orange-500 text-2xl" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive Blocks</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactiveBlocks}</p>
            </div>
            <FaBan className="text-gray-500 text-2xl" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today&apos;s Attempts</p>
              <p className="text-2xl font-bold text-purple-600">{stats.todayAttempts}</p>
            </div>
            <FaChartBar className="text-purple-500 text-2xl" />
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatus('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            status === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({stats.totalBlocked})
        </button>
        <button
          onClick={() => setStatus('active')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active ({stats.activeBlocks})
        </button>
        <button
          onClick={() => setStatus('expired')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            status === 'expired'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Expired ({stats.expiredBlocks})
        </button>
        <button
          onClick={() => setStatus('inactive')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            status === 'inactive'
              ? 'bg-gray-200 text-gray-900 ring-1 ring-gray-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Inactive ({stats.inactiveBlocks})
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        /* IP Block Table */
        <IPBlockTable
          blockedIPs={blockedIPs}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit IP Block Form */}
      {(showForm || editingIP) && (
        <IPBlockForm
          ip={editingIP}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingIP(null);
          }}
        />
      )}
    </div>
  );
};

export default IPManagementPage;
