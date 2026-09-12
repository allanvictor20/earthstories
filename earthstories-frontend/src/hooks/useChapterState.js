import { useState, useCallback } from 'react';

// Chapter identity only. Year offsets and chart types live in StoryEngine.jsx,
// which is the single source of truth for both — they used to be duplicated
// here with conflicting values.
export const CHAPTERS = [
  { id: 1, title: 'The World You Were Born Into' },
  { id: 2, title: 'Growing Up Together' },
  { id: 3, title: 'The Hidden Changes' },
  { id: 4, title: 'Events That Shaped Your Home' },
  { id: 5, title: 'Your Story So Far' },
  { id: 6, title: 'Your Next Chapter' },
];

export function useChapterState(birthYear) {
  const [state, setState] = useState({
    activeChapter: 1,
    activeYear: birthYear,
    chartType: 'none',
  });

  const onStepEnter = useCallback(({ element }) => {
    const chapter = Number.parseInt(element.dataset.chapter, 10);
    const year = Number.parseInt(element.dataset.year, 10);
    setState({
      activeChapter: Number.isFinite(chapter) ? chapter : 1,
      activeYear: Number.isFinite(year) ? year : birthYear,
      chartType: element.dataset.chart || 'none',
    });
  }, [birthYear]);

  return { state, onStepEnter };
}
