const actionPriority = {
  create: 0,
  update: 1,
  sell: 2,
  installment: 3,
  delete: 4,
};

export const sortSyncQueueItems = (items = []) =>
  [...items].sort((left, right) => {
    const dateComparison = String(left.createdAt || "").localeCompare(
      String(right.createdAt || ""),
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (
      (actionPriority[left.action] ?? Number.MAX_SAFE_INTEGER) -
      (actionPriority[right.action] ?? Number.MAX_SAFE_INTEGER)
    );
  });