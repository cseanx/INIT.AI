/** Human-readable report scope without repeating the city name when the
 *  stored area label already contains it (e.g. "Manila (District)"). */
export function reportScope(report: {
    city?: string | null;
    coverage?: string | null;
    area?: string | null;
}): string {
    const city = report.city?.trim() ?? '';
    const coverage = report.coverage?.trim() ?? '';
    const area = report.area?.trim() ?? '';
    const areaRepeatsCity =
        !!area && !!city && area.toLowerCase().includes(city.toLowerCase());
    return [city, coverage, areaRepeatsCity ? '' : area].filter(Boolean).join(' · ') || '—';
}

/** "2026-08-04" + "2026-08-31" → "4 Aug – 31 Aug 2026". */
export function reportPeriod(
    start?: string | null,
    end?: string | null,
    fallback = '—',
): string {
    if (!start || !end) return fallback;
    const parse = (value: string) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? new Date(`${value}T00:00:00`)
            : new Date(value);
    const startDate = parse(start);
    const endDate = parse(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return `${start} – ${end}`;
    }
    const startLabel = startDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(startDate.getFullYear() !== endDate.getFullYear()
            ? { year: 'numeric' as const }
            : {}),
    });
    const endLabel = endDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    return `${startLabel} – ${endLabel}`;
}
