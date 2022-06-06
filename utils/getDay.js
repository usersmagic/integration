const DAY_IN_MS = 24 * 60 * 60 * 1000;

module.exports = (day_addition, callback) => {
  if (isNaN(day_addition) || !Number.isInteger(day_addition))
    return callback('bad_request');

  return callback(null, getUnixTimeForThisStartOfDay() + day_addition * DAY_IN_MS);
}

function getUnixTimeForThisStartOfDay() {
  let today = new Date();
  today.setHours(0, 0, 0);
  return today;
}
