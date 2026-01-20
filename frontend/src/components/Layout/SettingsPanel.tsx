import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Dropdown } from '../UI/Dropdown';
import { TextInput } from '../UI/TextInput';
import { Modal } from '../UI/Modal';
import {
  SETTINGS_FIELDS,
  GROUP_LABELS,
  GROUP_ORDER,
  type SettingsGroup,
  type SettingsFieldConfig,
} from '../../constants/settingsFields';
import type { Settings } from '../../types';

function CollapsibleGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-void/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-bone/50 hover:bg-bone transition-colors"
      >
        <span className="font-display text-sm font-bold text-void">{title}</span>
        <span className={`text-void/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { settings, loading, error, saving, saveSettings } = useSettings();

  // Local form state - separate from saved settings
  const [formData, setFormData] = useState<Settings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when settings are loaded or modal opens
  useEffect(() => {
    if (settings && isModalOpen) {
      setFormData({ ...settings });
      setHasChanges(false);
    }
  }, [settings, isModalOpen]);

  // Handle field change - update local state only
  const handleFieldChange = useCallback((key: keyof Settings, value: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (formData) {
      await saveSettings(formData);
      setHasChanges(false);
    }
  }, [formData, saveSettings]);

  // Handle cancel - reset form to saved settings
  const handleCancel = useCallback(() => {
    if (settings) {
      setFormData({ ...settings });
      setHasChanges(false);
    }
    setIsModalOpen(false);
  }, [settings]);

  // Handle close - warn if unsaved changes
  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const isFieldVisible = useCallback((field: SettingsFieldConfig): boolean => {
    if (!field.visibleWhen || !formData) return true;

    const { field: conditionField, values } = field.visibleWhen;
    const currentValue = formData[conditionField];
    return values.includes(currentValue as string);
  }, [formData]);

  const renderField = useCallback((field: SettingsFieldConfig) => {
    if (!formData || !isFieldVisible(field)) return null;

    const value = formData[field.key] ?? '';

    if (field.type === 'dropdown' && field.options) {
      return (
        <Dropdown
          key={field.key}
          label={field.label}
          value={value as string}
          onChange={(v) => handleFieldChange(field.key, v)}
          options={field.options}
          tooltip={field.tooltip}
          disabled={saving}
        />
      );
    }

    return (
      <TextInput
        key={field.key}
        label={field.label}
        value={value as string}
        onChange={(v) => handleFieldChange(field.key, v)}
        type={field.type === 'password' ? 'password' : 'text'}
        placeholder={field.placeholder}
        tooltip={field.tooltip}
        disabled={saving}
      />
    );
  }, [formData, isFieldVisible, handleFieldChange, saving]);

  const getFieldsByGroup = (group: SettingsGroup): SettingsFieldConfig[] => {
    return SETTINGS_FIELDS.filter((field) => field.group === group);
  };

  const hasVisibleFieldsInGroup = useCallback((group: SettingsGroup): boolean => {
    const fields = getFieldsByGroup(group);
    return fields.some((field) => isFieldVisible(field));
  }, [isFieldVisible]);

  // Custom footer with Save and Cancel buttons
  const modalFooter = (
    <>
      <button
        onClick={handleCancel}
        disabled={saving}
        className="px-6 py-2 bg-white text-void font-bold rounded-xl border-2 border-void/30 hover:border-void hover:bg-bone transition-all disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className={`
          px-6 py-2 font-bold rounded-xl border-2 border-void transition-all
          shadow-[4px_4px_0_0_#0F0F0F] hover:shadow-[2px_2px_0_0_#0F0F0F] hover:translate-x-[2px] hover:translate-y-[2px]
          ${hasChanges
            ? 'bg-genz-yellow text-void hover:bg-genz-yellow/80'
            : 'bg-gray-200 text-void/50 cursor-not-allowed shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0'
          }
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0
        `}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </>
  );

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <span className="text-lg">&#9881;</span>
        <span className="font-body">Settings</span>
      </button>

      {/* Settings Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Settings"
        footer={modalFooter}
      >
        {loading ? (
          <div className="text-void/40 text-sm text-center py-8">
            Loading settings...
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm text-center py-4 bg-red-100 rounded-lg border-2 border-red-300 px-4">
            {error}
          </div>
        ) : formData ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {GROUP_ORDER.map((group) => {
              if (!hasVisibleFieldsInGroup(group)) return null;

              const fields = getFieldsByGroup(group);
              const renderedFields = fields.map(renderField).filter(Boolean);

              if (renderedFields.length === 0) return null;

              return (
                <CollapsibleGroup
                  key={group}
                  title={GROUP_LABELS[group]}
                  defaultOpen={group === 'model'}
                >
                  {renderedFields}
                </CollapsibleGroup>
              );
            })}

            {hasChanges && (
              <div className="text-amber-600 text-xs text-center py-2 bg-amber-50 rounded-lg border border-amber-200">
                You have unsaved changes
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
