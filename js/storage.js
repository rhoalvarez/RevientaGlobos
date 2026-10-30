const KEY = "globoRush.ranking.v1";
export function getRanking() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
export function saveResult(result) {
  const row = {
    name: String(result.name || "Jugador").slice(0, 18),
    score: Math.max(0, Number(result.score) || 0),
    popped: Math.max(0, Number(result.popped) || 0),
    date: new Date().toISOString()
  };
  const ranking = [...getRanking(), row].sort((a,b) => b.score - a.score).slice(0, 30);
  try { localStorage.setItem(KEY, JSON.stringify(ranking)); } catch (e) { console.warn("No se pudo guardar el ranking", e); }
}
export function clearRanking() { localStorage.removeItem(KEY); }
