export interface BMTextRendererConfigPub {
    formatVersion?: number;

    fontAssetId: string;
    text: string;
}

export default class BMTextRendererConfig extends SupCore.Data.Base.ComponentConfig {
    static currentFormatVersion = 1;

    static schema: SupCore.Data.Schema = {
        formatVersion: { type: "integer" },

        fontAssetId: { type: "string?", min: 0, mutable: true },
        text: { type: "string", min: 0, mutable: true }
    };

    static create() {
        const emptyConfig: BMTextRendererConfigPub = {
            formatVersion: BMTextRendererConfig.currentFormatVersion,

            fontAssetId: null,
            text: "Text"
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
