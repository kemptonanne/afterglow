import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LockKeyhole, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { formatMomentDate, todayLocal, type Moment } from '@/lib/moments';
import { selectChapterMoments } from '@/lib/selectChapterMoments';
import { chapterTitle } from '@/lib/chapterTitle';
import { ChapterPreview, ChapterTile, primaryButton, useChapterImages, type ChapterDraft } from './ChapterPreview';

const chapterKeys = ['chapters'];
function Fan({ moments }: { moments: Moment[] }) {
  const { urls } = useChapterImages(moments);
  return <div className="flex min-h-32 items-center justify-center px-3 pb-5 pt-7">{moments.length ? moments.slice(0, 3).map((m, i) => <div key={m.id} className="relative -mx-2 w-1/3" style={{ transform: `rotate(${(i - 1) * 9}deg)`, zIndex: i === 1 ? 2 : 1 }}><ChapterTile moment={m} url={urls[m.id]} compact /></div>) : <p className="py-7 font-serif italic text-muted-foreground">A little collection of moments</p>}</div>;
}
function SavedCard({ chapter }: { chapter: Tables<'chapters'> }) {
  const moments = useQuery({ queryKey: ['chapter-cover', chapter.id, chapter.moment_ids], queryFn: async () => {
    if (!chapter.moment_ids.length) return [];
    const { data, error } = await supabase.from('moments').select('*').in('id', chapter.moment_ids);
    if (error) throw error;
    const byId = new Map((data || []).map(m => [m.id, m]));
    return chapter.moment_ids.flatMap(id => { const m = byId.get(id); return m ? [m] : []; }).slice(0, 3);
  } });
  return <Link to="/chapters/$chapterId" params={{ chapterId: chapter.id }} className="paper-panel block rounded-2xl border border-card p-4 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-primary">
    <Fan moments={moments.data || []} />
    <h2 className="font-serif text-2xl">{chapter.title}</h2>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{formatMomentDate(chapter.start_date)} – {formatMomentDate(chapter.end_date)}</span><span className="flex items-center gap-1"><LockKeyhole size={14} />Private</span></div>
  </Link>;
}
export function ChaptersPage() {
  const [screen, setScreen] = useState<'list' | 'create' | 'preview'>('list');
  const [mode, setMode] = useState<'Week' | 'Month' | 'Custom'>('Week');
  const today = todayLocal();
  const weekDate = new Date(`${today}T12:00:00`); weekDate.setDate(weekDate.getDate() - 6);
  const weekStart = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}-${String(weekDate.getDate()).padStart(2, '0')}`;
  const [from, setFrom] = useState(weekStart), [to, setTo] = useState(today);
  const [draft, setDraft] = useState<ChapterDraft | null>(null);
  const [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const queryClient = useQueryClient();
  const chapters = useQuery({ queryKey: chapterKeys, queryFn: async () => {
    const { data, error } = await supabase.from('chapters').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } });
  const start = mode === 'Week' ? weekStart : mode === 'Month' ? `${today.slice(0, 7)}-01` : from;
  const end = mode === 'Custom' ? to : today;
  const valid = !!start && !!end && start <= end && end <= today;
  const generate = async () => {
    if (!valid) return;
    setBusy(true); setError('');
    try {
      // Page through the entire period: Supabase's default row limit must not bias selection.
      const moments: Moment[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('moments').select('*').gte('moment_date', start).lte('moment_date', end).order('id').range(offset, offset + 499);
        if (error) throw error;
        moments.push(...data);
        if (data.length < 500) break;
      }
      const picks = selectChapterMoments(moments.map(m => ({ ...m, has_photo: !!m.photo_path, has_video: !!m.video_path, has_audio: !!m.audio_path })), start, end);
      if (!picks.length) { setError('No moments in these dates yet.'); return; }
      setDraft({ title: chapterTitle(start, end, today), start_date: start, end_date: end, moments: picks });
      setSaved(false); setScreen('preview');
    } catch { setError("Couldn't load your moments. Try again."); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!draft || saved) return;
    const { error } = await supabase.from('chapters').insert({ title: draft.title, start_date: draft.start_date, end_date: draft.end_date, moment_ids: draft.moments.map(m => m.id) });
    if (error) throw error;
    setSaved(true); await queryClient.invalidateQueries({ queryKey: chapterKeys });
  };
  if (screen === 'preview' && draft) return <div><button className="mb-6 flex items-center gap-2 text-sm" onClick={() => { setScreen('list'); setError(''); }}><ArrowLeft size={18} />Chapters</button><ChapterPreview chapter={draft} onSave={save} saved={saved} /></div>;
  if (screen === 'create') return <section className="space-y-7">
    <button className="flex items-center gap-2 text-sm" onClick={() => { setScreen('list'); setError(''); }}><ArrowLeft size={18} />Chapters</button>
    <h1 className="font-serif text-3xl italic">Make a chapter</h1>
    <div role="group" aria-label="Chapter period" className="flex rounded-full border border-input p-1">{(['Week', 'Month', 'Custom'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => { setMode(value); setError(''); }} className={`flex-1 rounded-full px-3 py-2 font-serif ${mode === value ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>{value}</button>)}</div>
    {mode === 'Custom' ? <div className="space-y-5"><label className="block space-y-2"><span>From</span><input type="date" value={from} max={to || today} onChange={e => setFrom(e.target.value)} className="w-full rounded-xl border border-input bg-transparent px-4 py-3" /></label><label className="block space-y-2"><span>To</span><input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} className="w-full rounded-xl border border-input bg-transparent px-4 py-3" /></label></div> : <p className="text-sm text-muted-foreground">{formatMomentDate(start)} – {formatMomentDate(end)}</p>}
    <div className="paper-panel rounded-2xl px-6 py-14 text-center"><span aria-hidden="true" className="font-serif text-5xl italic text-primary">a little afterglow</span><p className="mt-6 text-sm italic">A page of moments from your chosen dates.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button className={primaryButton} disabled={!valid || busy} onClick={generate}>{busy ? 'Gathering your moments…' : 'Generate chapter'}</button>
  </section>;
  return <section className="space-y-6"><h1 className="font-serif text-3xl">Your <em>chapters</em></h1><button className={`${primaryButton} flex items-center justify-center gap-2`} onClick={() => setScreen('create')}><Plus size={20} />Create a chapter</button>
    {chapters.isPending && <p role="status">Loading your chapters…</p>}
    {chapters.isError && <div role="alert"><p>Couldn't load chapters.</p><button className="mt-2 underline" onClick={() => chapters.refetch()}>Try again</button></div>}
    {chapters.data?.length === 0 && <p className="paper-panel rounded-2xl px-6 py-12 text-center text-muted-foreground">No chapters yet. Make one from any week or month.</p>}
    {chapters.data?.map(chapter => <SavedCard key={chapter.id} chapter={chapter} />)}
  </section>;
}

export function SavedChapterPage({ chapterId }: { chapterId: string }) {
  const chapter = useQuery({ queryKey: ['chapters', chapterId], queryFn: async () => {
    const { data, error } = await supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (!data.moment_ids.length) return { ...data, moments: [] };
    const { data: moments, error: momentError } = await supabase.from('moments').select('*').in('id', data.moment_ids);
    if (momentError) throw momentError;
    const byId = new Map((moments || []).map(m => [m.id, m]));
    return { ...data, moments: data.moment_ids.flatMap(id => { const m = byId.get(id); return m ? [m] : []; }) };
  } });
  return <div className="space-y-6"><Link to="/chapters" className="flex items-center gap-2 text-sm"><ArrowLeft size={18} />Chapters</Link>
    {chapter.isPending ? <p role="status">Loading your chapter…</p> : chapter.isError ? <div role="alert"><p>Couldn't load chapter.</p><button onClick={() => chapter.refetch()} className="underline">Try again</button></div> : !chapter.data ? <p>Chapter not found.</p> : <ChapterPreview chapter={chapter.data} saved />}
  </div>;
}
