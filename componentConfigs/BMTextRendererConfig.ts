export interface BMTextRendererConfigPub {
    formatVersion?: number;

    fontAssetId: string;
    text: string;
    alignment: string;
    verticalAlignment: string;
    characterSpacing: number;
    lineSpacing: number;
    color?: string;
}

export default class BMTextRendererConfig extends SupCore.Data.Base.ComponentConfig {
    static currentFormatVersion = 1;

    static schema: SupCore.Data.Schema = {
        formatVersion: { type: "integer" },

        fontAssetId: { type: "string?", min: 0, mutable: true },
        text: { type: "string", minLength: 0, mutable: true },
        alignment: { type: "enum", items: [ "left", "center", "right" ], mutable: true },
        verticalAlignment: { type: "enum", items: [ "top", "center", "bottom" ], mutable: true },
        characterSpacing: { type: "integer", mutable: true },
        lineSpacing: { type: "integer", mutable: true },
        color: { type: "string?", length: 6, mutable: true }
    };

    static create() {
        const emptyConfig: BMTextRendererConfigPub = {
            formatVersion: BMTextRendererConfig.currentFormatVersion,

            fontAssetId: null,
            text: "Text",
            alignment: "center",
            verticalAlignment: "center",
            characterSpacing: null,
            lineSpacing: null,
            color: null,
        };
        return emptyConfig;
    }

    static migrate(pub: BMTextRendererConfigPub) {
        if (pub.formatVersion === BMTextRendererConfig.currentFormatVersion) return false;

        if (pub.formatVersion == null) {
            pub.formatVersion = 1;
        }

        return true;
    }

    pub: BMTextRendererConfigPub;
    constructor(pub: BMTextRendererConfigPub) { super(pub, BMTextRendererConfig.schema); }

    restore() { if (this.pub.fontAssetId != null) this.emit("addDependencies", [this.pub.fontAssetId]); }
    destroy() { if (this.pub.fontAssetId != null) this.emit("removeDependencies", [this.pub.fontAssetId]); }

    setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
        let oldDepId: string;
        if (path === "fontAssetId") oldDepId = this.pub.fontAssetId;

        super.setProperty(path, value, (err, actualValue) => {
            if (err != null) { callback(err); return; }

            if (path === "fontAssetId") {
                if (oldDepId != null) this.emit("removeDependencies", [oldDepId]);
                if (actualValue != null) this.emit("addDependencies", [actualValue]);
            }

            callback(null, actualValue);
        });
    }
}
