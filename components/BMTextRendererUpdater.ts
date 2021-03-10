import BMFontAsset from "../data/BMFontAsset";
import TextRenderer from "./BMTextRenderer";
import { BMTextRendererConfigPub } from "../componentConfigs/BMTextRendererConfig";

export default class BMTextRendererUpdater {
    fontAssetId: string;
    text: string;
    options: {
      alignment: string;
      verticalAlignment: string;
      characterSpacing: number;
      lineSpacing: number;
      color?: string;
    };

    private fontSubscriber: SupClient.AssetSubscriber;
    fontAsset: BMFontAsset;

    constructor(private client: SupClient.ProjectClient, public textRenderer: TextRenderer, config: BMTextRendererConfigPub,
        private externalSubscriber?: SupClient.AssetSubscriber) {
        this.fontAssetId = config.fontAssetId;
        this.text = config.text;
        this.options = {
          alignment: config.alignment,
          verticalAlignment: config.verticalAlignment,
          characterSpacing: config.characterSpacing,
          lineSpacing: config.lineSpacing,
          color: config.color,
        };

        if (this.externalSubscriber == null) this.externalSubscriber = {};

        this.fontSubscriber = {
            onAssetReceived: this.onFontAssetReceived,
            onAssetEdited: this.onFontAssetEdited,
            onAssetTrashed: this.onFontAssetTrashed
        };
        if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "bmfont", this.fontSubscriber);
    }

    destroy() {
        if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
    }

    config_setProperty(path: string, value: any) {
        switch (path) {
            case "fontAssetId": {
                if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
                this.fontAssetId = value;

                this.fontAsset = null;
                this.textRenderer.setFont(null);

                if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "bmfont", this.fontSubscriber);
            } break;

            case "text": {
                this.text = value;
                this.textRenderer.setText(this.text);
            } break;

            case "alignment":
            case "verticalAlignment":
            case "characterSpacing":
            case "lineSpacing":
            case "color": {
                (this.options as any)[path] = (value !== "") ? value : null;
                this.textRenderer.setOptions(this.options);
            } break;
        }
        this.textRenderer.renderUpdate(); // need to update mesh immediately in editor for the bounding box computation
    }

    private onFontAssetReceived = (assetId: string, asset: BMFontAsset) => {
        this.fontAsset = asset;

        this.textRenderer.setText(this.text);
        this.textRenderer.setOptions(this.options);

        this.setupFont();

        if (this.externalSubscriber.onAssetReceived) this.externalSubscriber.onAssetReceived(assetId, asset);
    }

    private onFontAssetEdited = (assetId: string, command: string, ...args: any[]) => {
        const commandFunction = this.onEditCommands[command];
        if (commandFunction != null) commandFunction.apply(this, args);

        if (this.externalSubscriber.onAssetEdited) this.externalSubscriber.onAssetEdited(assetId, command, ...args);
    }

    private setupFont() {
        if (this.fontAsset.pub.texture != null) {
            const image = this.fontAsset.pub.texture.image;
            const onLoad = () => {
                this.textRenderer.setFont(this.fontAsset.pub);
                this.textRenderer.renderUpdate(); // need to update mesh immediately in editor for the bounding box computation
            };
            if (image.complete) onLoad();
            else image.addEventListener("load", onLoad);
        }
    }

    private onEditCommands: { [command: string]: Function; } = {
        uploadBmp: () => { this.setupFont(); },
        uploadFnt: () => { this.textRenderer.updateMesh(); },

        setProperty: (path: string, value: any) => {
            switch (path) {
                default: this.textRenderer.setFont(this.fontAsset.pub);
            }
        }
    };

    private onFontAssetTrashed = (assetId: string) => {
        if (this.externalSubscriber.onAssetTrashed != null) this.externalSubscriber.onAssetTrashed(assetId);
    }
}
