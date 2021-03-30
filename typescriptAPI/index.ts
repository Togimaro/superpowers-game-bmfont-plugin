/// <reference path="../../../default/typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.BMFont", {
  code: fs.readFileSync(`${__dirname}/Sup.BMFont.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.BMFont.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "BMTextRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.BMTextRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.BMTextRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: "bmTextRenderer: Sup.BMTextRenderer;"
});
