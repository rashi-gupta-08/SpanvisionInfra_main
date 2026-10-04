import { useEffect, useState } from 'react';

/** Tijdelijke viewportkeuze; overschrijft nooit opgeslagen paneelvoorkeuren. */
export function useNarrowWorkspace(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => setNarrow(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}
