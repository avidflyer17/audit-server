/**
 * Utilities for parsing audit index files and navigating report timelines.
 *
 * @typedef {Object} Entry
 * @property {string} date - Date in YYYY-MM-DD format.
 * @property {string} time - Time in HH:MM format.
 * @property {string} path - Original path to the JSON report.
 * @property {number} ts - Numeric timestamp derived from date and time.
 */

const INDEX_REGEX = /^audit_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json$/;

/**
 * Parse raw index.json data into normalised entries.
 *
 * The list is deduplicated on date+time, keeping the first occurrence (latest file) and sorted by timestamp
 * descending.
 *
 * @param {string[]} list Raw paths from index.json
 * @returns {Entry[]} Normalised and sorted entries
 */
export function parseIndex(list = []) {
  const dedup = new Map();
  for (const path of list) {
    const match = INDEX_REGEX.exec(path);
    if (!match) continue;
    const date = match[1];
    const time = match[2].replace('-', ':');
    const key = `${date}T${time}`;
    if (dedup.has(key)) continue;
    const ts = new Date(`${date}T${time}:00`).getTime();
    dedup.set(key, { date, time, path, ts });
  }
  const entries = Array.from(dedup.values());
  entries.sort((a, b) => b.ts - a.ts);
  return entries;
}

/**
 * Return the latest entry from a list of entries.
 *
 * @param {Entry[]} entries
 * @returns {Entry | undefined}
 */
export function getLatest(entries = []) {
  return entries[0];
}

/**
 * Group entries by day, sorting each day's entries by time ascending.
 *
 * @param {Entry[]} entries List of entries sorted in any order
 * @returns {Map<string, Entry[]>} Map of YYYY-MM-DD to array of entries
 */
export function groupByDay(entries = []) {
  const grouped = new Map();
  for (const e of entries) {
    if (!grouped.has(e.date)) grouped.set(e.date, []);
    grouped.get(e.date).push(e);
  }
  for (const arr of grouped.values()) {
    arr.sort((a, b) => a.ts - b.ts);
  }
  return grouped;
}

/**
 * Find neighbouring entries around the current entry in a chronologically ascending list.
 *
 * @param {Entry[]} entries Entries sorted by timestamp ascending
 * @param {Entry} current Currently selected entry
 * @returns {{ prev?: Entry, next?: Entry }} Previous and next entries if available
 */
export function getNeighbors(entries = [], current) {
  const index = entries.findIndex((e) => e.path === current?.path);
  const result = {};
  if (index > 0) result.prev = entries[index - 1];
  if (index >= 0 && index < entries.length - 1) result.next = entries[index + 1];
  return result;
}

/**
 * Retrieve all entries for a given day.
 *
 * @param {Map<string, Entry[]>} grouped Grouped entries
 * @param {string} date Target date in YYYY-MM-DD
 * @returns {Entry[]} Entries for the day or an empty array
 */
export function getTimesForDay(grouped, date) {
  return grouped?.get(date) || [];
}
