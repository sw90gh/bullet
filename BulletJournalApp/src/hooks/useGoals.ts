import { useState, useEffect, useCallback } from 'react';
import { Goal } from '../types';
import { uid } from '../utils/date';
import { loadData, saveData } from '../utils/storage';

const STORAGE_KEY = 'bujo-goals';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await loadData<Goal[]>(STORAGE_KEY, []);
      setGoals(data);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) saveData(STORAGE_KEY, goals);
  }, [goals, loaded]);

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    setGoals(prev => [...prev, { ...goal, id: uid() }]);
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  return { goals, loaded, addGoal, updateGoal, deleteGoal };
}
