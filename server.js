const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// 서버와 DB가 통신하는 방법
let db;
const url =
  "mongodb+srv://sbh2025dev_db_user:ZJgWipSJIgDw42MM@cluster0.v4ics3u.mongodb.net/?appName=Cluster0";
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB 연결성공");
    db = client.db("forum");

    app.listen(3000, () => {
      console.log("http://localhost:3000 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

// 누군가가 메인페이지를 요청했을 때 "hello world" 라는 문자열로 응답해준다.
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/index.html");
});

app.get("/login", (request, response) => {
  response.render("login", { error: null });
});

app.post("/login", async (request, response) => {
  try {
    const user = await db
      .collection("user")
      .findOne({ username: request.body.username });
    if (!user) {
      return response.render("login", {
        error: "사용자 이름이 존재하지 않습니다.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      request.body.password,
      user.password,
    );
    if (!isPasswordValid) {
      return response.render("login", {
        error: "비밀번호가 올바르지 않습니다.",
      });
    }

    request.session.userId = user._id; // 로그인 성공 시 세션에 사용자 ID 저장
    response.redirect("/list");
  } catch (err) {
    console.log(err);
    response.render("login", { error: "로그인 실패." });
  }
});

app.get("/register", (request, response) => {
  response.render("register", { error: null });
});

app.post("/register", async (request, response) => {
  try {
    const existingUser = await db
      .collection("user")
      .findOne({ username: request.body.username });

    if (existingUser) {
      return response.render("register", { error: "사용 중인 아이디입니다." });
    }

    const hash = await bcrypt.hash(request.body.password, 10);
    await db.collection("user").insertOne({
      username: request.body.username,
      password: hash,
    });
    response.redirect("/list");
  } catch (err) {
    console.log(err);
    response.render("register", { error: "Registration failed." });
  }
});

app.get("/shop", (request, response) => {
  // db.collection("post").insertOne(
  //   { name: "홍길동", age: 20, _id: 100 },
  //   (err, result) => {
  //     if (err) {
  //       console.log(err);
  //     }
  //   },
  // );
  response.sendFile(__dirname + "/shop.html");

  for (let i = 0; i < 3; i++) {
    console.log(i);
  }
});

app.get("/write", (request, response) => {
  response.render("write");
});

app.post("/write", async (request, response) => {
  await db.collection("post").insertOne({
    title: request.body.title,
    content: request.body.content,
  });
  response.redirect("/list");
});

app.get("/detail/:id", async (request, response) => {
  try {
    const post = await db
      .collection("post")
      .findOne({ _id: new ObjectId(request.params.id) });

    if (!post) return response.status(404).send("Post not found.");

    response.render("detail", { post });
  } catch (err) {
    console.log(err);

    response.status(500).send("Failed to load post.");
  }
});

app.get("/edit/:id", async (request, response) => {
  try {
    const post = await db
      .collection("post")
      .findOne({ _id: new ObjectId(request.params.id) });
    if (!post) return response.status(404).send("Post not found.");
    response.render("edit", { post });
  } catch (err) {
    console.log(err);
    response.status(500).send("Failed to load post.");
  }
});

app.post("/edit/:id", async (request, response) => {
  try {
    await db
      .collection("post")
      .updateOne(
        { _id: new ObjectId(request.params.id) },
        { $set: { title: request.body.title, content: request.body.content } },
      );
    response.redirect("/list");
  } catch (err) {
    console.log(err);
    response.status(500).send("Failed to update post.");
  }
});

app.delete("/post/:id", async (request, response) => {
  try {
    await db
      .collection("post")
      .deleteOne({ _id: new ObjectId(request.params.id) });
    response.json({ ok: true });
  } catch (err) {
    console.log(err);
    response.status(500).json({ ok: false });
  }
});

app.get("/list", async (request, response) => {
  // await: 다음 줄을 처리하기 전에 기다린다. DB에서 데이터를 가져오는 작업이 끝날 때까지 기다린다.
  let db_result = await db
    .collection("post")
    .find()
    .toArray((err, result) => {
      if (err) {
        console.log(err);
      }
    });
  // db_result는 array 형태로 DB에서 가져온 데이터를 담고 있다.
  // console.log(db_result[0].title);
  response.render("list", { posts: db_result });
});
