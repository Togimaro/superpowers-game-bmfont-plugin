import BMFontAsset from "../data/BMFontAsset";
import TextRenderer from "./BMTextRenderer";
import { BMTextRendererConfigPub } from "../componentConfigs/BMTextRendererConfig";

export default class BMTextRendererUpdater {
  fontAssetId: string;
  text: string;
  textOptions: {
    alignment: string;
    verticalAlignment: string;
    characterSpacing?: number;
    lineSpacing?: number;
  };
  overrideOpacity = false;
  opacity: number;
  color: string;
  materialType: string;
  shaderAssetId: string;
  shaderPub: any;

  private fontSubscriber: SupClient.AssetSubscriber;
  private shaderSubscriber: SupClient.AssetSubscriber;
  fontAsset: BMFontAsset;

  constructor(private client: SupClient.ProjectClient, public textRenderer: TextRenderer, config: BMTextRendererConfigPub,
    private externalSubscriber?: SupClient.AssetSubscriber) {
    this.fontAssetId = config.fontAssetId;
    this.text = config.text;
    this.textOptions = {
      alignment: config.alignment,
      verticalAlignment: config.verticalAlignment,
      characterSpacing: config.characterSpacing,
      lineSpacing: config.lineSpacing,
    };
    this.overrideOpacity = config.overrideOpacity;
    this.opacity = config.opacity;
    this.color = config.color;
    if (this.overrideOpacity) this.textRenderer.setOpacity(this.opacity);
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;

    if (this.externalSubscriber == null) this.externalSubscriber = {};

    this.fontSubscriber = {
      onAssetReceived: this.onFontAssetReceived,
      onAssetEdited: this.onFontAssetEdited,
      onAssetTrashed: this.onFontAssetTrashed
    };
    this.shaderSubscriber = {
      onAssetReceived: this.onShaderAssetReceived,
      onAssetEdited: this.onShaderAssetEdited,
      onAssetTrashed: this.onShaderAssetTrashed
    };

    if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "bmfont", this.fontSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  private onFontAssetReceived = (assetId: string, asset: BMFontAsset) => {
    this.fontAsset = asset;

    this.textRenderer.text = this.text;
    this.textRenderer.color = this.color;
    if (!this.overrideOpacity) this.textRenderer.opacity = asset.pub.opacity;
    this.textRenderer.setTextOptions(this.textOptions);

    this.setupFont();

    if (this.externalSubscriber.onAssetReceived) this.externalSubscriber.onAssetReceived(assetId, asset);
  }

  private onFontAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    const commandFunction = this.onFontEditCommands[command];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.externalSubscriber.onAssetEdited) this.externalSubscriber.onAssetEdited(assetId, command, ...args);
  }

  private onFontEditCommands: { [command: string]: Function; } = {
    uploadBmp: () => { this.setupFont(); },
    uploadFnt: () => { this.textRenderer.updateMesh(); },

    setProperty: (path: string, value: any) => {
      switch (path) {
        default: this.textRenderer.setFont(this.fontAsset.pub);
      }
    }
  };

  private onFontAssetTrashed = (assetId: string) => {
    this.textRenderer.disposeMesh();
    if (this.externalSubscriber.onAssetTrashed != null) this.externalSubscriber.onAssetTrashed(assetId);
  }

  private setupFont() {
    if (this.fontAsset.pub.texture != null) {
      const image = this.fontAsset.pub.texture.image;
      const onLoad = () => {
        this.setFont();
      };
      if (image.complete) onLoad();
      else image.addEventListener("load", onLoad);
    }
  }

  private setFont() {
    if (this.fontAsset == null || (this.materialType === "shader" && this.shaderPub == null))
      this.textRenderer.setFont(null);
    else
      this.textRenderer.setFont(this.fontAsset.pub, this.materialType, this.shaderPub);
    this.textRenderer.renderUpdate(); // need to update mesh immediately in editor for the bounding box computation
  }

  private onShaderAssetReceived = (assetId: string, asset: { pub: any }) => {
    this.shaderPub = asset.pub;
    this.setFont();
  }

  private onShaderAssetEdited = (id: string, command: string, ...args: any[]) => {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this.setFont();
  }

  private onShaderAssetTrashed = () => {
    this.shaderPub = null;
    this.setFont();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "fontAssetId":
        if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
        this.fontAssetId = value;

        this.fontAsset = null;
        this.textRenderer.setFont(null);

        if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "bmfont", this.fontSubscriber);
        break;

      case "text":
        this.text = value;
        this.textRenderer.setText(this.text);
        break;

      case "overrideOpacity":
        this.overrideOpacity = value;
        this.textRenderer.setOpacity(value ? this.opacity : (this.fontAsset != null ? this.fontAsset.pub.opacity : null));
        break;

      case "opacity":
        this.opacity = value;
        this.textRenderer.setOpacity(this.opacity);
        break;

      case "color":
        this.color = value;
        this.textRenderer.setColor(this.color);
        break;

      case "materialType":
        this.materialType = value;
        this.setFont();
        break;

      case "shaderAssetId":
        if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
        this.shaderAssetId = value;

        this.shaderPub = null;
        this.textRenderer.setFont(null);

        if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
        break;

      case "alignment":
      case "verticalAlignment":
      case "characterSpacing":
      case "lineSpacing": {
        (this.textOptions as any)[path] = (value !== "") ? value : null;
        this.textRenderer.setTextOptions(this.textOptions);
      } break;
    }
    this.textRenderer.renderUpdate(); // need to update mesh immediately in editor for the bounding box computation
  }

}
