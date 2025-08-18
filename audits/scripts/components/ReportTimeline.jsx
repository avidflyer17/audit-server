import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  parseIndex,
  getLatest,
  groupByDay,
  getNeighbors,
  getTimesForDay,
} from '../modules/timeline.js';

/**
 * ReportTimeline component displays audit reports on a horizontal timeline.
 *
 * Props:
 * - indexUrl: URL to the index.json file
 * - onSelect: function(entry) called when a report is selected
 * - onChangeDay: function(date) called when day selection changes
 * - onRefetch: optional callback when refetch happens
 *
 * The component exposes a focusLatest() method via ref that scrolls the timeline
 * to the latest report and selects its day.
 */
const ReportTimeline = forwardRef(function ReportTimeline(
  { indexUrl, onSelect, onChangeDay, onRefetch },
  ref,
) {
  const [entries, setEntries] = useState([]); // all entries sorted desc
  const [grouped, setGrouped] = useState(new Map());
  const [latest, setLatest] = useState();
  const [current, setCurrent] = useState();
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const timelineRef = useRef(null);

  const fetchIndex = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(indexUrl);
      if (!res.ok) throw new Error('Network response was not ok');
      const list = await res.json();
      const parsed = parseIndex(list);
      const groupedMap = groupByDay(parsed);
      setEntries(parsed);
      setGrouped(groupedMap);
      const latestEntry = getLatest(parsed);
      setLatest(latestEntry);
      if (!selectedDate && latestEntry) setSelectedDate(latestEntry.date);
      setLoading(false);
      return parsed;
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les rapports');
      setLoading(false);
      return [];
    }
  };

  useEffect(() => {
    fetchIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexUrl]);

  const handleSelect = (entry) => {
    setCurrent(entry);
    onSelect?.(entry);
  };

  const setDay = (day) => {
    setSelectedDate(day);
    onChangeDay?.(day);
  };

  const handleRefetch = async () => {
    const prev = current?.path;
    const parsed = await fetchIndex();
    if (prev) {
      const keep = parsed.find((e) => e.path === prev);
      if (keep) {
        setCurrent(keep);
        setDay(keep.date);
      }
    }
    onRefetch?.();
  };

  const handlePrevNext = (dir) => {
    if (!current) return;
    const asc = entries.slice().reverse();
    const { prev, next } = getNeighbors(asc, current);
    const target = dir === -1 ? prev : next;
    if (target) {
      setDay(target.date);
      handleSelect(target);
    }
  };

  const focusLatest = () => {
    if (!latest) return;
    setDay(latest.date);
    const el = timelineRef.current?.querySelector(
      `[data-path="${latest.path}"]`,
    );
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  };

  useImperativeHandle(ref, () => ({ focusLatest }));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const dayEntries = getTimesForDay(grouped, selectedDate);

  return (
    <div className="report-timeline">
      <div className="latest-card">
        <div className="latest-info">
          <div className="title">Dernier rapport</div>
          {latest && (
            <div className="meta">
              {latest.time} — {latest.date}
            </div>
          )}
        </div>
        <div className="actions">
          <button
            className="btn-open"
            onClick={() => latest && handleSelect(latest)}
            aria-label="Ouvrir le dernier rapport"
          >
            Ouvrir
          </button>
          <button
            className="btn-refresh"
            onClick={handleRefetch}
            aria-label="Rafraîchir"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="controls">
        <button
          className="nav"
          onClick={() => handlePrevNext(-1)}
          aria-label="Rapport précédent"
          disabled={!current || entries.length <= 1}
        >
          ◀︎
        </button>
        <div className="day-select">
          <button
            className={selectedDate === today ? 'active' : ''}
            onClick={() => setDay(today)}
          >
            Aujourd'hui
          </button>
          <button
            className={selectedDate === yesterday ? 'active' : ''}
            onClick={() => setDay(yesterday)}
          >
            Hier
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setDay(e.target.value)}
            aria-label="Choisir une date"
          />
        </div>
        <button
          className="nav"
          onClick={() => handlePrevNext(1)}
          aria-label="Rapport suivant"
          disabled={!current || entries.length <= 1}
        >
          ▶︎
        </button>
      </div>

      {loading && <div className="status loading">Chargement…</div>}
      {error && !loading && (
        <div className="status error">
          {error} <button onClick={fetchIndex}>Réessayer</button>
        </div>
      )}
      {!loading && !error && dayEntries.length === 0 && (
        <div className="status empty">Aucun rapport…</div>
      )}

      {!loading && !error && dayEntries.length > 0 && (
        <div className="timeline" ref={timelineRef} role="list">
          {dayEntries.map((e) => (
            <button
              key={e.path}
              role="listitem"
              data-path={e.path}
              className={`dot${current?.path === e.path ? ' active' : ''}${latest?.path === e.path ? ' latest' : ''}`}
              onClick={() => handleSelect(e)}
              title={e.time}
              aria-label={`Rapport de ${e.time}`}
            >
              <span className="sr-only">{e.time}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ReportTimeline;
