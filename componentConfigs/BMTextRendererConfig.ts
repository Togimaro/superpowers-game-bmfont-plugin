export interface BMTextRendererConfigPub {
  formatVersion?: number;

  fontAssetId: string;
  text: string;

  alignment: string;
  verticalAlignment: string;
  characterSpacing?: number;
  lineSpacing?: number;

  overrideOpacity?: boolean;
  opacity?: number;
  color?: string;

  dropShadow?: { color: string; x: number; y: number; };

  materialType: string;
  shaderAssetId?: string;
}

export default class BMTextRendererConfig extends SupCore.Data.Base.ComponentConfig {
  static currentFormatVersion = 2;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    fontAssetId: { type: "string?", min: 0, mutable: true },
    text: { type: "string", minLength: 0, mutable: true },
    alignment: { type: "enum", items: ["left", "center", "right"], mutable: true },
    verticalAlignment: { type: "enum", items: ["top", "center", "bottom"], mutable: true },
    characterSpacing: { type: "number?", mutable: true },
    lineSpacing: { type: "number?", mutable: true },
    overrideOpacity: { type: "boolean", mutable: true },
    opacity: { type: "number?", min: 0, max: 1, mutable: true },
    color: { type: "string?", length: 6, mutable: true },
    dropShadow: {
      type: "hash?",
      properties: {
        "color": { type: "string", length: 6, mutable: true },
        "x": { type: "number", mutable: true },
        "y": { type: "number", mutable: true }
      }
    },
    materialType: { type: "enum", items: ["basic", "shader"], mutable: true },
    shaderAssetId: { type: "string?", min: 0, mutable: true },
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
      overrideOpacity: false, opacity: null,
      dropShadow: null,
      materialType: "basic", shaderAssetId: null,
    };
    return emptyConfig;
  }

  static migrate(pub: BMTextRendererConfigPub) {
    if (pub.formatVersion === BMTextRendererConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;
    }

    if (pub.formatVersion === 1) {
      pub.formatVersion = 2;

      if (pub.dropShadow == null) pub.dropShadow = null;
      if (pub.materialType == null) pub.materialType = "basic";
      if (pub.shaderAssetId == null) pub.shaderAssetId = null;

      if (pub.overrideOpacity == null) pub.overrideOpacity = false;
      if (pub.opacity == null) pub.opacity = null;
    }

    return true;
  }

  pub: BMTextRendererConfigPub;
  constructor(pub: BMTextRendererConfigPub) { super(pub, BMTextRendererConfig.schema); }

  restore() {
    if (this.pub.fontAssetId != null) this.emit("addDependencies", [this.pub.fontAssetId]);
    if (this.pub.shaderAssetId != null) this.emit("addDependencies", [this.pub.shaderAssetId]);
  }
  destroy() {
    if (this.pub.fontAssetId != null) this.emit("removeDependencies", [this.pub.fontAssetId]);
    if (this.pub.shaderAssetId != null) this.emit("removeDependencies", [this.pub.shaderAssetId]);
  }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    let oldDepId: string;
    if (path === "fontAssetId") oldDepId = this.pub.fontAssetId;
    if (path === "shaderAssetId") oldDepId = this.pub.shaderAssetId;

    super.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      if (path === "fontAssetId" || path === "shaderAssetId") {
        if (oldDepId != null) this.emit("removeDependencies", [oldDepId]);
        if (actualValue != null) this.emit("addDependencies", [actualValue]);
      }

      callback(null, actualValue);
    });
  }
}
