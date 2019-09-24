/*
 * @Auther: renjm
 * @Date: 2019-09-24 12:21:00
 * @LastEditTime: 2019-09-24 17:43:26
 * @Description: 
 */
const router = require('koa-router')()
const send = require('koa-send');
const config = require('../config.json')
const fs = require('fs')
const path = require('path');

router.get('/list', async (ctx, next) => {
  let files = fs.readdirSync('upload');
  files = files.map(file => ({
    fileName: file,
    downloadUrl: `${config.domin}?fileName=${file}`
  }));
  return ctx.body = { data: files }
})

router.post('/', async (ctx, next) => {
  const file = ctx.request.files.file;
  const reader = fs.createReadStream(file.path);
  const ext = file.name.split('.').pop();
  const originName = file.name.split('.').shift()
  const upStream = fs.createWriteStream(`upload/${originName}.${ext}`);
  reader.pipe(upStream);
  return ctx.body = '上传成功';
})

router.get('/', async (ctx, next) => {
  const { fileName } = ctx.request.query;
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
