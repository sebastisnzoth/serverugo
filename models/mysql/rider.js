module.exports = {
    getProfile: async function (riderId) {
        let rider;
        if (riderId > 1000000)
            rider = (await this.authenticate(riderId));
        else
            rider = (await mysql.getOneRow('rider',{id:riderId}));
        return rider;
    },
    authenticate: async function (mobileNumber) {
        let result = await mysql.getOneRow('rider',{mobile_number:mobileNumber});
        if(!result) {
            await sql.query("INSERT INTO rider (mobile_number) VALUES (?)", [mobileNumber]);
            result = await mysql.getOneRow('rider',{mobile_number:mobileNumber});
        }
        return result;
    },
    setProfileImage: async function (riderId, fileName) {
        let [insertMediaResult,ignored] = await sql.query("INSERT INTO media (type,privacy_level,address) VALUES ('rider image','medium',?)",[fileName]);
        let [updateRiderResult,ignored2] = await sql.query("UPDATE rider SET media_id = ? WHERE id = ?",[insertMediaResult.insertId,riderId]);
        return updateRiderResult.affectedRows;
    },
    getProfileImage: async function (riderId) {
        let [result,ignored] = await sql.query("SELECT media.address FROM rider JOIN media ON rider.media_id = media.id WHERE rider.id = ?", [riderId]);
        return result[0].address;
    },
    getBalance: async function (riderId) {
        let [result,ignored] = await sql.query("SELECT balance FROM rider WHERE id = ?", [riderId]);
        return result[0].balance_amount;
    },
    payMoney: async function (riderId, amount) {
        return sql.query("UPDATE rider SET balance = balance - ? WHERE id = ?", [amount, riderId]);
    },
    updateInfoChangedStatus: async function (riderId, status) {
        return sql.query("UPDATE rider SET info_changed = ? WHERE id = ?", [status, riderId]);
    },
    getIsInfoChanged: async function (riderId) {
        let [result,ignored] = await sql.query("SELECT info_changed FROM rider WHERE id = ?", [riderId]);
        return (!!(result[0].info_changed));
    },
    chargeAccount:async function (riderId,amount){
        let [result, ignored] = await sql.query("UPDATE rider SET balance_amount = balance_amount + ? WHERE id = ?",[amount,riderId]);
        return result.rowsAffected;
    },
    valueChangedForAll: async function(){
        let [result, ignored] = await sql.query("UPDATE rider SET info_changed = TRUE");
        return result.rowsAffected;
    },
    writeComplaint: async function(travelId,subject,content){
        let [result,ignored] = await sql.query("INSERT INTO travel_complaint (fk_travel_id,subject,content) VALUES (?,?,?)",[travelId,subject,content]);
        return result.affectedRows;
    },
    getTravels: async function (riderId) {
        let result = await sql.query("SELECT * FROM travel WHERE rider_id = ? AND is_hidden = FALSE ORDER BY id desc LIMIT 50", [riderId]);
        return result[0];
    },
    getContactInformation: async function (riderId) {
        let [result,ignored] = await sql.query("SELECT travel.id as id, driver.last_name as driverName,driver.mobile_number AS driverNumber,rider.last_name as riderName,rider.mobile_number as riderNumber FROM travel INNER JOIN rider ON rider.id = travel.fk_rider INNER JOIN driver ON driver.id = travel.fk_driver WHERE fk_rider = ? ORDER BY travel.id DESC LIMIT 1", [riderId]);
        return result[0];
    }
};