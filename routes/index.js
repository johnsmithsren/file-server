/*
 * @Auther: renjm
 * @Date: 2019-09-24 12:21:00
 * @LastEditTime: 2019-10-22 18:50:32
 * @Description: 
 */
const router = require('koa-router')()
const send = require('koa-send');
const config = require('../config.json')
const base = require('../util/base')
const path = require('path');
const _ = require('lodash')
const multer = require('koa-multer');
const fs = require('fs-extra');
const uploadPath = path.join(__dirname, '../hotpatch');
const uploadTempPath = path.join(uploadPath, 'temp');
const upload = multer({ dest: uploadTempPath });
const targz = require('targz');
const getFileList = (startPath) => {
  let result = [];
  function finder(filePath) {
    let files = fs.readdirSync(filePath);
    files.forEach((val, index) => {
      if (val === ".DS_Store") {
        return
      }
      let fPath = path.join(filePath, val);
      let stats = fs.statSync(fPath);
      if (stats.isDirectory()) { finder(fPath); }
      if (stats.isFile()) { result.push(fPath.slice(9)); }
    });
  }
  finder(startPath);
  return result;

}
router.get('/', async (ctx, next) => {
  return ctx.body = "欢迎来到文件服务"
})

router.post('/list', async (ctx, next) => {
  let files = getFileList('hotpatch');
  files = files.map(file => ({
    fileName: file,
    downloadUrl: `${config.domin}/hotpatch/${file}`
  }));
  return ctx.body = { data: files }
})

router.post('/', async (ctx, next) => {
  const file = ctx.request.files.file;
  const reader = fs.createReadStream(file.path);
  if (_.endsWith(file.name, 'tar.gz')) {
    targz.decompress({
      src: file.path,
      dest: path.resolve(__dirname, '../', 'hotpatch')
    }, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Done!");
      }
    });
  } else {
    const ext = file.name.split('.').pop();
    const originName = file.name.split('.').slice(0, file.name.split('.').length - 1).join('.')
    if (originName === '') {
      originName = file.name
    }
    if (originName.indexOf('/') > -1) {
      await base.mkdirSync(path.resolve(__dirname, '../', 'hotpatch', file.name))
    }
    const upStream = fs.createWriteStream(`hotpatch/${originName}.${ext}`);
    reader.pipe(upStream);
  }
  return ctx.body = '上传成功';
})

router.get(/hotpatch\/(.*)$/, async (ctx, next) => {
  const fileName = ctx.params[0];
  if (fileName) {
    const path = `hotpatch/${fileName}`
    ctx.attachment(path);
    await send(ctx, path);
  } else {
    ctx.body = []
  }

})


router.post('/file/upload', upload.single('file'), async (ctx, next) => {
  // 根据文件hash创建文件夹，把默认上传的文件移动当前hash文件夹下。方便后续文件合并。
  const {
    index,
    hash
  } = ctx.request.body;
  const chunksPath = path.join(uploadPath, hash, '/');
  if (!fs.existsSync(chunksPath)) {
    await base.mkdirSync(chunksPath);
  }
  fs.renameSync(ctx.request.files.file.path, chunksPath + hash + '-' + index);
  return ctx.body = '分片上传成功';
})

router.post('/file/merge_chunks', async (ctx, next) => {
  const {
    size, name, total, hash
  } = ctx.request.body;
  const chunksPath = path.join(uploadPath, hash, '/');
  const filePath = path.join(uploadPath, name);
  let checkResult = base.fileChunkCheck(chunksPath, total)
  if (checkResult) {
    ctx.status = 200;
    ctx.res.end('切片文件数量不符合');
  } else {
    await base.fileMerge(chunksPath, filePath, total, hash)
  }
  // 针对gz文件处理，解压缩。
  if (_.endsWith(name, 'tar.gz')) {
    let destPath = path.resolve(__dirname, '../', 'hotpatch')
    base.fileDecompress(filePath, destPath)
  }
  ctx.status = 200;
  ctx.res.end('分片文件合并完成');
})


router.delete('/', async (ctx, next) => {
  const { fileName } = ctx.request.body;
  const path = `hotpatch/${fileName}`
  fs.unlinkSync(path)
  return ctx.body = '删除成功';
})

module.exports = router
