import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Shield, Crown } from 'lucide-react';
import { User as UserType } from '../../types';
import { useApp } from '../../context/SupabaseAppContext';
import { usersService } from '../../lib/services';
import { swalConfig } from '../../lib/sweetAlert';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType | null;
}

export function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    active: true,
    avatar: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        active: user.active,
        avatar: user.avatar || '',
      });
    } else {
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'cashier',
        active: true,
        avatar: '',
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      swalConfig.error(
        'New user creation requires a secure server-side admin endpoint. Please configure it before creating users.'
      );
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await usersService.update(user.id, {
        name: formData.name,
        role: formData.role,
        active: formData.active,
        avatar: formData.avatar || undefined,
      });

      dispatch({
        type: 'SET_USERS',
        payload: state.users.map((existingUser) =>
          existingUser.id === user.id ? updatedUser : existingUser
        ),
      });

      swalConfig.success('User updated successfully.');
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred.';

      swalConfig.error(`Error updating user: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const rolePermissions = {
    admin: [
      'Full system access',
      'User management',
      'Settings configuration',
      'All reports',
    ],
    manager: [
      'Sales management',
      'Inventory control',
      'Customer management',
      'Basic reports',
    ],
    cashier: [
      'POS operations',
      'Basic sales',
      'Customer lookup',
      'Receipt printing',
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="flex items-center space-x-2 text-xl font-bold text-gray-900">
            <User className="h-6 w-6 text-blue-600" />
            <span>{user ? 'Edit User' : 'Add New User'}</span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close user form"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input pl-10"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={!!user}
                className="input"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!!user}
                  className="input pl-10"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {!user && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="input pl-10"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Account creation will be available after the secure backend is configured.
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Role *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="select pl-10"
                  disabled={user?.id === state.currentUser?.id}
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center space-x-2 text-sm font-semibold text-gray-900">
              {formData.role === 'admin' && (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
              {formData.role === 'manager' && (
                <Shield className="h-4 w-4 text-blue-500" />
              )}
              {formData.role === 'cashier' && (
                <User className="h-4 w-4 text-gray-500" />
              )}
              <span className="capitalize">{formData.role} Permissions</span>
            </h3>

            <ul className="space-y-1 text-xs text-gray-600">
              {rolePermissions[formData.role].map((permission) => (
                <li key={permission} className="flex items-center space-x-2">
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Avatar URL (Optional)
            </label>
            <input
              type="url"
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
              className="input"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              disabled={user?.id === state.currentUser?.id}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="active"
              className="text-sm font-medium text-gray-700"
            >
              Active User
            </label>
          </div>

          <div className="flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-md"
            >
              {loading ? 'Saving...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}