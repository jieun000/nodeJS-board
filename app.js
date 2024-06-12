const express = require("express");
const handlebars = require("express-handlebars");
const { ObjectId } = require("mongodb");
const session = require('express-session');
const multer = require('multer');
const mongodbConnection = require("./configs/mongodb-connection");
const postService = require("./services/post-service");
let collection; // MongoDB 컬렉션 초기화
let collection_comment;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(
    session({
      secret: 'very-important-secret', 
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 60000 }
    })
);

// 파일 업로드(Multer 저장소) 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // 파일명 앞에 타임스탬프 추가
        cb(null, `${Date.now()}-${file.originalname}`); 
    }
});
const upload = multer({ storage: storage });

// 핸들바 엔진 설정
app.engine(
    "hbs", 
    handlebars.create({ 
        extname: '.hbs',
        helpers: require("./configs/handlebars-helpers"),
    }).engine,
);
app.set("view engine", "hbs"); // 웹페이지 로드 시 사용할 템플릿 엔진 설정
app.set("views", __dirname + "/views"); // 뷰 디렉터리를 views로 설정
// 정적 파일 경로 설정
app.use("/statics", express.static(__dirname + "/statics"));
app.use('/uploads', express.static('uploads'));

const boardTitle = "우리 게시판"; // 게시판 이름

// 메인 페이지 라우트 설정
app.get("/", async(req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    try {
        const [posts, paginator] = await postService.list(collection, page, search);
        res.render("home", { title: boardTitle, search, paginator, posts });
    } catch(error) {
        console.error(error);
        res.render("home", { title: boardTitle });
    }
});

// 글 작성 페이지 라우트
app.get("/write", (req, res) => {
    res.render("write", { title: boardTitle, mode: "create" });
});

// 글 작성 라우트
app.post("/write", upload.array('files'), async (req, res) => {
    const post = req.body;
    const files = req.files;
    const result = await postService.writePost(collection, post, files);
    res.redirect(`/detail/${result.insertedId}`);
});

// 글 수정 페이지 라우트
app.get("/modify/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!req.session.passwordVerified || req.session.postId !== id) {
            return res.status(401).send("올바른 절차를 통한 접근 바랍니다.");
        }
        const post = await postService.getPostById(collection, id);
        if (!post) {
            throw new Error("게시물을 찾을 수 없습니다.");
        }
        res.render("write", { title: boardTitle, mode: "modify", post });
    } catch (error) {
        console.error("게시물 수정 페이지 렌더링 중 에러 발생:", error);
        res.send("게시물을 찾을 수 없습니다.");
    }
});

// 글 수정 라우트
app.post("/modify/", upload.array('files'), async (req, res) => {
    let postId;
    try {
        const { id, title, writer, password, content } = req.body;
        postId = id;
        let post = { title, writer, password, content, createdDt: new Date().toISOString() };
        let files = req.files.map(file => file.filename);
        if (files.length > 0) {
            post.files = files;
        }
        const result = await postService.updatePost(collection, id, post);
        if (result.ok === 0) {
            throw new Error("포스트 수정 중 문제가 발생하였습니다.");
        }
        res.redirect(`/detail/${id}`);
    } catch(error) {
        console.error("포스트 수정 중 에러 발생:", error);
        res.redirect(`/modify/${postId}?error=수정 요청이 실패하였습니다.`);
    }
});

// 글 삭제 라우트
app.delete("/delete", async(req, res) => {
    const { id, password } = req.body;
    try {
        const post = await collection.findOne({ _id: ObjectId.createFromHexString(id) });
        if (!post) {
            return res.status(404).json({ isSuccess: false, message: "게시글을 찾을 수 없습니다." });
        }
        
        // 비밀번호 확인
        const isPasswordMatch = postService.comparePassword(password, post.password)
       if (!isPasswordMatch) {
            return res.status(401).json({ isSuccess: false, message: "비밀번호가 일치하지 않습니다." });
        } 

        // 게시글 삭제
        const result = await collection.deleteOne({ _id: ObjectId.createFromHexString(id) });
        if (result.deletedCount !== 1) {
            console.log("삭제 실패");
            return res.json({ isSuccess: false, message: "삭제된 게시글이 없습니다." });
        }
        // 해당 게시글의 댓글 모두 삭제
        await collection_comment.deleteMany({ postId: ObjectId.createFromHexString(id) });

        return res.json({ isSuccess: true });
    } catch(error) {
        console.error(error);
        return res.json({ isSuccess: false, message: "삭제 중 오류가 발생했습니다." });
    }
});



// 글 상세 페이지 라우트
app.get("/detail/:id", async (req, res) => {
    const postId = ObjectId.createFromHexString(req.params.id);
    const post = await postService.getDetailPost(collection, req.params.id);
    const comments = await collection_comment.find({ postId }).toArray(); // 관련 댓글 조회
    post.comments = comments;
    res.render("detail", { title: boardTitle, post });
});

// 비밀번호 확인 라우트
app.post("/check-password", async (req, res) => {
    const { id, password } = req.body;
    req.session.passwordVerified = true;
    req.session.postId = id;
    const post = await postService.getPostByIdAndPassword(collection, { id, password });
    if(!post) {
        return res.status(404).json({ isExist: false });
    }
    return res.json({ isExist: true, passowrd: post.passowrd });
});

// 댓글 작성 라우트
app.post("/write-comment", async (req, res) => {
    const { id, name, password, comment } = req.body;
    const hashedPassword = postService.hashPassword(password); // 비밀번호 암호화
    
    const newComment = {
        postId: ObjectId.createFromHexString(id), // 게시글 ID
        name, 
        password: hashedPassword,
        comment, 
        createdDt: new Date().toISOString()
    };
    await collection_comment.insertOne(newComment);

    await collection.updateOne( // 게시물의 댓글 수 + 1
        { _id: ObjectId.createFromHexString(id) },
        { $inc: { commentCount: 1 } }
    );

    return res.redirect(`/detail/${id}`);
});

// 댓글 삭제 라우트
app.delete("/delete-comment", async (req, res) => {
    const { id, commentId, password } = req.body;
    const comment = await collection_comment.findOne({ 
        postId: ObjectId.createFromHexString(id),
        _id: ObjectId.createFromHexString(commentId)
    });
    if (!comment) {
        return res.json({ isSuccess: false });
    }
    const isPasswordMatch = postService.comparePassword(password, comment.password);
    if (!isPasswordMatch) {
        return res.json({ isSuccess: false });
    }

    await collection_comment.deleteOne({
        postId: ObjectId.createFromHexString(id),
        _id: ObjectId.createFromHexString(commentId)
    });

    // 게시물의 댓글 수 - 1
    await collection.updateOne(
        { _id: ObjectId.createFromHexString(id) },
        { $inc: { commentCount: -1 } }
    );

    return res.json({ isSuccess: true });
});
  
// 서버 시작 및 MongoDB 연결
app.listen(3000, async() => {
    console.log("Server started.");
    const mongoClient = await mongodbConnection();
    collection = mongoClient.db().collection("post"); // 컬렉션(게시물 테이블) 지정
    collection_comment = mongoClient.db().collection("postComment"); // 컬렉션(댓글 테이블) 지정
    console.log("MongoDB connected.");
});