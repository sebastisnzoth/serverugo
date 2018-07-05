global.DRIVER_STATE_OFFLINE = "offline";
global.DRIVER_STATE_ONLINE = "online";
global.DRIVER_STATE_IN_SERVICE = "in service";
global.TIME_QUERY_DAILY = 1;
global.TIME_QUERY_WEEKLY = 2;
global.TIME_QUERY_MONTHLY = 3;
module.exports = {
    updateInfoChangedStatus: async function (driverId, status) {
        return sql.query("UPDATE driver SET info_changed = ? WHERE id = ?", [status, driverId]);
    },
    getIsInfoChanged: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT info_changed FROM driver WHERE id = ?", [driverId]);
        return (!!result[0].info_changed);
    },
    getProfile: async function (driverId) {
        let driver;
        if (driverId > 1000000)
            driver = (await this.authenticate(driverId));
        else
            driver = (await mysql.getOneRow('driver',{id:driverId}));
        if (driver === null)
            return null;
        driver['min_pay'] = process.env.MINIMUM_AMOUNT_TO_REQUEST_PAYMENT;
        return driver;
    },
    markPaymentRequestsPaid: async function (Ids) {
        let [ignored, ignored2, driverIds] = await Promise.all([
            sql.query("UPDATE driver LEFT JOIN payment_request ON driver.id = payment_request.driver_id SET driver.balance = driver.balance - payment_request.amount WHERE payment_request.id IN (?)", [Ids]),
            sql.query("UPDATE payment_request SET status = 'paid', paid_date = NOW() WHERE id IN (?)", [Ids]),
            sql.query("SELECT driver_id FROM payment_request WHERE id IN (?)", [Ids])]
        );
        return driverIds[0].map(x => x.driver_id);
    },
    addCredit: async function (driverId, amount) {
        await sql.query("UPDATE driver SET balance = balance + ? WHERE id = ?", [amount, driverId]);
        return true;

    },
    setState: async function (driverId, state) {
        let [credit,ignored] = await sql.query("SELECT balance FROM driver WHERE id = ?", [driverId]);
        if (credit[0].balance < 0) {
            return false;
        }
        await sql.query("UPDATE driver SET status = ? WHERE id = ?", [state, driverId]);
        return true;
    },
    authenticate: async function (mobileNumber) {
        let result = await mysql.getOneRow('driver',{mobile_number:mobileNumber});
        if (!result) {
            await sql.query("INSERT INTO driver (mobile_number) VALUES (?)", [mobileNumber]);
            result = await mysql.getOneRow('driver',{mobile_number:mobileNumber});
        }
        return result;

    },
    getRating: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT review_count, rating FROM driver WHERE id = ?", [driverId]);
        return result[0];
    },
    updateScore: async function (driverId, score) {
        let rating = await this.getRating(driverId);
        /** @namespace rating.review_count */
        /** @namespace rating.rating */
        let reviewCount = rating.review_count + 1;
        let newScore = (score - rating.rating) / reviewCount;
        return sql.query("UPDATE driver SET review_count = ?, rating = rating + ? WHERE id = ?", [reviewCount, newScore, driverId]);
    },
    saveReview: async function (riderId, driverId, review, score) {
        return sql.query("INSERT INTO driver_review (fk_rider,fk_driver,review,score) VALUES (?,?,?,?)", [riderId, driverId, review, score]);
    },
    getProfileImage: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT driver_image FROM driver WHERE id = ?", [driverId]);
        return result[0].driver_image;
    },
    getHeaderImage: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT car_image FROM driver WHERE id = ?", [driverId]);
        return result[0].car_image;
    },
    setProfileImage: async function (driverId, fileName) {
        return sql.query("UPDATE driver SET driver_image = ? WHERE id = ?", [fileName, driverId]);
    },
    setHeaderImage: async function (driverId, fileName) {
        return sql.query("UPDATE driver SET car_image = ? WHERE id = ?", [fileName, driverId]);
    },
    getDailyStats: async function (driverId) {
        return sql.query("SELECT SUM(cost) as amount, COUNT(id) as services, AVG(rating) as rating from travel WHERE DATE(request_time) = DATE(NOW()) AND driver_id = ? GROUP BY DATE(request_time)", [driverId]);
    },
    getDailyReport: async function (driverId) {
        return sql.query("SELECT DATE(request_time) as date,SUM(cost) as amount from travel WHERE DATEDIFF(NOW(),request_time) < 7 AND driver_id = ? GROUP BY DATE(request_time)", [driverId]);
    },
    getWeeklyStats: async function (driverId) {
        return sql.query("SELECT SUM(cost) as amount, COUNT(id) as services, AVG(rating) as rating from travel WHERE DATE(request_time) >= DATE(SUBDATE(NOW(), WEEKDAY(NOW()))) AND driver_id = ?", [driverId]);
    },
    getWeeklyReport: async function (driverId) {
        return sql.query("SELECT GROUP_CONCAT(YEAR(request_time),',W',WEEK(request_time)) AS date, SUM(cost) as amount from travel WHERE driver_id = ? GROUP BY YEAR(request_time), WEEK(request_time)", [driverId]);
    },
    getMonthlyStats: async function (driverId) {
        return sql.query("SELECT SUM(cost) as amount, COUNT(id) as services, AVG(rating) as rating from travel WHERE DATE(request_time) >= DATE(SUBDATE(NOW(), DAYOFMONTH(NOW()))) AND driver_id = ?", [driverId]);
    },
    getMonthlyReport: async function (driverId) {
        return sql.query("SELECT GROUP_CONCAT(YEAR(request_time),'-',MONTH(request_time)) AS date, SUM(cost) as amount from travel WHERE DATE(request_time) > DATE(MAKEDATE(year(now()),1)) AND driver_id = ? GROUP BY YEAR(request_time), MONTH(request_time)", [driverId]);
    },
    chargeAccount: async function (driverId, amount) {
        await sql.query("UPDATE driver SET credit = credit + ? WHERE id = ?", [amount, driverId]);
        return true;
    },
    getTransactions: async function (driverId) {
        let [rows, ignored] = await sql.query("SELECT * FROM driver_transaction WHERE driver_id = ?", [driverId]);
        return rows;
    },
    getTravels: async function (driverId) {
        let result = await sql.query("SELECT * FROM travel WHERE driver_id = ? AND is_hidden = FALSE ORDER BY id desc LIMIT 50", [driverId]);
        return result[0];
    },
    writeComplaint: async function(travelId,subject,content){
        let result = await sql.query("INSERT INTO travel_complaint (fk_travel_id,fk_complaint_type_driver_id,subject,content) VALUES (?,?,?,?)",[travelId,1,subject,content]);
        return result[0].affectedRows;
    },
    getContactInformation: async function (driverId) {
        let [result,ignored] = await sql.query("SELECT travel.id as id, driver.last_name as driverName,driver.mobile_number AS driverNumber,rider.last_name as riderName,rider.mobile_number as riderNumber FROM travel INNER JOIN rider ON rider.id = travel.fk_rider INNER JOIN driver ON driver.id = travel.fk_driver WHERE driver_id = ? ORDER BY travel.id DESC LIMIT 1", [driverId]);
        return result[0];
    },
    getDriversWithService: async function(drivers,serviceId) {
        let [result,ignored] = await sql.query("SELECT driver_id FROM driver_service WHERE driver_id IN (?) AND service_id = ?",[drivers,serviceId]);
        return result.map(x => x.driver_id);
    }
};

