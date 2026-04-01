"use client";
import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaClipboardList } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import FormBuilder from "./FormBuilder";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import PaginationBar from "../ui/PaginationBar";

const FormManagement = () => {
  const { canCreate } = usePermissions();
  const [filterState, setFilterState] = useFilterPersistence("form", {});
  const { page, limit } = filterState;
  const [forms, setForms] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();

  useEffect(() => {
    fetchForms();
  }, [page, limit]);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/form?page=${page}&limit=${limit}`);
      if (response.data?.success) {
        setForms(response.data.data || []);
        setPagination(response.data.pagination || null);
      } else {
        setError(response.data?.message || "Failed to fetch forms");
      }
    } catch (err) {
      console.error("Error fetching forms:", err);
      setError(err?.response?.data?.message || "Failed to fetch forms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (form) => {
    if (
      !window.confirm(`Are you sure you want to delete form "${form.formId}"?`)
    ) {
      return;
    }

    try {
      const response = await api.delete(`/form/${form.formId}`);
      if (response.data?.success) {
        success("Form deleted successfully!");
        fetchForms();
      } else {
        showError(response.data?.message || "Failed to delete form");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete form");
    }
  };

  const handleEdit = (form) => {
    setEditingForm(form);
    setShowBuilder(true);
  };

  const handleCreateNew = () => {
    setEditingForm(null);
    setShowBuilder(true);
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingForm(null);
    fetchForms();
  };

  if (showBuilder) {
    return <FormBuilder form={editingForm} onClose={handleBuilderClose} />;
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Form Management
            </h1>
            <p className="text-xs text-gray-600">
              Create and manage dynamic forms for your application.
            </p>
          </div>
          <PermissionButton
            action="create"
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FaPlus className="text-sm" />
            Create New Form
          </PermissionButton>
        </div>
      </div>

      {/* Forms List */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">
            Forms ({pagination?.total ?? forms.length})
          </h2>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="medium" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-red-100 rounded-full mb-4">
                <FaClipboardList className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Forms
              </h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={fetchForms}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FaClipboardList className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Forms Found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first form to get started.
              </p>
              <button
                onClick={handleCreateNew}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Form
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fields
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {forms.map((form) => (
                    <tr
                      key={form._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                            {form.formId}
                          </code>
                        </div>
                        {form.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {form.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {form.fields?.length || 0} fields
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {form.submissionCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            form.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {form.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            action="edit"
                            onClick={() => handleEdit(form)}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                            title="Edit Form"
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </PermissionButton>
                          <PermissionButton
                            action="delete"
                            onClick={() => handleDelete(form)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                            title="Delete Form"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && (
          <PaginationBar
            page={page}
            limit={limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageChange={(p) => setFilterState({ page: p })}
            onLimitChange={(l) => setFilterState({ page: 1, limit: l })}
          />
        )}
      </div>
    </>
  );
};

export default FormManagement;
