global.GROUP_BY_DAY = 0;
global.GROUP_BY_WEEK = 1;
global.GROUP_BY_MONTH = 2;
const mysql = require("mysql2/promise");
let config = {
    connectionLimit: 100,
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    debug: false,
    multipleStatements: true
};
global.sql = mysql.createPool(config);
sql.query("SELECT id FROM operator", []).catch(async function (error) {
    console.log(error);
});
global.getDateFormat = function (dateColumnName, groupBy) {
    let colVal, group, dateWhereClause;
    switch (groupBy) {
        case GROUP_BY_DAY:
            //DATE format would be: 7, Oct
            colVal = "DATE_FORMAT(" + dateColumnName + ",'%e, %b')";
            group = "DATE(" + dateColumnName + ")";
            dateWhereClause = "DATEDIFF(NOW()," + dateColumnName + ") <= ?";
            break;
        case GROUP_BY_WEEK:
            //DATE format would be: W5, 2017
            colVal = "DATE_FORMAT(" + dateColumnName + ",'W%V, %X')";
            group = "YEAR(" + dateColumnName + "),WEEK(" + dateColumnName + ")";
            dateWhereClause = "(WEEK(NOW()) - WEEK(" + dateColumnName + ")) BETWEEN 0 AND ?";
            break;
        case GROUP_BY_MONTH:
            //DATE format would be: Jan, 2017
            colVal = "DATE_FORMAT(" + dateColumnName + ",'%b, %Y')";
            group = "YEAR(" + dateColumnName + "),MONTH(" + dateColumnName + ")";
            dateWhereClause = "(MONTH(NOW()) - MONTH(" + dateColumnName + ")) BETWEEN 0 AND ?";
            break;
    }
    return [colVal, group, dateWhereClause];
};
global.getPointTextFromArray= function (latLngArray) {
    return 'POINT (' + latLngArray.x + ' ' + latLngArray.y + ')';
};
module.exports = {
    getOneRow:async function(tableName,filters){
        let query = 'SELECT * FROM ' + tableName + ' WHERE ' + Object.entries(filters).map(x => x[0] + ' = ?').join(', ');
        let [result, ignored] = await sql.query(query, Object.values(filters));
        result = await this.attachForeignKey(result,foreignKeys[tableName]);
        return result[0];
    },
    getRows:async function(tableName,filters){
        let query = 'SELECT * FROM ' + tableName;
        if(Object.values(filters).length > 0)
            query += ' WHERE ' + Object.entries(filters).map(x => x[0] + ' = ?').join(', ');
        let [result, ignored] = await sql.query(query, Object.values(filters));
        result = await this.attachForeignKey(result,foreignKeys[tableName]);
        return result;
    },
    attachForeignKey: async function (rows,foreignKeys){
        try {
            for (let foreignKey in foreignKeys) {
                if (foreignKeys.hasOwnProperty(foreignKey)) {
                    for (let row of rows) {
                        if (!row[foreignKey] || row[foreignKey] === "")
                            continue;
                        let [foreignRow, ignored] = await sql.query("SELECT * FROM " + foreignKeys[foreignKey] + " WHERE id = ?", [row[foreignKey]]);
                        row[foreignKey.slice(0, -3)] = foreignRow[0];
                    }
                }
            }
            return rows;
        } catch(error) {
            throw error;
        }
    },
    getRowsCustom: async function (table, filers, sort, from, pageSize, fullTextFields, fullTextValue) {
        let query = '';
        let whereClauses = [];
        let queryArguments = [];
        if (fullTextValue !== "" && fullTextValue !== null)
            whereClauses.push(fullTextFields.join('|') + " LIKE '%" + fullTextValue + "%'");
        for (const filter in filers) {
            if (filers.hasOwnProperty(filter) && filers[filter] && filers[filter] !== '') {
                whereClauses.push(filter + " = ?");
                queryArguments.push(filers[filter]);
            }
        }
        if (whereClauses.length > 0)
            query += " WHERE " + whereClauses.join(" AND ");
        let [count, ignored2] = await sql.query("SELECT COUNT(id) AS count FROM " + table + query, queryArguments);
        count = count[0].count;
        if (count === 0)
            return [];
        let [result, ignored] = await sql.query("SELECT * FROM " + table + query + " ORDER BY " + sort.property + " " + sort.direction + " LIMIT ? OFFSET ?", queryArguments.concat([pageSize, from]));
        if(result.length > 0)
            result[0].count = count;
        return result;
    },
    updateRow: async function (tableName,row,id) {
        try {
            let query = 'UPDATE ' + tableName + ' SET ' + Object.entries(row).map(x => x[0] + ' = ?').join(', ') + " WHERE id = " + id;
            let [result, ignored] = await sql.query(query, Object.values(row));
            return result.affectedRows === 1;
        } catch (error) {
            throw error;
        }
    },

    insertRow: async function (tableName,rows) {
        let query = 'INSERT INTO ' + tableName  + '(' + Object.keys(rows).join(',') + ') VALUES (' + ''.padStart((Object.values(rows).length * 2) - 1,'?,') + ')';
        let [result,ignored] = await sql.query(query,Object.values(rows));
        return result.insertId;
    },
    deleteRows: async function (tableName, Ids) {
        try {
            let [result, ignored] = await sql.query("DELETE FROM " + tableName + " WHERE id IN (?)", [Ids]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    },
    deleteRowsCustom: async function (tableName, filter) {
        try {
            let [result, ignored] = await sql.query("DELETE FROM " + tableName + " WHERE " + Object.entries(filter).map(x => x[0] + ' = ?').join(', '), Object.values(filter));
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    },

    driver: require('./mysql/driver'),
    rider: require('./mysql/rider'),
    operator: require('./mysql/operator'),
    serverStats: require('./mysql/server-stat'),
    payments: require('./mysql/payment'),
    travel: require('./mysql/travel'),
    service: require('./mysql/service'),
    address: require('./mysql/address'),
    media: require('./mysql/media')
};