import { useState, useEffect, useCallback } from 'react';
import { fetchSettings, saveSettings as saveSettingsApi } from '../services/api';
import type { Settings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save settings to API
  const saveSettings = useCallback(async (newSettings: Settings) => {
    setSaving(true);
    setError(null);
    try {
      const savedSettings = await saveSettingsApi(newSettings);
      setSettings(savedSettings);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err; // Re-throw so UI can handle it
    } finally {
      setSaving(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    saving,
    saveSettings,
    reloadSettings: loadSettings,
  };
}
