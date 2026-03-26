/**
 * /charities/[id] — Individual Charity Profile Page (Server Component)
 * Queries Supabase directly. Requirements: 6.6
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

interface CharityEvent { id: string; title: string; event_date: string; description: string | null }
interface CharityDetail { id: string; name: string; description: string | null; image_url: string | null; is_featured: boolean; charity_events: CharityEvent[] }

export default async function CharityProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [{ data: charity }, { data: { user } }] = await Promise.all([
    supabase.from("charities").select("id, name, description, image_url, is_featured, charity_events(id, title, event_date, description)").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  if (!charity) notFound();

  const c = charity as unknown as CharityDetail;
  const upcomingEvents = (c.charity_events ?? [])
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-white text-gray-900">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⛳</span>
            <span className="font-bold text-lg tracking-tight text-emerald-700">GolfGives</span>
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/subscribe" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors">
              Subscribe
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/charities" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          ← Back to charities
        </Link>

        {/* Hero image */}
        <div className={`w-full h-56 sm:h-72 rounded-3xl overflow-hidden mb-8 ${c.image_url ? "" : "bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center"}`}>
          {c.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl">💚</span>
          )}
        </div>

        {/* Header */}
        <div className="mb-6">
          {c.is_featured && (
            <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full mb-3">
              ⭐ Featured charity
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold">{c.name}</h1>
        </div>

        {c.description && (
          <p className="text-gray-600 leading-relaxed text-base sm:text-lg mb-10 max-w-2xl">{c.description}</p>
        )}

        {/* CTA */}
        {!user && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">Support {c.name}</p>
              <p className="text-sm text-gray-500">Subscribe to GolfGives and direct at least 10% of your fee to this charity every month.</p>
            </div>
            <Link href="/subscribe" className="flex-shrink-0 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-full transition-all hover:scale-105 active:scale-95">
              Subscribe now →
            </Link>
          </div>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Upcoming events</h2>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{event.title}</p>
                      {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
                    </div>
                    <time dateTime={event.event_date} className="flex-shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      {new Date(event.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
