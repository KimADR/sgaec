const DAY_MS = 24 * 60 * 60 * 1000;
const workflowStatuses = ['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED', 'REJECTED'];

function parseCivilDate(value) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Dates de période invalides.');

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1900) throw new Error('Dates de période invalides.');
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day) {
    throw new Error('Dates de période invalides.');
  }
  return parsed;
}

function civilDate(value) {
  return value.toISOString().slice(0, 10);
}

export function reportPeriod(startValue, endValue) {
  const startDay = parseCivilDate(startValue);
  const endDay = parseCivilDate(endValue);
  const days = (endDay.getTime() - startDay.getTime()) / DAY_MS;
  if (days < 0 || days > 365) {
    throw new Error('La période doit être ordonnée et ne pas dépasser 366 jours.');
  }

  const startAt = new Date(`${startValue}T00:00:00+03:00`);
  const endExclusiveDay = new Date(endDay.getTime() + DAY_MS);
  const endExclusive = new Date(`${civilDate(endExclusiveDay)}T00:00:00+03:00`);
  return { startAt, endExclusive, startDate: startValue, endDate: endValue };
}

export function summarizeWorkflowCounts(birthGroups, cinGroups, period, generatedAt = new Date()) {
  const births = new Map(birthGroups.map(({ status, _count }) => [status, _count._all]));
  const cin = new Map(cinGroups.map(({ status, _count }) => [status, _count._all]));
  const rows = workflowStatuses.map(status => {
    const birthCount = births.get(status) ?? 0;
    const cinCount = cin.get(status) ?? 0;
    return {
      status,
      births: birthCount,
      cin: cinCount,
      total: birthCount + cinCount,
    };
  });
  const birthTotal = rows.reduce((total, row) => total + row.births, 0);
  const cinTotal = rows.reduce((total, row) => total + row.cin, 0);

  return {
    start_date: period.startDate,
    end_date: period.endDate,
    generated_at: generatedAt.toISOString(),
    total: birthTotal + cinTotal,
    by_type: [
      { type: 'Naissance', total: birthTotal },
      { type: 'CIN', total: cinTotal },
    ],
    by_status: rows,
  };
}
