const paginator = require("../utils/paginator");
const { ObjectId } = require("mongodb");
const bcrypt = require('bcrypt');

/* ==================
   게시글 작성 함수
=================== */
async function writePost(collection, post, files) {
    const encryptedPassword = hashPassword(post.password); // 비밀번호 암호화
    post.hits = 0; // 조회수
    post.createdDt = new Date().toISOString(); // 생성 날짜
    post.files = files.map(file => file.filename); // 파일 리스트
    const result = await collection.insertOne({ ...post, password: encryptedPassword });
    post.password = undefined; // 응답에서 비밀번호 제거
    return result;
}

/* =====================
   게시글 목록 조회 함수
====================== */
async function list(collection, page, search) {
    const perPage = 10; // 페이지당 게시글 수
    const query = { title: new RegExp(search, "i") }; // 제목에 대한 검색어 설정 (대소문자 구분 없음)
    // 게시글 조회 및 페이징 설정
    const cursor = collection.find(query, { limit: perPage, skip: (page - 1) * perPage }).sort({createdDt: -1});
    const totalCount = await collection.count(query); // 전체 게시글 수
    const posts = await cursor.toArray(); // 게시글 리스트로 변환
    const paginatorObj = paginator({ totalCount, page, perPage: perPage }); // 페이지네이터 객체 생성
    return [posts, paginatorObj];
}

const projectionOption = {
    // 게시글과 댓글의 비밀번호 필드 제외
    projection: {
        password: 0,
        // "comments.password": 0
    }
};

/* =====================
   게시글 상세 조회 함수
====================== */
async function getDetailPost(collection, id) {
    const post = await collection.findOneAndUpdate(
        { _id: ObjectId.createFromHexString(id) },
        { $inc: { hits: 1 } }, projectionOption, // 조회수 증가
    );
    let filesList = "";
    if (post.files && post.files.length > 0) {
        // 파일 리스트 생성
        filesList = post.files.map(file => `<li><a href="/uploads/${file}" target="_blank">${file}</a></li>`).join("");
    }
    return post;
}

/* ====================================
  게시글 ID와 비밀번호로 게시글 조회 함수
===================================== */
async function getPostByIdAndPassword(collection, { id, password }) {
    const post = await collection.findOne(
        { _id: ObjectId.createFromHexString(id) },
        { projection: { password: 1 } } // 비밀번호 필드만 조회
        // projection 객체에서 1은 포함하고자 하는 필드를 나타내고, 0은 제외하고자 하는 필드
    );
    if (!post) return null;
    // 암호화된 비밀번호 확인
    const isPasswordMatch = comparePassword(password, post.password);
    if (!isPasswordMatch) return null;
    return post;
}

/* ===========================
  게시글 ID로 게시글 조회 함수
============================ */
async function getPostById(collection, id) {
    return await collection.findOne(
        { _id: ObjectId.createFromHexString(id) },
        projectionOption, 
    );
}

/* ==================
   게시글 수정 함수
=================== */
async function updatePost(collection, id, post) {
    
    // 비밀번호가 평문으로 제공되는 경우 암호화
    if (post.password && !post.password.startsWith('$2b$')) {
        post.password = hashPassword(post.password);
    }
    // 댓글의 비밀번호가 평문으로 제공되는 경우 암호화
    // if (post.comments) {
    //     post.comments = post.comments.map(comment => {
    //         if (comment.password && !comment.password.startsWith('$2b$')) {
    //             comment.password = hashPassword(comment.password);
    //         }
    //         return comment;
    //     });
    // }

    const toUpdatePost = { $set: post };
    post = await collection.updateOne(
        { _id: ObjectId.createFromHexString(id) }, 
        toUpdatePost
    );

    // 응답에서 비밀번호 제거
    post.password = undefined; 
    if (post.comments) {
        post.comments = post.comments.map(comment => ({
            ...comment, password: undefined
        }));
    }
    return post;
}

/* ================================================
  비밀번호를 암호화(hashing)하는 함수
  입력한 비밀번호와 부호화된 비밀번호를 비교하는 함수
================================================= */
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}
function comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
}

module.exports = {
    writePost, list, getDetailPost, 
    getPostByIdAndPassword, getPostById, updatePost,
    hashPassword, comparePassword
}