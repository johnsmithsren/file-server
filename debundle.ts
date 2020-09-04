/*
 * @Auther: renjm
 * @Date: 2020-03-27 11:45:12
 * @LastEditTime: 2020-03-27 12:46:32
 * @Description:
 */
import retidy from "retidy";
import * as fs from "fs";
const code = fs.readFileSync("bundle.js", "utf-8");

retidy(code, {
  type: "webpack",
  outDir: "dist/",
  bundleAstReferenceKeys: ["body", 0, "expression", "right"],
  entryPoint: 120
});
