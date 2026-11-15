# Delete chapters

## What you'll get
- A quiet "Delete chapter" link at the bottom of a saved chapter, under the Download and Share buttons, in the same style as "Delete moment".
- Tapping it asks "Delete this chapter?" and says the moments themselves are kept. You can Cancel or Delete.
- After deleting, you go back to your Chapters list and the chapter is gone. If deleting fails, you'll see "Couldn't delete. Try again." and stay on the chapter.
- Deleting a chapter never removes the photos, videos, voice notes or words inside it. Those stay on your wall.

## Technical details
- In SavedChapterPage, add a delete mutation (`supabase.from('chapters').delete().eq('id', chapterId)`) and a confirm dialog that reuses the existing Radix dialog styling. On success, invalidate the `['chapters']` queries and navigate to `/chapters`.
- No database change is needed: the existing owner-only access rule on chapters already allows people to delete their own chapters.
- Check in the browser, signed in: create a test chapter, delete it, and confirm it's gone from the list and its moments are still on the wall.
