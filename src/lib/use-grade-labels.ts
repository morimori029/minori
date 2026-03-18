import { useState, useEffect } from "react";

export type GradeItem = { code: string; label: string; sortOrder: number };

export const DEFAULT_GRADES: GradeItem[] = [
  { code: "S", label: "秀", sortOrder: 0 },
  { code: "A", label: "優", sortOrder: 1 },
  { code: "B", label: "良", sortOrder: 2 },
  { code: "X", label: "規格外", sortOrder: 3 },
];

const CACHE_KEY = "minori_grade_labels";
const CACHE_TTL = 5 * 60 * 1000; // 5分

function readCache(): GradeItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: GradeItem[]; ts: number };
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: GradeItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // プライベートブラウジング等でlocalStorageが使えない場合は無視
  }
}

export function invalidateGradeCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}

// グレード一覧を返す（localStorageキャッシュ付き、5分間有効）
export function useGradeLabels(): GradeItem[] {
  const [grades, setGrades] = useState<GradeItem[]>(() => readCache() ?? DEFAULT_GRADES);

  useEffect(() => {
    const cached = readCache();
    if (cached) { setGrades(cached); return; }

    fetch("/api/grade-labels")
      .then(r => r.ok ? r.json() : null)
      .then((data: GradeItem[] | null) => {
        if (Array.isArray(data) && data.length > 0) {
          setGrades(data);
          writeCache(data);
        }
      })
      .catch(() => {});
  }, []);

  return grades;
}

// code → label のマップを返す
export function useGradeLabelMap(): Record<string, string> {
  const grades = useGradeLabels();
  return Object.fromEntries(grades.map(g => [g.code, g.label]));
}
