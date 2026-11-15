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
    {picture && (url ? <img src={url} crossOrigin="anonymous" alt={moment.title} className="aspect-square w-full rounded-sm object-cover" /> : <div className="flex aspect-square items-center justify-center bg-muted text-center text-sm text-muted-foreground">Picture unavailable</div>)}
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

/** Dedicated, fixed-canvas poster: never includes controls or private URLs as text. */
export function ChapterPoster({ chapter, urls }: { chapter: ChapterDraft; urls: Record<string, string> }) {
  return <div className="flex h-[1920px] w-[1080px] flex-col overflow-hidden bg-background p-16 text-foreground" style={{ fontSize: 26 }}>
    <p className="font-serif text-5xl italic">afterglow</p>
    <h1 className="mt-12 font-serif text-6xl italic">{chapter.title}</h1>
    <p className="mb-12 mt-5 text-2xl">{formatMomentDate(chapter.start_date)} – {formatMomentDate(chapter.end_date)}</p>
    <div className="grid flex-1 grid-cols-3 content-start gap-x-7 gap-y-10 [&_h3]:text-2xl [&_p]:text-lg">
      {chapter.moments.map((m, i) => <div key={m.id} style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}><ChapterTile moment={m} url={urls[m.id]} /></div>)}
    </div>
    <p className="mt-8 text-center font-serif text-2xl italic">Little moments, kept.</p>
  </div>;
}

export function ChapterPreview({ chapter, onSave, saved = false }: { chapter: ChapterDraft; onSave?: () => Promise<void>; saved?: boolean }) {
  const { urls, ready } = useChapterImages(chapter.moments);
  const poster = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shareFile, setShareFile] = useState<File | null>(null);
  const download = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const exportImage = async (share: boolean) => {
    if (!poster.current || !ready) return;
    setBusy(true); setError(''); setShareFile(null);
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(poster.current.querySelectorAll('img')).map(async img => {
        await img.decode();
        if (!img.naturalWidth) throw new Error('Image unavailable');
      }));
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(poster.current, { width: 1080, height: 1920, pixelRatio: 1, cacheBust: false });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${chapter.title.replace(/[^a-z0-9 -]/gi, '') || 'chapter'}.png`, { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [file] })) {
        // Rendering may consume transient user activation; offer a fresh share gesture if needed.
        try { await navigator.share({ files: [file] }); }
        catch (cause) {
          if (cause instanceof DOMException && cause.name === 'AbortError') return;
          setShareFile(file);
        }
      } else download(file);
    } catch { setError("Couldn't render your chapter. Try again."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-6">
    <header><h1 className="font-serif text-3xl italic">{chapter.title}</h1><p className="mt-2 text-sm text-muted-foreground">{formatMomentDate(chapter.start_date)} – {formatMomentDate(chapter.end_date)}</p></header>
    {!chapter.moments.length && <p>The moments in this chapter have been deleted.</p>}
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 py-3">{chapter.moments.map((m, i) => <div key={m.id} style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}><ChapterTile moment={m} url={urls[m.id]} /></div>)}</div>
    {onSave && <button className={primaryButton} disabled={busy || saved} onClick={async () => { setBusy(true); setError(''); try { await onSave(); } catch { setError("Couldn't save chapter. Try again."); } finally { setBusy(false); } }}>{saved ? 'Chapter saved' : 'Save chapter'}</button>}
    <div className="grid grid-cols-2 gap-3"><button className={outlineButton} disabled={busy || !ready} onClick={() => exportImage(false)}><Download size={18} />Download chapter</button><button className={outlineButton} disabled={busy || !ready} onClick={() => exportImage(true)}><Share2 size={18} />Share chapter</button></div>
    {shareFile && <button className={primaryButton} onClick={async () => { try { await navigator.share({ files: [shareFile] }); setShareFile(null); } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError("Couldn't share. Download your chapter instead."); } }}>Image ready — tap to share</button>}
    <p className="text-center text-sm">Save or share your chapter as an image.</p>
    {busy && <p role="status" className="text-center text-sm">Preparing your chapter…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div aria-hidden="true" className="pointer-events-none fixed left-[-12000px] top-0"><div ref={poster} className="h-[1920px] w-[1080px]"><ChapterPoster chapter={chapter} urls={urls} /></div></div>
  </section>;
}
