const DAY_IN_MS = 24 * 60 * 60 * 1000;

module.exports = (day_addition, callback) => {
  if (isNaN(day_addition) || !Number.isInteger(day_addition))
    return callback('bad_request');

  const today = new Date();
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);

  return callback(null, today + day_addition * DAY_IN_MS);
}
