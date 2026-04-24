'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RetrieveForm() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = pin.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setError('Please enter a valid 6-digit PIN.');
      return;
    }
    setError('');
    router.push(`/clipboard/${cleaned}`);
  };

  return (
    <section aria-label="Retrieve an existing clipboard">
      {/* Divider */}
      <div className="divider">
        <div className="divider-line" />
        <span className="divider-label">or retrieve existing</span>
        <div className="divider-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="retrieve-pin"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setError('');
            setPin(e.target.value.replace(/\D/g, ''));
          }}
          placeholder="Enter 6-digit PIN"
          className="input flex-1"
          aria-label="6-digit clipboard PIN"
          aria-describedby={error ? 'retrieve-error' : undefined}
        />
        <button type="submit" className="btn-secondary flex-shrink-0">
          Retrieve
        </button>
      </form>

      {error && (
        <p id="retrieve-error" role="alert" className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </section>
  );
}
