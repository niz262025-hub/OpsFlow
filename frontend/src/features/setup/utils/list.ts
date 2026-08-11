export function addUniqueListValue(list: string[], raw: string, caseInsensitive: boolean) {
  const value = raw.trim();
  if (!value) return { next: list, added: false, normalized: '' };
  const exists = caseInsensitive
    ? list.some((item) => item.toLowerCase() === value.toLowerCase())
    : list.includes(value);
  if (exists) return { next: list, added: false, normalized: value };
  return { next: [...list, value], added: true, normalized: value };
}

export function removeListValue(list: string[], value: string) {
  return list.filter((item) => item !== value);
}
