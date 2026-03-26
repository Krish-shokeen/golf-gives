"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Charity { id: string; name: string; description: string | null; image_url: string | null; is_featured: boolean; created_at: string }

export default function CharitiesManager({ initialCharities }: { initialCharities: Charity[] }) {
  const [charities, setCharities] = useState(initialCharities);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("charities")
      .insert({ name: name.trim(), description: description.trim() || null, is_featured: isFeatured })
      .select()
      .single();
    if (err) { setError(err.message); setSaving(false); return; }
    setCharities((prev) => [data, ...prev]);
    setName(""); setDescription(""); setIsFeatured(false); setShowForm(false);
    setSaving(false);
  }

  async function toggleFeatured(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("charities").update({ is_featured: !current }).eq("id", id);
    setCharities((prev) => prev.map((c) => c.id === id ? { ...c, is_featured: !current } : c));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this charity?")) return;
    const supabase = createClient();
    await supabase.from("charities").delete().eq("id", id);
    setCharities((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm((s) => !s)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
        {showForm ? "Cancel" : "+ Add Charity"}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
          <h2 className="font-semibold text-gray-900">New Charity</h2>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Charity name"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded" />
            Featured charity
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            {saving ? "Saving…" : "Add Charity"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Featured</th>
            <th className="px-5 py-3 font-medium">Added</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {charities.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  {c.description && <p className="text-xs text-gray-400 line-clamp-1">{c.description}</p>}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => toggleFeatured(c.id, c.is_featured)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.is_featured ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500 hover:bg-amber-50"}`}>
                    {c.is_featured ? "⭐ Featured" : "Set featured"}
                  </button>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString("en-GB")}</td>
                <td className="px-5 py-3">
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {charities.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No charities yet.</p>}
      </div>
    </div>
  );
}
