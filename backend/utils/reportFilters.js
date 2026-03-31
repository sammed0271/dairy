const createReportError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const normalizeDateRange = (query = {}) => {
  const { from, to } = query;

  if (!from || !to) {
    throw createReportError("From and To required");
  }

  return {
    from: String(from),
    to: String(to),
  };
};

export const normalizeOptionalDateRange = (query = {}) => {
  const filter = {};
  const { from, to } = query;

  if (from || to) {
    filter.timestamp = {};

    if (from) {
      filter.timestamp.$gte = new Date(`${from}T00:00:00.000Z`);
    }

    if (to) {
      filter.timestamp.$lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  return {
    from: from ? String(from) : null,
    to: to ? String(to) : null,
    filter,
  };
};

export const applyMilkReportFilters = (base = {}, query = {}) => {
  const filter = { ...base };
  const { shift, milkType } = query;

  if (shift && shift !== "all") {
    filter.shift = String(shift).toLowerCase();
  }

  if (milkType && milkType !== "all") {
    filter.milkType = String(milkType);
  }

  return filter;
};