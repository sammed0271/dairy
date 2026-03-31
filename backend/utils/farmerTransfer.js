const createTransferError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const validateFarmerTransferTargets = ({
  currentCentreId,
  targetCentreId,
}) => {
  if (!currentCentreId) {
    throw createTransferError(
      "Farmer is not assigned to a centre yet. Run centre backfill first.",
    );
  }

  if (!targetCentreId) {
    throw createTransferError("Target centre is required");
  }

  if (String(currentCentreId) === String(targetCentreId)) {
    throw createTransferError("Farmer is already assigned to this centre");
  }

  return true;
};