import React from 'react';
import { FaEdit, FaTrash, FaClock, FaBan, FaCheck, FaShieldAlt } from 'react-icons/fa';

const IPBlockTable = ({ blockedIPs, onEdit, onDelete, onToggleStatus, canEdit, canDelete }) => {
  const getStatusBadge = (isActive, expiresAt) => {
    if (!isActive) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
          Inactive
        </span>
      );
    }
    
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
          Expired
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
        Active
      </span>
    );
  };

  const getReasonColor = (reason) => {
    const colors = {
      'Spam/Bot': 'text-red-600 bg-red-50',
      'Suspicious Activity': 'text-orange-600 bg-orange-50',
      'Testing/Development': 'text-blue-600 bg-blue-50',
      'Internal Traffic': 'text-purple-600 bg-purple-50',
      'Other': 'text-gray-600 bg-gray-50'
    };
    return colors[reason] || colors['Other'];
  };

  if (!blockedIPs || blockedIPs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <FaBan className="text-gray-400 text-5xl mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 mb-1">No Blocked IPs</h3>
        <p className="text-sm text-gray-500">No IP addresses are currently blocked.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Blocked IP Addresses</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blocked By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blocked At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blockedIPs.map((ipBlock) => (
              <tr key={ipBlock._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <FaBan className="text-red-500 mr-2" />
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {ipBlock.ipAddress}
                    </span>
                  </div>
                </td>
                
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReasonColor(ipBlock.reason)}`}>
                      {ipBlock.reason}
                    </span>
                    {ipBlock.description && (
                      <span className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                        {ipBlock.description}
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(ipBlock.isActive, ipBlock.expiresAt)}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {ipBlock.blockedBy?.name || 'Unknown'}
                    </span>
                    {ipBlock.blockedBy?.email && (
                      <span className="text-xs text-gray-500">
                        {ipBlock.blockedBy.email}
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(ipBlock.blockedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(ipBlock.blockedAt).toLocaleTimeString()}
                  </div>
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {ipBlock.expiresAt 
                      ? new Date(ipBlock.expiresAt).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  {ipBlock.expiresAt && (
                    <div className="text-xs text-gray-500">
                      {new Date(ipBlock.expiresAt).toLocaleTimeString()}
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {ipBlock.accessAttempts || 0}
                    </span>
                    {ipBlock.lastAccessAttempt && (
                      <span className="text-xs text-gray-500">
                        Last: {new Date(ipBlock.lastAccessAttempt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onToggleStatus && onToggleStatus(ipBlock)}
                          className={`p-1 rounded-lg transition-colors ${
                            ipBlock.isActive 
                              ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' 
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                          title={ipBlock.isActive ? 'Deactivate Block' : 'Activate Block'}
                        >
                          {ipBlock.isActive ? <FaBan className="text-sm" /> : <FaCheck className="text-sm" />}
                        </button>
                        <button
                          onClick={() => onEdit(ipBlock)}
                          className="p-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Edit IP Block"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                      </>
                    )}
                    
                    {canDelete && (
                      <button
                        onClick={() => onDelete(ipBlock._id)}
                        className="p-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete IP Block"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IPBlockTable;
