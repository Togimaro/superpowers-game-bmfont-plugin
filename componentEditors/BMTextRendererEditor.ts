import BMFontAsset from "../data/BMFontAsset";

export default class BMTextRendererEditor {
    tbody: HTMLTableSectionElement;
    projectClient: SupClient.ProjectClient;
    editConfig: any;

    fields: { [key: string]: any } = {};

    fontAssetId: string;
    fontAsset: BMFontAsset;

    fontFieldSubscriber: SupClient.table.AssetFieldSubscriber;

    pendingModification = 0;

    constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
        this.tbody = tbody;
        this.editConfig = editConfig;
        this.projectClient = projectClient;

        this.fontAssetId = config.fontAssetId;

        const fontRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.font"));
        this.fontFieldSubscriber = SupClient.table.appendAssetField(fontRow.valueCell, this.fontAssetId, "bmfont", projectClient);
        this.fontFieldSubscriber.on("select", (assetId: string) => {
            this.editConfig("setProperty", "fontAssetId", assetId);
        });

        const textRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.text"));
        this.fields["text"] = SupClient.table.appendTextAreaField(textRow.valueCell, config.text);
        this.fields["text"].addEventListener("input", (event: any) => {
            this.pendingModification += 1;
            this.editConfig("setProperty", "text", event.target.value, (err: string) => {
                this.pendingModification -= 1;
                if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }
            });
        });
    }

    destroy() { this.fontFieldSubscriber.destroy(); }

    config_setProperty(path: string, value: any) {
        if (path === "fontAssetId") {
            if (this.fontAssetId != null) {
                this.projectClient.unsubAsset(this.fontAssetId, this);
                this.fontAsset = null;
            }
            this.fontAssetId = value;

            if (this.fontAssetId != null) this.projectClient.subAsset(this.fontAssetId, "bmfont", this);
            this.fontFieldSubscriber.onChangeAssetId(this.fontAssetId);

        } else if (path === "text") {
            if (this.pendingModification === 0) this.fields["text"].value = value;

        } else this.fields[path].value = value;
    }

    // Network callbacks
    onAssetReceived(assetId: string, asset: BMFontAsset) {
        this.fontAsset = asset;

        /*this.updateColorField();
        this.updateSizeField();
        this.updateOpacityField();*/
    }
    onAssetEdited(assetId: string, command: string, ...args: any[]) {
        if (command !== "setProperty") return;

        /*if (command === "setProperty" && args[0] === "color") this.updateColorField();
        if (command === "setProperty" && (args[0] === "size" || args[0] === "isBitmap")) this.updateSizeField();
        if (command === "setProperty" && args[0] === "opacity") this.updateOpacityField();*/

    }
    onAssetTrashed(assetId: string) {
        this.fontAsset = null;

        /*this.updateColorField();
        this.updateSizeField();
        this.updateOpacityField();*/
    }
}
