/*
 * @Auther: renjm
 * @Date: 2019-09-25 14:39:32
 * @LastEditTime: 2019-09-25 16:43:43
 * @Description: 
 */

const fs = require('fs')
const _ = require('lodash')
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