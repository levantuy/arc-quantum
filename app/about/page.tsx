"use client";

import React, { useState } from 'react';

const CONTACTS = [
  { label: 'Email', value: 'levantuy.it@gmail.com', href: 'mailto:levantuy.it@gmail.com' },
  { label: 'Telegram', value: '@tuylv', href: 'https://t.me/tuylv' },
  { label: 'Discord', value: 'Arc Quantum', href: 'https://discord.gg/tuylv' },
  { label: 'Phone', value: '+84 0919249247', href: 'tel:+84919249247' },
  { label: 'Facebook', value: 'Arc Quantum', href: 'https://facebook.com/tuylv.vn' },
  { label: 'Twitter', value: '@tuylv', href: 'https://x.com/levantuy' },
  { label: 'LinkedIn', value: 'Arc Quantum', href: 'https://www.linkedin.com/in/le-van-tuy-88862a58' },
  { label: 'GitHub', value: 'arc-quantum', href: 'https://github.com/levantuy' },
];

export default function AboutPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '', captcha: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Dummy captcha for demo
  const captchaQuestion = '3 + 4 = ?';
  const captchaAnswer = '7';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.captcha.trim() !== captchaAnswer) {
      setError('Captcha answer is incorrect.');
      return;
    }
    setSubmitting(true);
    // Simulate sending email (replace with real API in production)
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">About Arc Quantum</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Arc Quantum is a next-generation DeFi platform on Arc Network, empowering users with seamless asset management, cross-chain bridging, and instant token swaps. Our mission is to make decentralized finance accessible, secure, and efficient for everyone.
      </p>
      <ul className="mb-8 space-y-2">
        <li>• Multi-chain asset management</li>
        <li>• Fast and low-cost transactions</li>
        <li>• Secure and transparent operations</li>
        <li>• Community-driven development</li>
      </ul>
      <h2 className="text-xl font-semibold mb-2 mt-8 text-gray-900 dark:text-gray-100">Contact</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {CONTACTS.map((c) => (
          <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-500 transition">
            <span className="font-medium text-gray-900 dark:text-gray-100">{c.label}:</span> <span className="text-gray-600 dark:text-gray-300">{c.value}</span>
          </a>
        ))}
      </div>
      <h2 className="text-xl font-semibold mb-2 mt-8 text-gray-900 dark:text-gray-100">Feedback</h2>
      {submitted ? (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-300">Thank you for your feedback!</div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" name="name" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900" value={form.name} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900" value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea name="message" required rows={4} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900" value={form.message} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Captcha: {captchaQuestion}</label>
            <input type="text" name="captcha" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900" value={form.captcha} onChange={handleChange} />
          </div>
          {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition disabled:opacity-60">
            {submitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
      )}
    </div>
  );
}
