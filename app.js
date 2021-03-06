const Koa = require("koa");
const app = new Koa();
var cors = require("koa2-cors");
const views = require("koa-views");
const json = require("koa-json");
const onerror = require("koa-onerror");
const bodyparser = require("koa-bodyparser");
const logger = require("koa-logger");
const koaBody = require("koa-body");
const index = require("./routes/index");
const proxy = require("koa2-proxy-middleware");
const options = {
  targets: {
    "/hotpatch/(.*)": {
      // this is option of http-proxy-middleware
      target: "http://127.0.0.1:8080", // target host
      changeOrigin: true, // needed for virtual hosted sites
    },
    "/android/(.*)": {
      // this is option of http-proxy-middleware
      target: "http://127.0.0.1:8080", // target host
      changeOrigin: true, // needed for virtual hosted sites
    },
  },
};
// error handler
onerror(app);
app.use(
  koaBody({
    multipart: true,
    strict: false, // 针对 post ,其他请求不解析
    formidable: {
      maxFileSize: 500 * 1024 * 1024, // 设置上传文件大小最大限制，默认2M
    },
  })
);
// middlewares
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  })
);
app.use(json());
app.use(logger());

app.use(require("koa-static")(__dirname + "/public"));
app.use(cors());
app.use(
  views(__dirname + "/views", {
    extension: "pug",
  })
);

// logger
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});
app.use(proxy(options));
// routes
app.use(index.routes(), index.allowedMethods());
// error-handling
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

module.exports = app;
