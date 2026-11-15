import { createFileRoute } from '@tanstack/react-router';
import { SavedChapterPage } from '@/components/chapters/ChaptersPage';
export const Route = createFileRoute('/_authenticated/chapters_/$chapterId')({
  head: () => ({ meta: [{ title: 'Your chapter — afterglow' }, { name: 'description', content: 'A private collection of your good moments.' }] }),
  component: Page,
});
function Page() {
  const { chapterId } = Route.useParams();
  return <SavedChapterPage chapterId={chapterId} />;
}
