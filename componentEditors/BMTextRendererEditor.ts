import BMFontAsset from "../data/BMFontAsset";

export default class BMTextRendererEditor {
    tbody: HTMLTableSectionElement;
    projectClient: SupClient.ProjectClient;
    editConfig: any;

    fields: { [key: string]: any } = {};
    colorCheckbox: HTMLInputElement;

    fontAssetId: string;
    fontAsset: BMFontAsset;
    color: string;
    cSpacing: number;
    lSpacing: number;

    fontFieldSubscriber: SupClient.table.AssetFieldSubscriber;

    pendingModification = 0;

    constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
        this.tbody = tbody;
        this.editConfig = editConfig;
        this.projectClient = projectClient;

        this.fontAssetId = config.fontAssetId;
        this.color = config.color;

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

        const alignmentRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.align.title"));
        const alignmentOptions: { [key: string]: string } = {
            "left": SupClient.i18n.t("componentEditors:BMTextRenderer.align.left"),
            "center": SupClient.i18n.t("componentEditors:BMTextRenderer.align.center"),
            "right": SupClient.i18n.t("componentEditors:BMTextRenderer.align.right")
        };
        this.fields["alignment"] = SupClient.table.appendSelectBox(alignmentRow.valueCell, alignmentOptions, config.alignment);
        this.fields["alignment"].addEventListener("change", (event: any) => { this.editConfig("setProperty", "alignment", event.target.value); });

        const verticalAlignmentRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.verticalAlign.title"));
        const verticalAlignmentOptions: { [key: string]: string } = {
            "top": SupClient.i18n.t("componentEditors:BMTextRenderer.verticalAlign.top"),
            "center": SupClient.i18n.t("componentEditors:BMTextRenderer.verticalAlign.center"),
            "bottom": SupClient.i18n.t("componentEditors:BMTextRenderer.verticalAlign.bottom")
        };
        this.fields["verticalAlignment"] = SupClient.table.appendSelectBox(verticalAlignmentRow.valueCell, verticalAlignmentOptions, config.verticalAlignment);
        this.fields["verticalAlignment"].addEventListener("change", (event: any) => { this.editConfig("setProperty", "verticalAlignment", event.target.value); });

        const colorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.color"), { checkbox: true });
        this.colorCheckbox = colorRow.checkbox;
        this.colorCheckbox.addEventListener("change", (event) => {
            const color = this.colorCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.color : "ffffff") : null;
            this.editConfig("setProperty", "color", color);
        });
        this.fields["color"] = SupClient.table.appendColorField(colorRow.valueCell, null);
        this.fields["color"].addListener("change", (color: string) => {
          this.editConfig("setProperty", "color", color);
        });
        this.updateColorField();

        const cSpacingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.characterSpacing"));
        this.fields["characterSpacing"] = SupClient.table.appendNumberField(cSpacingRow.valueCell, 0, { min: 0 });
        this.fields["characterSpacing"].addEventListener("input", (event: any) => {
            if (event.target.value === "") return;
            this.editConfig("setProperty", "characterSpacing", parseInt(event.target.value, 10));
        });
        const lSpacingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.lineSpacing"));
        this.fields["lineSpacing"] = SupClient.table.appendNumberField(lSpacingRow.valueCell, 0, { min: 0 });
        this.fields["lineSpacing"].addEventListener("input", (event: any) => {
            if (event.target.value === "") return;
            this.editConfig("setProperty", "lineSpacing", parseInt(event.target.value, 10));
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
            this.updateColorField();

            if (this.fontAssetId != null) this.projectClient.subAsset(this.fontAssetId, "bmfont", this);
            this.fontFieldSubscriber.onChangeAssetId(this.fontAssetId);
        } else if (path === "color") {
            this.color = value;
            this.updateColorField();
        } else if (path === "text") {
            if (this.pendingModification === 0) this.fields["text"].value = value;
        } else this.fields[path].value = value;
    }

    private updateColorField() {
        const color = this.color != null ? this.color : (this.fontAsset != null ? this.fontAsset.pub.color : null);
        this.fields["color"].setValue(color);

        this.colorCheckbox.checked = this.color != null;
        this.fields["color"].setDisabled(this.color == null);
    }
    // Network callbacks
    onAssetReceived(assetId: string, asset: BMFontAsset) {
        this.fontAsset = asset;

        this.updateColorField();
        // this.updateOpacityField();
    }
    onAssetEdited(assetId: string, command: string, ...args: any[]) {
        if (command !== "setProperty") return;

        if (command === "setProperty" && args[0] === "color") this.updateColorField();
        // if (command === "setProperty" && args[0] === "opacity") this.updateOpacityField();

    }
    onAssetTrashed(assetId: string) {
        this.fontAsset = null;

        this.updateColorField();
        // this.updateOpacityField();
    }
}
