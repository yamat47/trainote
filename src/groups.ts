// Consecutive items that belong together, by the caller's test: the groups of a day's
// entries, the months of a list of weights, the sets of one exercise.
export function runs<T>(items: T[], together: (a: T, b: T) => boolean): [T, ...T[]][] {
  const groups: [T, ...T[]][] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last !== undefined && together(last[0], item)) last.push(item);
    else groups.push([item]);
  }
  return groups;
}
