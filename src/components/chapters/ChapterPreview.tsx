import { useEffect, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { signedUrl, formatMomentDate, type Moment } from '@/lib/moments';

export interface ChapterDraft { title: string; start_date: string; end_date: string; moments: Moment[]; }
export const primaryButton = 'w-full rounded-full bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50';
const outlineButton = 'flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-3 text-primary disabled:opacity-50';

export function ChapterTile({ moment, url, compact = false }: { moment: Moment; url?: string | undefined; compact?: boolean }) {
  const picture = !!(moment.photo_path || moment.video_path);
  return <article className="paper-panel relative min-w-0 rounded-md border border-card p-2 shadow-md">
    <span aria-hidden="true" className="absolute -top-2 left-1/3 h-5 w-16 -rotate-6 bg-accent/80" />
    {picture && (url ? <img src={url} alt={moment.title} className="aspect-square w-full rounded-sm object-cover" /> : <div className="flex aspect-square items-center justify-center bg-muted text-center text-sm text-muted-foreground">Picture unavailable</div>)}
    {!compact && <>
      {!picture && <p className="py-5 font-serif text-lg italic">{moment.audio_path ? `🎙 ${moment.audio_summary || moment.title}` : moment.body_text || moment.title}</p>}
      <h3 className="mt-2 break-words font-serif text-base leading-tight">{moment.title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{moment.emojis[0]} {formatMomentDate(moment.moment_date)}</p>
    </>}
    {compact && !picture && <p className="flex aspect-square items-center justify-center overflow-hidden p-2 text-center font-serif text-sm">{moment.title}</p>}
  </article>;
}

export function useChapterImages(moments: Moment[]) {
  const [state, setState] = useState<{ key: string; urls: Record<string, string> }>({ key: '', urls: {} });
  const key = moments.map(m => `${m.id}:${m.photo_path || m.video_poster_path || ''}`).join('|');
  useEffect(() => {
    let active = true;
    Promise.all(moments.map(async m => [m.id, await signedUrl(m.photo_path || m.video_poster_path)] as const))
      .then(entries => { if (active) setState({ key, urls: Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => !!entry[1])) }); });
    return () => { active = false; };
  }, [key]);
  return { urls: state.key === key ? state.urls : {}, ready: state.key === key };
}

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob); });
}

/** Poster mirrors the on-screen chapter (same 2-column layout), minus buttons and app chrome. */
export const POSTER_WIDTH = 430;
export function ChapterPoster({ chapter, urls }: { chapter: ChapterDraft; urls: Record<string, string> }) {
  return <div className="flex flex-col bg-background px-6 pb-8 pt-7 text-foreground" style={{ width: POSTER_WIDTH }}>
    <p className="font-serif text-2xl italic">afterglow</p>
    <h1 className="mt-6 font-serif text-3xl italic">{chapter.title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{formatMomentDate(chapter.start_date)} – {formatMomentDate(chapter.end_date)}</p>
    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 py-3">
      {chapter.moments.map((m, i) => <div key={m.id} style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}><ChapterTile moment={m} url={urls[m.id]} /></div>)}
    </div>
    <p className="mt-6 text-center font-serif text-base italic">Little moments, kept.</p>
  </div>;
}

export function ChapterPreview({ chapter, onSave, saved = false }: { chapter: ChapterDraft; onSave?: () => Promise<void>; saved?: boolean }) {
  const { urls, ready } = useChapterImages(chapter.moments);
  const poster = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inlined, setInlined] = useState<{ key: string; urls: Record<string, string> } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const urlKey = JSON.stringify(urls);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    Promise.all(Object.entries(urls).map(async ([id, u]) => { try { return [id, await toDataUrl(u)] as const; } catch { return null; } }))
      .then(e => { if (active) setInlined({ key: urlKey, urls: Object.fromEntries(e.filter((x): x is readonly [string, string] => !!x)) }); });
    return () => { active = false; };
  }, [ready, urlKey]);
  const posterUrls = inlined?.key === urlKey ? inlined.urls : null;
  useEffect(() => {
    if (!posterUrls) return;
    let active = true;
    setFile(null); setError('');
    (async () => {
      await document.fonts.ready;
      await new Promise(r => requestAnimationFrame(() => r(null)));
      const node = poster.current; if (!node) return;
      await Promise.all(Array.from(node.querySelectorAll('img')).map(img => img.decode().catch(() => {})));
      const { toBlob } = await import('html-to-image');
      const opts = { width: node.scrollWidth, height: node.scrollHeight, pixelRatio: 3, cacheBust: false };
      await toBlob(node, opts).catch(() => null); // warm-up: first Safari render can miss images
      const blob = await toBlob(node, opts);
      if (!blob) throw new Error('empty');
      if (active) setFile(new File([blob], `${chapter.title.replace(/[^a-z0-9 -]/gi, '').trim() || 'chapter'}.png`, { type: 'image/png' }));
    })().catch(() => { if (active) setError("Couldn't render your chapter. Try again."); });
    return () => { active = false; };
  }, [posterUrls, chapter.title]);
  const download = (f: File) => {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a'); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const share = async (f: File) => {
    setNotice(''); setError('');
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], title: chapter.title }); }
      catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError("Couldn't share. Download your chapter instead."); }
    } else { download(f); setNotice('Picture saved. Post it from your photos.'); }
  };
  const preparing = !file && !error;
  return <section className="space-y-6">
    <header><h1 className="font-serif text-3xl italic">{chapter.title}</h1><p className="mt-2 text-sm text-muted-foreground">{formatMomentDate(chapter.start_date)} – {formatMomentDate(chapter.end_date)}</p></header>
    {!chapter.moments.length && <p>The moments in this chapter have been deleted.</p>}
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 py-3">{chapter.moments.map((m, i) => <div key={m.id} style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}><ChapterTile moment={m} url={urls[m.id]} /></div>)}</div>
    {onSave && <button className={primaryButton} disabled={busy || saved} onClick={async () => { setBusy(true); setError(''); try { await onSave(); } catch { setError("Couldn't save chapter. Try again."); } finally { setBusy(false); } }}>{saved ? 'Chapter saved' : 'Save chapter'}</button>}
    <div className="grid grid-cols-2 gap-3"><button className={outlineButton} disabled={!file} onClick={() => { if (file) { setNotice(''); download(file); } }}><Download size={18} />Download</button><button className={outlineButton} disabled={!file} onClick={() => file && share(file)}><Share2 size={18} />Share</button></div>
    <p className="text-center text-sm">Save your chapter, or share it to Instagram, WhatsApp, Messages and more.</p>
    {preparing && <p role="status" className="text-center text-sm">Preparing your chapter image…</p>}
    {busy && <p role="status" className="text-center text-sm">Saving…</p>}
    {notice && <p role="status" className="text-center text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div aria-hidden="true" className="pointer-events-none fixed left-[-12000px] top-0"><div ref={poster} className="w-fit">{posterUrls && <ChapterPoster chapter={chapter} urls={posterUrls} />}</div></div>
  </section>;
}
