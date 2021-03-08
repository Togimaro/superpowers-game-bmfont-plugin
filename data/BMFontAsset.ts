import * as path from "path";
import * as fs from "fs";
import * as parse from "parse-bmfont-binary";

// Reference to THREE, client-side only
let THREE: typeof SupEngine.THREE;
if ((<any>global).window != null && (<any>global).window.SupEngine != null) THREE = (<any>global).window.SupEngine.THREE;

type UploadBmpCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, bmfont: Buffer) => void);
type UploadFntCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, fnt: Object) => void);

export interface BMFontPub {
    formatVersion: number;

    bitmap: Buffer;
    common: {
        lineHeight: number;
        base: number;
        scaleW : number;
        scaleH : number;
    };
    chars: {
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
        xoff: number;
        yoff: number;
        xadv: number;
    }[];
    kernings: {
        first: number;
        second: number;
        amount: number;
    }[];

    pixelsPerUnit: number;
    color: string;
    opacity: number;

    name?: string;
    texture?: THREE.Texture;
}

export default class BMFontAsset extends SupCore.Data.Base.Asset {
    static currentFormatVersion = 1;

    static schema: SupCore.Data.Schema = {
        formatVersion: { type: "integer" },

        bitmap: { type: "buffer" },
        common: {
            type: "hash",
            properties: {
                lineHeight: { type: "integer" },
                base: { type: "integer" },
                scaleW: { type: "integer" },
                scaleH: { type: "integer" },
            }
        },
        chars: {
          type: "array",
          items: {
            type: "hash",
            properties: {
                id: { type: "integer" },
                x: { type: "integer" },
                y: { type: "integer" },
                width: { type: "integer" },
                height: { type: "integer" },
                xoff: { type: "integer" },
                yoff: { type: "integer" },
                xadv: { type: "integer" }
            }
          }
        },
        kernings: {
          type: "array",
          items: {
            type: "hash",
            properties: {
                first: { type: "integer" },
                second: { type: "integer" },
                amount: { type: "integer" },
            }
          }
        },
    };

    pub: BMFontPub;

    url: string;

    constructor(id: string, pub: BMFontPub, server?: ProjectServer) {
        super(id, pub, BMFontAsset.schema, server);
    }

    init(options: any, callback: Function) {
        this.pub = {
            formatVersion: BMFontAsset.currentFormatVersion,

            bitmap: Buffer.alloc(0),

            common: {
                lineHeight: 0,
                base: 0,
                scaleW: 0,
                scaleH: 0
            },
            chars: [],
            kernings: [],

            pixelsPerUnit: 20,
            color: "ffffff",
            opacity: null,
        };
        super.init(options, callback);
    }

    load(assetPath: string) {
        let pub: BMFontPub;
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
            pub = JSON.parse(json);

            fs.readFile(path.join(assetPath, "bitmap.dat"), (err, buffer) => {
                pub.bitmap = buffer;
                this._onLoaded(assetPath, pub);
            });
        });
    }

    migrate(assetPath: string, pub: BMFontPub, callback: (hasMigrated: boolean) => void) {
        if (pub.formatVersion === BMFontAsset.currentFormatVersion) { callback(false); return; }

        if (pub.formatVersion == null) {
            pub.formatVersion = 1;
        }

        callback(true);
    }

    client_load() { this.loadBMFont(); }
    client_unload() { this.unloadBMFont(); }

    save(outputPath: string, callback: (err: Error) => void) {
        this.write(fs.writeFile, outputPath, callback);
    }

    clientExport(outputPath: string, callback: (err: Error) => void) {
        this.write(SupApp.writeFile, outputPath, callback);
    }

    private write(writeFile: Function, assetPath: string, callback: (err: Error) => void) {
        let bitmap = this.pub.bitmap;
        const texture = this.pub.texture;
        delete this.pub.bitmap;
        delete this.pub.texture;

        const json = JSON.stringify(this.pub, null, 2);

        this.pub.bitmap = bitmap;
        this.pub.texture = texture;

        if (bitmap instanceof ArrayBuffer) bitmap = new Buffer(bitmap);

        writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, () => {
            writeFile(path.join(assetPath, "bitmap.dat"), bitmap, callback);
        });
    }

    private loadBMFont() {
        this.unloadBMFont();

        if ((<any>this.pub.bitmap).byteLength === 0) return;

        const image = new Image();
        const typedArray = new Uint8Array(this.pub.bitmap);
        const blob = new Blob([ typedArray ], { type: "image/*" });
        this.url = URL.createObjectURL(blob);
        image.src = this.url;

        this.pub.texture = new THREE.Texture(image);
        this.pub.texture.magFilter = THREE.NearestFilter;
        this.pub.texture.minFilter = THREE.NearestFilter;

        if (!image.complete) image.addEventListener("load", () => { this.pub.texture.needsUpdate = true; });
    }

    private unloadBMFont() {
        if (this.url != null) URL.revokeObjectURL(this.url);

        if (this.pub.texture != null) {
            this.pub.texture.dispose();
            this.pub.texture = null;
        }
    }

    private loadData(data: any) {
        this.unloadData();

        this.pub.common.lineHeight = data.common.lineHeight;
        this.pub.common.base = data.common.base;
        this.pub.common.scaleW = data.common.scaleW;
        this.pub.common.scaleH = data.common.scaleH;

        for (let c of data.chars) {
            let item = {
                id: c.id,
                x: c.x,
                y: c.y,
                width: c.width,
                height: c.height,
                xoff: c.xoffset,
                yoff: c.yoffset,
                xadv: c.xadvance,
                yadv: c.advance
            };
            this.pub.chars.push(item);
        }

        for (let k of data.kernings) {
            let item = {
                first: k.first,
                second: k.second,
                amount: k.amount,
            };
            this.pub.kernings.push(item);
        }
    }

    private unloadData() {
        this.pub.chars = [];
        this.pub.kernings = [];
    }

    server_uploadBmp(client: SupCore.RemoteClient, bitmap: any, callback: UploadBmpCallback) {
        if (!(bitmap instanceof Buffer)) { callback("Image must be an ArrayBuffer"); return; }

        this.pub.bitmap = bitmap;

        callback(null, null, bitmap);
        this.emit("change");
    }

    client_uploadBmp(bitmap: any) {
        this.pub.bitmap = bitmap;

        this.loadBMFont();
    }

    server_uploadFnt(client: SupCore.RemoteClient, font: any, callback: UploadFntCallback) {
        if (!(font instanceof Buffer)) { callback("Font data must be an ArrayBuffer"); return; }

        try {
            let data = parse(font);
            this.loadData(data);
            callback(null, null, data);
        } catch {
            callback("Error: The BMFont descriptor must be in Binary format", null, null);
        }

        this.emit("change");
    }

    client_uploadFnt(data: any) {
        this.loadData(data);
    }

    client_setProperty(path: string, value: any) {
        super.client_setProperty(path, value);

        // if (path === "isBitmap") this.loadBMFont();
        // if (path === "filtering") this.setupFiltering();
    }
}
