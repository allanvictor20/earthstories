import { useState, useCallback } from 'react';

export const CHAPTERS = [
  { id: 1, title: 'The World You Were Born Into',      chartType: 'none',    year_offset: 0  },
  { id: 2, title: 'Growing Up Together',               chartType: 'none',    year_offset: 5  },
  { id: 3, title: 'The Hidden Changes',                chartType: 'ndvi',    year_offset: 10 },
  { id: 4, title: 'Events That Shaped Your Home',      chartType: 'events',  year_offset: 15 },
  { id: 5, title: 'What Changed While You Were Alive', chartType: 'summary', year_offset: 20 },
];

export function useChapterState(birthYear) {
  const [state, setState] = useState({
    activeChapter: 1,
    activeYear: birthYear,
    chartType: 'none',
    photoVisible: true,
  });

  const onStepEnter = useCallback(({ element }) => {
    const chapter = parseInt(element.dataset.chapter);
    const offset  = parseInt(element.dataset.yearOffset || 0);
    const year    = Math.min(birthYear + offset, 2022);
    setState({
      activeChapter: chapter,
      activeYear:    year,
      chartType:     element.dataset.chart || 'none',
      photoVisible:  chapter === 1,
    });
  }, [birthYear]);

  return { state, onStepEnter };
}