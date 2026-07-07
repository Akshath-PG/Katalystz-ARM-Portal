'use client';

import { useState } from 'react';
import { createUser } from '@/app/actions/user';

export default function UserForm({ schools }: { schools: { id: string; name: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result.error) {
      setMessage({ text: result.error, type: 'error' });
    } else if (result.success) {
      setMessage({ text: 'User created successfully', type: 'success' });
      (e.target as HTMLFormElement).reset();
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message.text && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input name="name" type="text" required className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" required className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input name="password" type="password" required className="w-full px-3 py-2 border rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy Level</label>
        <select name="role" required className="w-full px-3 py-2 border rounded-md bg-white">
          <option value="TEACHER">Teacher</option>
          <option value="HOD">HOD</option>
          <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
          <option value="PRINCIPAL">Principal</option>
          <option value="KATALYST_ADMIN">Admin (Katalystz)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
        <select name="schoolId" className="w-full px-3 py-2 border rounded-md bg-white">
          <option value="">None (For Admins only)</option>
          {schools.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  );
}
