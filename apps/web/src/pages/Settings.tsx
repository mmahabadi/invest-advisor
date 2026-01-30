import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, User, Bell, Globe, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { settingsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Settings } from '../types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
  });
  
  const [formData, setFormData] = useState<Partial<Settings>>({});
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Settings>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: () => settingsApi.deleteAccount(),
    onSuccess: () => {
      logout();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  const currentSettings = { ...settings, ...formData };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Settings</h1>
        <p className="text-surface-500">Manage your account and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-surface-100">Profile</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input bg-surface-800/50"
                value={user?.email || ''}
                disabled
              />
              <p className="text-xs text-surface-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={user?.name || ''}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-surface-100">Preferences</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Currency</label>
                <select
                  className="input"
                  value={currentSettings.currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
              
              <div>
                <label className="label">Timezone</label>
                <select
                  className="input"
                  value={currentSettings.timezone || 'UTC'}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="label">Theme</label>
              <select
                className="input"
                value={currentSettings.theme || 'dark'}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-surface-100">Notifications</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentSettings.notifications?.email ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      email: e.target.checked,
                    },
                  })}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-surface-200">Email notifications</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentSettings.notifications?.dailySummary ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      dailySummary: e.target.checked,
                    },
                  })}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-surface-200">Daily summary email</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentSettings.notifications?.weeklyReport ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      weeklyReport: e.target.checked,
                    },
                  })}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-surface-200">Weekly performance report</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="label">Quiet Hours Start</label>
                <input
                  type="time"
                  className="input"
                  value={currentSettings.notifications?.quietHoursStart || '22:00'}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      quietHoursStart: e.target.value,
                    },
                  })}
                />
              </div>
              <div>
                <label className="label">Quiet Hours End</label>
                <input
                  type="time"
                  className="input"
                  value={currentSettings.notifications?.quietHoursEnd || '08:00'}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      quietHoursEnd: e.target.value,
                    },
                  })}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Minimum Confidence for Alerts</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentSettings.notifications?.minConfidenceAlert ?? 70}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      minConfidenceAlert: parseInt(e.target.value),
                    },
                  })}
                  className="flex-1"
                />
                <span className="text-surface-200 font-mono w-12 text-right">
                  {currentSettings.notifications?.minConfidenceAlert ?? 70}%
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-1">
                Only receive alerts when AI confidence is above this threshold
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="border-danger-500/30">
        <CardHeader>
          <h2 className="text-lg font-semibold text-danger-400">Danger Zone</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-surface-200">Delete Account</p>
              <p className="text-sm text-surface-500">
                Permanently delete your account and all data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                  deleteMutation.mutate();
                }
              }}
              className="btn-danger flex items-center gap-2"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
