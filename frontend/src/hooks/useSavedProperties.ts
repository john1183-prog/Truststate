import { useState, useEffect } from 'react';

const STORAGE_KEY = 'trust_estate_saved';

export const useSavedProperties = () => {
  const [saved, setSaved] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved]);

  const toggleSave = (id: number) => {
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const isSaved = (id: number) => saved.includes(id);

  return { saved, toggleSave, isSaved };
};
