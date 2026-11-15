# Hide the bottom menu while searching

When the search bar is open, the bottom menu (My wall, Chapters, Settings) and the "+ Save a moment" button slide away. The search results get the full screen.

## How it behaves
- Tap the search icon at the top: the search bar opens and the bottom menu and Save button slide down out of view.
- They slide back when you leave search, either with the back arrow next to the search box or by tapping the search icon again.
- While you're searching or filtering, there's always a way out: the back arrow shows whenever the search bar is open, not just after you've typed something.
- Nothing else changes. Searching, filters and opening moments work the same as before.

## Check
At phone size: open search and confirm the menu and Save button are gone and the last result can be scrolled into view. Close search and confirm both return.

## Technical notes
- The wall already tracks whether search is open. It will announce open/closed to the page frame, which hides the bottom tabs with a short slide-down and removes the extra bottom space.
- The Save button lives on the wall itself, so it simply hides while search is showing.
- Leaving the wall resets the state, so the menu always shows on Chapters and Settings.
