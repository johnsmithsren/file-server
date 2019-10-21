/*
 * @Auther: renjm
 * @Date: 2019-09-24 12:21:00
 * @LastEditTime: 2019-10-21 15:21:24
 * @Description: 
 */
const router = require('koa-router')()
const send = require('koa-send');
const config = require('../config.json')
const fs = require('fs')
const base = require('../util/base')
const path = require('path');
const _ = require('lodash')
const pathToRegexp = require('path-to-regexp')
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

router.delete('/', async (ctx, next) => {
  const { fileName } = ctx.request.body;
  const path = `upload/${fileName}`
  fs.unlinkSync(path)
  return ctx.body = '删除成功';
})

module.exports = router
