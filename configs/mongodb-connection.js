const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoId = process.env.MONGODB_ID;
const mongoPw = process.env.MONGODB_PASSWORD;
const cluster = process.env.MONGODB_CLUSTER;
const dbname = process.env.MONGODB_DBNAME;

// const uri = "mongodb+srv://<아이디>:<패스워드>@<클러스터정보>"
const uri = `mongodb+srv://${mongoId}:${mongoPw}@${cluster}/?retryWrites=true&w=majority&appName=${dbname}`;

module.exports = function (callback) {
    // uri로 MongoDB에 연결하고, 연결이 완료되면 콜백 함수를 호출
    return MongoClient.connect(uri, callback);
};