module.exports.TRAVEL_STATE_REQUESTED = 'requested';
module.exports.TRAVEL_STATE_DRIVER_ACCEPTED = 'driver accepted';
module.exports.TRAVEL_STATE_RIDER_ACCEPTED = 'rider accepted';
module.exports.TRAVEL_STATE_STARTED = 'travel started';
module.exports.TRAVEL_STATE_FINISHED_CREDIT = 'travel finished credit';
module.exports.TRAVEL_STATE_FINISHED_CASH = 'travel finished cash';
module.exports.TRAVEL_ERROR_NO_DRIVER_FOUND = 'not found';
module.exports.TRAVEL_ERROR_DRIVER_CANCELED = 'driver canceled';
module.exports.TRAVEL_ERROR_RIDER_CANCELED = 'rider canceled';
module.exports = {
    getById: async function (travelId) {
        let result = await sql.query("SELECT * FROM travel WHERE id = ?", [travelId]);
        return result[0][0];
    },
    insert: async function (riderId, pickupPoint, destinationPoint, pickupAddress, destinationAddress, distanceBest, durationBest, costBest) {
        const travel = await sql.query("INSERT INTO travel (rider_id, pickup_point, destination_point, pickup_address, destination_address, distance_best, duration_best,cost_best) VALUES (?, ST_GeomFromText(?), ST_GeomFromText(?), ?, ?, ?, ?,?)", [riderId, getPointTextFromArray(pickupPoint), getPointTextFromArray(destinationPoint), pickupAddress, destinationAddress, distanceBest, durationBest, costBest]);
        return {
            'id': travel[0].insertId,
            'pickup_address': pickupAddress,
            'destination_address': destinationAddress,
            'pickup_point': pickupPoint,
            'destination_point': destinationPoint,
            'distance_best': distanceBest,
            'duration_best': durationBest,
            'cost_best': costBest
        }
    },
    getRiderId: async function (travelId) {
        let [result,ignored] = await sql.query("SELECT rider_id FROM travel WHERE id = ? ORDER BY id DESC LIMIT 1", [travelId]);
        return result[0].rider_id;
    },
    getRiderIdByDriverId: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT rider_id FROM travel WHERE driver_id = ? ORDER BY id DESC LIMIT 1", [driverId]);
        return result[0].rider_id;
    },
    getDriverIdByRiderId: async function (riderId) {
        let [result,ignored] = await sql.query("SELECT driver_id FROM travel WHERE rider_id = ? ORDER BY id DESC LIMIT 1", [riderId]);
        return result[0].driver_id;
    },
    getTravelIdByDriverId: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT id FROM travel WHERE driver_id = ? ORDER BY id DESC LIMIT 1", [driverId]);
        return result[0].id;
    },
    setState: async function (travelId, state) {
        let [result,ignored] = await sql.query("UPDATE travel SET status = ? WHERE id = ?", [state, travelId]);
        return result.affectedRows;
    },
    setDriver: async function (travelId, driverId) {
        let [result,ignored] = await sql.query("UPDATE travel SET status = 'rider accepted', driver_id = ? WHERE id = ?", [driverId, travelId]);
        return result.affectedRows;
    },
    start: async function (travelId) {
        let [result,ignored] = await sql.query("UPDATE travel SET status = ? WHERE id = ?", [this.TRAVEL_STATE_STARTED, travelId]);
        return result.affectedRows;
    },
    finish: async function (travelId, isPaidInCredit, cost, distance, time, log) {
        let [result,ignored] = await sql.query("UPDATE travel SET status = ?, cost = ?, duration_real = ?,distance_real = ?, log= ? WHERE id = ?", [isPaidInCredit ? this.TRAVEL_STATE_FINISHED_CREDIT : this.TRAVEL_STATE_FINISHED_CASH, cost, time, distance, log, travelId]);
        return result.affectedRows;
    },
    hideTravel: async function (travelId) {
        let result = await sql.query("UPDATE travel SET is_hidden = TRUE WHERE id = ?", [travelId]);
        return result[0].affectedRows === 1;
    }
};
