module.exports = {
    driverHasPending: function (driverId) {
        return sql.query("SELECT id FROM payment_request WHERE driver_id = ? AND status = 'pending'", [driverId]);
    },
    getDriverUnpaidAmount: function (driverId) {
        let [result,ignored] = sql.query("SELECT credit,account_number FROM driver WHERE id = ?", [driverId]);
        return result[0];
    },
    requestPayment: function (driverId, amount, accountNumber) {
        return sql.query("INSERT INTO payment_request (fk_driver,amount,account_number) VALUES (?,?,?)", [driverId, amount, accountNumber])
    }
};