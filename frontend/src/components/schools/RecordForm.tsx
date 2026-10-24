'use client';

import { useState } from 'react';

type Field =
  | { name: string; label: string; type: 'text'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'select'; required?: boolean; options: { value: string; label: string }[]; emptyLabel?: string }
  | { name: string; type: 'hidden'; value: string };

type Props = {
  title: string;
  submitLabel: string;
  fields: Field[];
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

export default function RecordForm({ title, submitLabel, fields, action }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setMessage({ text: '', type: '' });

    const result = await action(new FormData(form));

    if (result.error) {
      setMessage({ text: result.error, type: 'error' });
    } else if (result.success) {
      setMessage({ text: 'Saved', type: 'success' });
      form.reset();
    }

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {message.text && (
          <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
            {message.text}
          </div>
        )}

        {fields.map((f) => {
          if (f.type === 'hidden') return <input key={f.name} type="hidden" name={f.name} value={f.value} />;
          return (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              {f.type === 'text' ? (
                <input name={f.name} type="text" required={f.required} placeholder={f.placeholder} className="w-full px-3 py-2 border rounded-md" />
              ) : (
                <select name={f.name} required={f.required} className="w-full px-3 py-2 border rounded-md bg-white">
                  {f.emptyLabel !== undefined && <option value="">{f.emptyLabel}</option>}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 text-white font-medium py-2 px-4 rounded-md hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </form>
    </div>
  );
}
