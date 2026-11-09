export function parsePagination(query) {
  const page = parseInteger(query.page, 'page', 1, 1000, 1);
  const pageSize = parseInteger(query.page_size, 'page_size', 1, 100, 25);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function pageResult(items, total, pagination) {
  return {
    items,
    total,
    page: pagination.page,
    page_size: pagination.pageSize,
    total_pages: Math.ceil(total / pagination.pageSize),
  };
}

function parseInteger(value, name, minimum, maximum, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw validationError(`${name} doit être un entier.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw validationError(`${name} doit être compris entre ${minimum} et ${maximum}.`);
  }
  return parsed;
}

function validationError(message) {
  const error = new Error(message);
  error.status = 422;
  return error;
}
