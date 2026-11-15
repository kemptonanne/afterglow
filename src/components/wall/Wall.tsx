import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, CalendarDays, ChevronDown, Mic, Pause, Play, Plus, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cardType, formatMomentDate, MEDIA_BUCKET, momentKeys, signedUrl, type Moment } from '@/lib/moments';
import { SaveMomentSheet } from '@/components/SaveMomentSheet';
import { useServerFn } from '@tanstack/react-start';
import { requestTranscription } from '@/lib/transcribe.functions';
import { transcriptView } from '@/lib/transcriptView';

const types = ['text', 'photo', 'audio', 'video'] as const;
type Media = typeof types[number];
export type WallSearch = { q: string; media: Media[]; emojis: string[]; from: string; to: string };
const validDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : '';
export function validateWallSearch(input: Partial<WallSearch>): WallSearch {
  const s = input as Record<string, unknown>;
  const list = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [];
  return { q: typeof s['q'] === 'string' ? s['q'] : '', media: list(s['media']).filter((x): x is Media => types.includes(x as Media)), emojis: list(s['emojis']), from: validDate(s['from']), to: validDate(s['to']) };
}
const empty: WallSearch = { q: '', media: [], emojis: [], from: '', to: '' };
const pill = 'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring';
function useMedia(path: string | null) {
  return useQuery({ queryKey: ['moment-media', path], queryFn: () => signedUrl(path), enabled: !!path, staleTime: 45 * 60_000 }).data;
}
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function AudioPlayer({ path, duration }: { path: string; duration: number | null }) {
  const url = useMedia(path), ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false), [time, setTime] = useState(0), [length, setLength] = useState(duration || 0), [error, setError] = useState('');
  useEffect(() => { const audio = ref.current; return () => { audio?.pause(); }; }, []);
  return <div onClick={e => e.stopPropagation()} className="space-y-2">
    <audio ref={ref} src={url || undefined} preload="metadata" onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration)) setLength(e.currentTarget.duration); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError('Couldn’t play this recording. Try again.')} />
    <div className="flex items-center gap-3"><button type="button" disabled={!url} aria-label={playing ? 'Pause recording' : 'Play recording'} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" onClick={() => { if (playing) ref.current?.pause(); else void ref.current?.play().catch(() => setError('Couldn’t play this recording. Try again.')); }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
    <div className="flex h-9 min-w-0 flex-1 items-center gap-0.5 text-primary" aria-hidden="true">{Array.from({length: 42}, (_, i) => <span key={i} className="flex-1 rounded-full bg-current" style={{height: `${15 + ((i * 17 + i * i) % 75)}%`, opacity: i / 42 <= time / (length || 1) ? 1 : 0.4}} />)}</div><span className="text-xs tabular-nums">{clock(time)} / {clock(length)}</span></div>
    <input aria-label="Seek recording" type="range" min={0} max={length || 1} step={0.1} value={time} className="w-full accent-primary" onChange={e => { if(ref.current) ref.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }}/>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
