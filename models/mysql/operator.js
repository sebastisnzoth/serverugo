module.exports = {
    authenticate: async function (userName, password) {
        let [result, ignored] = await sql.query("SELECT * FROM operator WHERE user_name = ? And password = ?", [userName, password]);
        if (result.length !== 1) {
            throw new Error(300);
        }
        else {
            result = result[0];
            result['media'] = await mysql.getOneRow('media',{id:result.media_id});
            return result;
        }
    },


    getAllCars: async function () {
        return sql.query("SELECT * FROM car", []);
    },
    getDriverReviews: async function (driverId) {
        return sql.query("SELECT rider.first_name,rider.last_name,driver_review.score,driver_review.review FROM driver_review LEFT JOIN rider ON rider.id = fk_rider WHERE driver_id = ?", [driverId]);
    },
    markComplaintsReviewed: async function (Ids) {
        return sql.query("UPDATE travel_complaint SET is_reviewed = true, time_review = NOW() WHERE id IN (?)", [Ids]);
    },
    setColumnValue: async function (table, id, column, value) {
        let [result, ignored] = await sql.query("UPDATE ? SET ? = ? WHERE id = ?", [table, column, value, id]);
        return result.affectedRows === 1;
    },
    updateOperatorPassword: function (operatorId, oldPass, newPass) {
        return sql.query("UPDATE operator SET password = ? WHERE password = ? AND id = ?", [newPass, oldPass, operatorId]);
    },
    getStatus: async function (operatorId) {
        let [result, ignored] = await sql.query("SELECT status FROM operator WHERE id = ?", [operatorId]);
        return result[0].status;
    },
    setStatus: async function (operatorId, status) {
        let [result, ignored] = await sql.query("UPDATE operator SET status = ? WHERE id = ?", [status, operatorId]);
        return result.rowsAffected;
    }
};