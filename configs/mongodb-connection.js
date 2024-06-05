const { MongoClient } = require('mongodb');
// const uri = "mongodb+srv://<아이디>:<패스워드>@<클러스터정보>"
const uri = `mongodb+srv://${process.env.mongodb_ID}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}`;

module.exports = function (callback) {
    // uri로 MongoDB에 연결하고, 연결이 완료되면 콜백 함수를 호출
    return MongoClient.connect(uri, callback);
};