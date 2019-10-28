/*
 * @Auther: renjm
 * @Date: 2019-09-25 14:39:32
 * @LastEditTime: 2019-10-28 15:14:12
 * @Description: 
 */

const fs = require('fs-extra');
const _ = require('lodash')
const targz = require('targz');
module.exports.mkdirSync = async (dir) => {
    let index = 1;
    makeDir(dir, index);
    return
};


makeDir = (dir, index) => {
    let paths = dir.split('/');
    for (let i = 1; i < paths.length; i++) {
        let newPath = paths.slice(0, i).join('/');
        if (_.isEmpty(newPath)) {
            continue
        }
        try {
            fs.accessSync(newPath, fs.constants.R_OK);
        } catch (e) {
            fs.mkdirSync(newPath);
        }
    }
    console.log('done')
}


module.exports.fileChunkCheck = (chunksPath, total) => {
    const chunks = fs.readdirSync(chunksPath);
    if (chunks.length !== total || chunks.length === 0) {
        return true
    }
    return false
}

module.exports.fileMerge = async (chunksPath, filePath, total, hash) => {
    // 创建存储文件
    fs.writeFileSync(filePath, '');
    // 读取所有的chunks 文件名存放在数组中
    for (let i = 0; i < total; i++) {
        // 追加写入到文件中
        fs.appendFileSync(filePath, fs.readFileSync(chunksPath + hash + '-' + i));
        // 删除本次使用的chunk
        fs.unlinkSync(chunksPath + hash + '-' + i);
    }
    fs.rmdirSync(chunksPath);
}

// 解压缩
module.exports.fileDecompress = async (filePath, destPath) => {
    await targz.decompress({
        src: filePath,
        dest: destPath
    }, function (err) {
        if (err) {
            console.log(err);
        }
    });
}