function Entry({ moment: m, open }: { moment: Moment; open: () => void }) {
  const type = cardType(m), image = useMedia(type === 'photo' ? m.photo_path : type === 'video' ? m.video_poster_path : null);
  const excerpt = m.body_text?.trim().split('\n')[0];
  return <article className="min-w-0 border-b py-8 first:pt-2">
    <button type="button" onClick={open} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label={`Open ${m.title}`}>
      {(type === 'photo' || type === 'video') && <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden bg-sage">{image ? <img src={image} alt="" loading="lazy" className="size-full object-cover"/> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{type === 'video' ? 'Video' : 'Photo'}</div>}{type === 'video' && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs text-foreground"><Play size={12}/>Video</span>}</div>}
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">{formatMomentDate(m.moment_date)}{type === 'voice' && <span className="inline-flex items-center gap-1 normal-case tracking-normal"><Mic size={12}/>Voice note</span>}</p>
      <h2 className="mt-2 break-words font-serif text-3xl leading-tight text-foreground">{m.title}</h2>
      {excerpt && <p className="mt-3 line-clamp-3 break-words leading-relaxed text-foreground/80">{excerpt}</p>}
      {m.emojis.length > 0 && <p className="mt-4 flex flex-wrap gap-2">{m.emojis.map((e, i) => <span key={`${e}-${i}`} className="rounded-full bg-sage px-2.5 py-0.5 text-base">{e}</span>)}</p>}
    </button>
  </article>;
}
function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return <Dialog.Root open onOpenChange={v => { if (!v) close(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40"/><Dialog.Content aria-describedby={undefined} className="paper-panel fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-md overflow-y-auto rounded-t-3xl p-6 focus:outline-none"><div className="mb-5 flex items-center justify-between gap-3"><Dialog.Title className="font-serif text-2xl">{title}</Dialog.Title><Dialog.Close className="rounded-full p-2" aria-label="Close"><X size={20}/></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function MomentOverlay({ initial, close }: { initial: Moment; close: () => void }) {
  const client = useQueryClient(), [confirm, setConfirm] = useState(false), [enlarged, setEnlarged] = useState(false);
  const {data: m = initial} = useQuery({ queryKey: momentKeys.detail(initial.id), initialData: initial, queryFn: async () => { const {data,error} = await supabase.from('moments').select('*').eq('id', initial.id).single(); if(error) throw error; return data; }, refetchInterval: q => q.state.data && transcriptView(q.state.data) === 'pending' ? 4000 : false });
  const photo = useMedia(m.photo_path), video = useMedia(m.video_path), poster = useMedia(m.video_poster_path);
  const deletion = useMutation({ mutationFn: async () => { const paths = [m.photo_path,m.video_path,m.video_poster_path,m.audio_path].filter((p): p is string => !!p); if(paths.length) { const {error} = await supabase.storage.from(MEDIA_BUCKET).remove([...new Set(paths)]); if(error) throw error; } const {error} = await supabase.from('moments').delete().eq('id',m.id); if(error) throw error; }, onSuccess: async () => { await client.invalidateQueries({queryKey: momentKeys.all}); close(); } });
  return <Dialog.Root open onOpenChange={v => { if(!v && !deletion.isPending) close(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40"/><Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-50 mx-auto max-w-md overflow-y-auto bg-background p-5 focus:outline-none">
    <button className="mb-5 flex items-center gap-2 text-sm" onClick={close} disabled={deletion.isPending}><ArrowLeft size={20}/>Back to my wall</button><Dialog.Title className="font-serif text-3xl">{m.title}</Dialog.Title><p className="my-3 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays size={16}/>{formatMomentDate(m.moment_date)}</p><div className="mb-6 flex flex-wrap gap-2">{m.emojis.map((e,i) => <span key={`${e}-${i}`} className="rounded-full border px-3 py-1 text-xl">{e}</span>)}</div>
    <div className="space-y-6">{m.photo_path && (photo ? <button className="block w-full" aria-label="Enlarge photo" onClick={() => setEnlarged(true)}><img src={photo} alt={m.title} className="w-full rounded-lg"/></button> : <p>Loading photo…</p>)}
    {m.video_path && (video ? <video key={video} controls playsInline preload="metadata" src={video} poster={poster || undefined} className="w-full rounded-lg"/> : <p>Loading video…</p>)}
    {m.audio_path && <div className="paper-panel rounded-xl p-4"><AudioPlayer path={m.audio_path} duration={m.audio_duration_seconds}/><VoiceText m={m}/></div>}
    {m.body_text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body_text}</p>}</div>
    <button onClick={() => setConfirm(true)} className="mt-12 w-full py-4 text-sm text-muted-foreground underline">Delete moment</button>
    {confirm && <Modal title="Delete this moment?" close={() => {if(!deletion.isPending) setConfirm(false);}}><p>This can't be undone.</p>{deletion.isError && <p role="alert" className="mt-3 text-destructive">Couldn’t delete. Try again.</p>}<div className="mt-6 flex justify-end gap-3"><button disabled={deletion.isPending} className={pill} onClick={() => setConfirm(false)}>Cancel</button><button disabled={deletion.isPending} className={`${pill} bg-primary text-primary-foreground`} onClick={() => deletion.mutate()}>{deletion.isPending ? 'Deleting…' : 'Delete'}</button></div></Modal>}
    {enlarged && photo && <Dialog.Root open onOpenChange={setEnlarged}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/90"/><Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"><Dialog.Title className="sr-only">{m.title} photo</Dialog.Title><Dialog.Close aria-label="Close enlarged photo" className="absolute right-4 top-4 rounded-full bg-background p-3"><X/></Dialog.Close><img src={photo} alt={m.title} className="max-h-[85dvh] max-w-full object-contain"/></Dialog.Content></Dialog.Portal></Dialog.Root>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function VoiceText({ m }: { m: Moment }) {
  const client = useQueryClient(), transcribe = useServerFn(requestTranscription);
  const retry = useMutation({ mutationFn: () => transcribe({ data: { momentId: m.id } }), onMutate: () => client.setQueryData(momentKeys.detail(m.id), { ...m, transcription_status: 'pending', created_at: new Date().toISOString() }), onSettled: () => client.invalidateQueries({ queryKey: momentKeys.all }) });
  const view = retry.isPending ? 'pending' : transcriptView(m);
  return <>
    {m.audio_summary && <p className="mt-3 font-serif italic">{m.audio_summary}</p>}
    {view === 'pending' && <p role="status" className="mt-3 text-sm italic text-muted-foreground">Writing it down…</p>}
    {view === 'failed' && <div role="alert" className="mt-3 flex items-center justify-between gap-3 text-sm"><span>Couldn’t write this one down.</span><button className={`${pill} border border-primary text-primary`} onClick={() => retry.mutate()}>Try again</button></div>}
    {view === 'too_large' && <p className="mt-3 text-sm text-muted-foreground">This recording is too long to write down, but it’s saved.</p>}
    {view === 'done' && m.transcript && <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Transcript</summary><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{m.transcript}</p></details>}
  </>;
}
function DateSheet({ search, update, close }: {search: WallSearch; update: (s: WallSearch) => void; close: () => void}) {
  const [from,setFrom] = useState(search.from), [to,setTo] = useState(search.to);
  const invalid = !!(from && to && to < from);
  return <Modal title="Filter by date" close={close}><div className="space-y-4"><label className="flex items-center justify-between gap-4">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="min-w-0 rounded-full border bg-transparent px-4 py-2"/></label><label className="flex items-center justify-between gap-4">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="min-w-0 rounded-full border bg-transparent px-4 py-2"/></label>{invalid && <p role="alert" className="text-sm text-destructive">End date must be on or after the start date</p>}<button disabled={invalid} className={`${pill} w-full bg-primary text-primary-foreground disabled:opacity-50`} onClick={() => {update({...search,from,to});close();}}>Apply dates</button><button className="w-full text-sm underline" onClick={() => {update({...search,from:'',to:''});close();}}>Clear dates</button></div></Modal>;
}
export function Wall({ search, update }: { search: WallSearch; update: (s: WallSearch) => void }) {
  const [selected,setSelected] = useState<Moment | null>(null), [save,setSave] = useState(false), [filter,setFilter] = useState<'media'|'emojis'|'date'|null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [searchOpen,setSearchOpen] = useState(false);
  useEffect(() => { const on = () => setSearchOpen(v => !v); window.addEventListener('afterglow:search', on); return () => window.removeEventListener('afterglow:search', on); }, []);
  const active = !!(search.q || search.media.length || search.emojis.length || search.from || search.to);
  const query = useInfiniteQuery({
    queryKey: [...momentKeys.all,'wall',search], initialPageParam: 0,
    queryFn: async ({pageParam}) => {
      let q = supabase.from('moments').select('*',{count:'exact'}).order('moment_date',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false});
      if(search.q.trim()) {
        // Quote the PostgREST value to keep commas/parentheses out of the logic grammar.
        const term = search.q.trim().replace(/\\/g,'\\\\').replace(/%/g,'\\%').replace(/_/g,'\\_').replace(/"/g,'\\"');
        const pattern = `"%${term}%"`;
        q = q.or(`title.ilike.${pattern},body_text.ilike.${pattern},transcript.ilike.${pattern}`);
      }
      if(search.media.length) q = q.or(search.media.map(t => ({text:'and(photo_path.is.null,video_path.is.null,audio_path.is.null)',photo:'photo_path.not.is.null',audio:'audio_path.not.is.null',video:'video_path.not.is.null'})[t]).join(','));
      if(search.emojis.length) q = q.overlaps('emojis',search.emojis);
      if(search.from) q = q.gte('moment_date',search.from);
      if(search.to) q = q.lte('moment_date',search.to);
      const {data,error,count} = await q.range(pageParam,pageParam+23); if(error) throw error;
      return {rows:data,count:count || 0,offset:pageParam};
    },
    getNextPageParam: last => last.offset + last.rows.length < last.count ? last.offset + last.rows.length : undefined,
  });
  const emojis = useQuery({queryKey:[...momentKeys.all,'used-emojis'],queryFn: async () => {
    const used = new Set<string>(); let offset = 0;
    for (;;) { const {data,error} = await supabase.from('moments').select('emojis,id').order('id').range(offset,offset+999); if(error) throw error; data.forEach(m => m.emojis.forEach(e => used.add(e))); if(data.length < 1000) break; offset += data.length; }
    return [...used].sort();
  }});
  useEffect(() => {
    const node = sentinel.current; if(!node) return;
    const observer = new IntersectionObserver(entries => { if(entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage && !query.isFetchNextPageError) void query.fetchNextPage(); },{rootMargin:'300px'});
    observer.observe(node); return () => observer.disconnect();
  },[query.hasNextPage,query.isFetchingNextPage,query.isFetchNextPageError,query.fetchNextPage]);
  const moments = query.data?.pages.flatMap(p => p.rows) || [];
  const toggle = (kind: 'media'|'emojis', value: string) => {
    if(kind === 'media') {const v = value as Media; update({...search,media:search.media.includes(v) ? search.media.filter(x => x !== v) : [...search.media,v]});}
    else update({...search,emojis:search.emojis.includes(value) ? search.emojis.filter(x => x !== value) : [...search.emojis,value]});
  };
  return <section className="pb-36" aria-label="My wall">
    {(searchOpen || active) && <div className="mb-6 border-b pb-5"><div className="flex items-center gap-2">{active && <button aria-label="Back to my wall" onClick={() => update(empty)} className="p-2"><ArrowLeft size={20}/></button>}<div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border px-4 py-2"><Search size={18} className="shrink-0 text-muted-foreground"/><input aria-label="Search your moments" placeholder="Search your moments" value={search.q} onChange={e => update({...search,q:e.target.value})} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>{search.q && <button aria-label="Clear search" onClick={() => update({...search,q:''})}><X size={16}/></button>}</div></div>
    <div className="mt-3 flex flex-wrap gap-2">{(['media','emojis','date'] as const).map(f => <button key={f} className={`${pill} capitalize`} onClick={() => setFilter(f)}>{f}<ChevronDown size={14}/></button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{search.media.map(t => <button key={t} className={`${pill} bg-primary text-primary-foreground`} onClick={() => toggle('media',t)} aria-label={`Remove ${t} filter`}>{t}<X size={12}/></button>)}{search.emojis.map(e => <button key={e} className={`${pill} bg-primary text-primary-foreground`} onClick={() => toggle('emojis',e)} aria-label={`Remove ${e} filter`}>{e}<X size={12}/></button>)}{(search.from || search.to) && <button className={`${pill} bg-primary text-primary-foreground`} onClick={() => update({...search,from:'',to:''})}>{search.from || 'Any date'} – {search.to || 'Any date'}<X size={12}/></button>}</div></div>}
    {active && !query.isPending && <div className="my-5 flex justify-between text-xs text-muted-foreground"><span>{query.data?.pages[0]?.count || 0} moments</span><span>Newest first</span></div>}
    {query.isPending ? <p role="status" className="py-16 text-center text-muted-foreground">Loading your moments…</p> : query.isError ? <div role="alert" className="py-12 text-center"><p>Couldn’t load your moments.</p><button className={`${pill} mt-4`} onClick={() => void query.refetch()}>Try again</button></div> : !moments.length ? <div className="py-16 text-center"><h1 className="text-2xl">{active ? 'No moments match' : 'No moments yet'}</h1>{!active && <><p className="mt-3 text-sm text-muted-foreground">Save one good thing from today or this week.</p><button onClick={() => setSave(true)} className={`${pill} mt-6 bg-primary text-primary-foreground`}><Plus size={18}/>Save a moment</button></>}</div> : <div className="flex flex-col">{moments.map(m => <Entry key={m.id} moment={m} open={() => setSelected(m)}/>)}</div>}
    <div ref={sentinel} className="h-4"/>{query.hasNextPage && <button className={`${pill} mx-auto mt-5 flex`} disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : query.isFetchNextPageError ? 'Try loading more again' : 'Load more'}</button>}
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-20 mx-auto flex max-w-md justify-end px-5"><button onClick={() => setSave(true)} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-moss-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Plus size={16}/>Save a moment</button></div>
    <SaveMomentSheet open={save} onOpenChange={setSave}/>
    {selected && <MomentOverlay key={selected.id} initial={selected} close={() => setSelected(null)}/>}
    {filter === 'date' && <DateSheet search={search} update={update} close={() => setFilter(null)}/>}
    {(filter === 'media' || filter === 'emojis') && <Modal title={filter === 'media' ? 'Filter by media' : 'Filter by emojis'} close={() => setFilter(null)}><div className="flex flex-wrap gap-3">{(filter === 'media' ? types : emojis.data || []).map(v => <button key={v} aria-pressed={filter === 'media' ? search.media.includes(v as Media) : search.emojis.includes(v)} className={`${pill} ${(filter === 'media' ? search.media.includes(v as Media) : search.emojis.includes(v)) ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => toggle(filter,v)}>{v}</button>)}</div>{filter === 'emojis' && (emojis.isPending ? <p>Loading emojis…</p> : emojis.isError ? <button onClick={() => void emojis.refetch()}>Couldn’t load emojis. Try again.</button> : !emojis.data?.length ? <p>No emojis used yet.</p> : null)}<button className={`${pill} mt-6 w-full bg-primary text-primary-foreground`} onClick={() => setFilter(null)}>Done</button></Modal>}
  </section>;
}
