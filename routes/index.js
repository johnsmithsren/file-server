/*
 * @Auther: renjm
 * @Date: 2019-09-24 12:21:00
 * @LastEditTime: 2019-10-22 16:21:53
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
const uploadPath = path.join(__dirname, '../upload');
const uploadTempPath = path.join(uploadPath, 'temp');
const upload = multer({ dest: uploadTempPath });
var targz = require('targz');
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
      if (stats.isFile()) { result.push(fPath.slice(7)); }
    });
  }
  finder(startPath);
  return result;

}
router.get('/', async (ctx, next) => {
  return ctx.body = "欢迎来到文件服务"
})

router.post('/list', async (ctx, next) => {
  let files = getFileList('upload');
  files = files.map(file => ({
    fileName: file,
    downloadUrl: `${config.domin}/download/${file}`
  }));
  return ctx.body = { data: files }
})

router.post('/', async (ctx, next) => {
  const file = ctx.request.files.file;
  const reader = fs.createReadStream(file.path);
  if (_.endsWith(file.name, 'tar.gz')) {
    // let dirName = _.get(file.name.split('.'), '0')
    // let dirPath = path.resolve(__dirname, '../upload', dirName)
    // if (dirName && fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    //   return ctx.body = '该gz文件已经上传，请检查';
    // }
    targz.decompress({
      src: file.path,
      dest: path.resolve(__dirname, '../', 'upload')
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
    if (originName.indexOf('/') > -1) {
      await base.mkdirSync(path.resolve(__dirname, '../', 'upload', file.name))
    }
    const upStream = fs.createWriteStream(`upload/${originName}.${ext}`);
    reader.pipe(upStream);
  }
  return ctx.body = '上传成功';
})

router.get(/download\/(.*)$/, async (ctx, next) => {
  const fileName = ctx.params[0];
  if (fileName) {
    const path = `upload/${fileName}`
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
  return ctx.body = '上传成功';
})

router.post('/file/merge_chunks', async (ctx, next) => {
  const {
    size, name, total, hash
  } = ctx.request.body;
  // 根据hash值，获取分片文件。
  // 创建存储文件
  // 合并
  const chunksPath = path.join(uploadPath, hash, '/');
  const filePath = path.join(uploadPath, name);
  // 读取所有的chunks 文件名存放在数组中
  const chunks = fs.readdirSync(chunksPath);
  // 创建存储文件
  fs.writeFileSync(filePath, '');
  if (chunks.length !== total || chunks.length === 0) {
    ctx.status = 200;
    ctx.res.end('切片文件数量不符合');
    return;
  }
  for (let i = 0; i < total; i++) {
    // 追加写入到文件中
    fs.appendFileSync(filePath, fs.readFileSync(chunksPath + hash + '-' + i));
    // 删除本次使用的chunk
    fs.unlinkSync(chunksPath + hash + '-' + i);
  }
  fs.rmdirSync(chunksPath);
  // 文件合并成功，可以把文件信息进行入库。
  if (_.endsWith(name, 'tar.gz')) {
    targz.decompress({
      src: filePath,
      dest: path.resolve(__dirname, '../', 'upload')
    }, function (err) {
      if (err) {
        console.log(err);
      } else {
        fs.unlinkSync(filePath)
        console.log("Done!");
      }
    });
  }
  ctx.status = 200;
  ctx.res.end('合并成功');
})


router.delete('/', async (ctx, next) => {
  const { fileName } = ctx.request.body;
  const path = `upload/${fileName}`
  fs.unlinkSync(path)
  return ctx.body = '删除成功';
})

module.exports = router
