import BMFontAsset from "../data/BMFontAsset";

export default class BMTextRendererEditor {
    tbody: HTMLTableSectionElement;
    projectClient: SupClient.ProjectClient;
    editConfig: any;

    fields: { [key: string]: any } = {};
    colorCheckbox: HTMLInputElement;
    cSpaceCheckbox: HTMLInputElement;
    lSpaceCheckbox: HTMLInputElement;

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
        this.cSpacing = config.characterSpacing;
        this.lSpacing = config.lineSpacing;

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

        const cSpacingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.characterSpacing"), { checkbox: true });
        this.cSpaceCheckbox = cSpacingRow.checkbox;
        this.cSpaceCheckbox.addEventListener("change", (event) => {
            const cSpace = this.cSpaceCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.characterSpacing : 0) : null;
            this.editConfig("setProperty", "characterSpacing", cSpace);
        });
        this.fields["characterSpacing"] = SupClient.table.appendNumberField(cSpacingRow.valueCell, 0, { min: 0 });
        this.fields["characterSpacing"].addEventListener("input", (event: any) => {
            if (event.target.value === "") return;
            this.editConfig("setProperty", "characterSpacing", parseInt(event.target.value, 10));
        });
        const lSpacingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.lineSpacing"), { checkbox: true });
        this.lSpaceCheckbox = lSpacingRow.checkbox;
        this.lSpaceCheckbox.addEventListener("change", (event) => {
            const lSpace = this.lSpaceCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.lineSpacing : 0) : null;
            this.editConfig("setProperty", "lineSpacing", lSpace);
        });
        this.fields["lineSpacing"] = SupClient.table.appendNumberField(lSpacingRow.valueCell, 0, { min: 0 });
        this.fields["lineSpacing"].addEventListener("input", (event: any) => {
            if (event.target.value === "") return;
            this.editConfig("setProperty", "lineSpacing", parseInt(event.target.value, 10));
        });

        if (this.fontAssetId != null) this.projectClient.subAsset(this.fontAssetId, "bmfont", this);
        this.updateColorField();
        this.updateSpacingField();
    }

    destroy() {
        this.fontFieldSubscriber.destroy();
        if (this.fontAssetId != null) this.projectClient.unsubAsset(this.fontAssetId, this);
    }

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
        } else if (path === "characterSpacing") {
            this.cSpacing = value;
            this.updateSpacingField();
        } else if (path === "lineSpacing") {
            this.lSpacing = value;
            this.updateSpacingField();
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

    private updateSpacingField() {
        const cSpace = this.cSpacing != null ? this.cSpacing : (this.fontAsset != null ? this.fontAsset.pub.characterSpacing : 0);
        this.fields["characterSpacing"].value = cSpace;

        this.cSpaceCheckbox.checked = this.cSpacing != null;
        this.fields["characterSpacing"].disabled = this.cSpacing == null;

        const lSpace = this.lSpacing != null ? this.lSpacing : (this.fontAsset != null ? this.fontAsset.pub.lineSpacing : 0);
        this.fields["lineSpacing"].value = lSpace;

        this.lSpaceCheckbox.checked = this.lSpacing != null;
        this.fields["lineSpacing"].disabled = this.lSpacing == null;
    }

    // Network callbacks
    onAssetReceived(assetId: string, asset: BMFontAsset) {
        this.fontAsset = asset;

        this.updateColorField();
        this.updateSpacingField();
    }
    onAssetEdited(assetId: string, command: string, ...args: any[]) {
        if (command !== "setProperty") return;

        if (command === "setProperty" && args[0] === "color") this.updateColorField();
        if (command === "setProperty" && args[0] === "characterSpacing") this.updateSpacingField();
        if (command === "setProperty" && args[0] === "lineSpacing") this.updateSpacingField();

    }
    onAssetTrashed(assetId: string) {
        this.fontAsset = null;

        this.updateColorField();
        this.updateSpacingField();
    }
}
