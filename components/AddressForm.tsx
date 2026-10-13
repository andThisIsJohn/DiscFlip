import React, { useState } from 'react';
import { ShippingAddress } from '../types';

interface AddressFormProps {
  defaultName?: string;
  makeDefault?: boolean;
  onCancel: () => void;
  onSave: (address: ShippingAddress) => void | Promise<void>;
}

const US_STATE = /^[A-Za-z]{2}$/;
const US_ZIP = /^\d{5}(-\d{4})?$/;

/** Simple US shipping address form, used at checkout and in Account → Vault Settings. */
const AddressForm: React.FC<AddressFormProps> = ({
  defaultName = '',
  makeDefault = false,
  onCancel,
  onSave,
}) => {
  const [form, setForm] = useState({ name: defaultName, street: '', city: '', state: '', zip: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.street.trim() || !form.city.trim())
      return setError('Fill in every field.');
    if (!US_STATE.test(form.state.trim())) return setError('Use the 2-letter state code, e.g. NC.');
    if (!US_ZIP.test(form.zip.trim())) return setError('ZIP should look like 28202.');
    setError('');
    setSaving(true);
    try {
      await onSave({
        id: Math.random().toString(36).substr(2, 9),
        name: form.name.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zip: form.zip.trim(),
        isDefault: makeDefault,
      });
    } catch (err: any) {
      setError(err?.message || 'Could not save the address.');
    } finally {
      setSaving(false);
    }
  };

  const input =
    'w-full p-4 bg-white rounded-2xl font-bold text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50 space-y-3"
    >
      <input className={input} placeholder="Full name" value={form.name} onChange={set('name')} />
      <input
        className={input}
        placeholder="Street address"
        value={form.street}
        onChange={set('street')}
      />
      <div className="grid grid-cols-6 gap-3">
        <input
          className={`${input} col-span-3`}
          placeholder="City"
          value={form.city}
          onChange={set('city')}
        />
        <input
          className={`${input} col-span-1`}
          placeholder="ST"
          maxLength={2}
          value={form.state}
          onChange={set('state')}
        />
        <input
          className={`${input} col-span-2`}
          placeholder="ZIP"
          value={form.zip}
          onChange={set('zip')}
        />
      </div>
      {error && (
        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">{error}</p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-black text-orange-50 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 border border-slate-200 bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
