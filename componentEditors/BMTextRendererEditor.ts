import BMFontAsset from "../data/BMFontAsset";

export default class BMTextRendererEditor {
  tbody: HTMLTableSectionElement;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  fields: { [key: string]: any } = {};
  colorCheckbox: HTMLInputElement;
  cSpaceCheckbox: HTMLInputElement;
  lSpaceCheckbox: HTMLInputElement;
  shaderRow: HTMLTableRowElement;

  fontAssetId: string;
  shaderAssetId: string;
  fontAsset: BMFontAsset;
  color: string;
  overrideOpacity: boolean;
  opacity: number;
  cSpacing: number;
  lSpacing: number;

  fontFieldSubscriber: SupClient.table.AssetFieldSubscriber;
  shaderFieldSubscriber: SupClient.table.AssetFieldSubscriber;

  pendingModification = 0;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.editConfig = editConfig;
    this.projectClient = projectClient;

    this.fontAssetId = config.fontAssetId;
    this.shaderAssetId = config.shaderAssetId;
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

    const opacityRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.opacity"), { checkbox: true });
    this.fields["overrideOpacity"] = opacityRow.checkbox;
    this.fields["overrideOpacity"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "opacity", this.fontAsset != null ? this.fontAsset.pub.opacity : null);
      this.editConfig("setProperty", "overrideOpacity", event.target.checked);
    });

    const opacityParent = document.createElement("div");
    opacityRow.valueCell.appendChild(opacityParent);

    const transparentOptions: { [key: string]: string } = {
      empty: "",
      opaque: SupClient.i18n.t("componentEditors:TextRenderer.opaque"),
      transparent: SupClient.i18n.t("componentEditors:TextRenderer.transparent"),
    };
    this.fields["transparent"] = SupClient.table.appendSelectBox(opacityParent, transparentOptions);
    (this.fields["transparent"].children[0] as HTMLOptionElement).hidden = true;
    this.fields["transparent"].addEventListener("change", (event: any) => {
      const opacity = this.fields["transparent"].value === "transparent" ? 1 : null;
      this.editConfig("setProperty", "opacity", opacity);
    });

    this.fields["opacity"] = SupClient.table.appendSliderField(opacityParent, "", { min: 0, max: 1, step: 0.1, sliderStep: 0.01 });
    this.fields["opacity"].numberField.parentElement.addEventListener("input", (event: any) => {
      this.editConfig("setProperty", "opacity", parseFloat(event.target.value));
    });
    this.updateOpacityField();

    const cSpacingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.characterSpacing"), { checkbox: true });
    this.cSpaceCheckbox = cSpacingRow.checkbox;
    this.cSpaceCheckbox.addEventListener("change", (event) => {
      const cSpace = this.cSpaceCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.characterSpacing : 0) : null;
      this.editConfig("setProperty", "characterSpacing", cSpace);
    });
    this.fields["characterSpacing"] = SupClient.table.appendNumberField(cSpacingRow.valueCell, 0, { step: "any" });
    this.fields["characterSpacing"].addEventListener("input", (event: any) => {
      if (event.target.value === "") return;
      this.editConfig("setProperty", "characterSpacing", parseFloat(event.target.value));
    });
    const lSpacingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.lineSpacing"), { checkbox: true });
    this.lSpaceCheckbox = lSpacingRow.checkbox;
    this.lSpaceCheckbox.addEventListener("change", (event) => {
      const lSpace = this.lSpaceCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.lineSpacing : 0) : null;
      this.editConfig("setProperty", "lineSpacing", lSpace);
    });
    this.fields["lineSpacing"] = SupClient.table.appendNumberField(lSpacingRow.valueCell, 0, { step: "any" });
    this.fields["lineSpacing"].addEventListener("input", (event: any) => {
      if (event.target.value === "") return;
      this.editConfig("setProperty", "lineSpacing", parseFloat(event.target.value));
    });

    const materialRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.material"));
    this.fields["materialType"] = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "shader": "Shader" }, config.materialType);
    this.fields["materialType"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    });

    const shaderRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:BMTextRenderer.shader"));
    this.shaderRow = shaderRow.row;
    this.shaderFieldSubscriber = SupClient.table.appendAssetField(shaderRow.valueCell, this.shaderAssetId, "shader", projectClient);
    this.shaderFieldSubscriber.on("select", (assetId: string) => {
      this.editConfig("setProperty", "shaderAssetId", assetId);
    });
    this.shaderRow.hidden = config.materialType !== "shader";

    if (this.fontAssetId != null) this.projectClient.subAsset(this.fontAssetId, "bmfont", this);
    this.updateColorField();
    this.updateSpacingField();
  }

  destroy() {
    this.fontFieldSubscriber.destroy();
    this.shaderFieldSubscriber.destroy();
    if (this.fontAssetId != null) this.projectClient.unsubAsset(this.fontAssetId, this);
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch (path) {
      case "fontAssetId":
        if (this.fontAssetId != null) {
          this.projectClient.unsubAsset(this.fontAssetId, this);
          this.fontAsset = null;
        }
        this.fontAssetId = value;
        this.updateColorField();

        if (this.fontAssetId != null) this.projectClient.subAsset(this.fontAssetId, "bmfont", this);
        this.fontFieldSubscriber.onChangeAssetId(this.fontAssetId);
        break;
      case "color":
        this.color = value;
        this.updateColorField();
        break;
      case "overrideOpacity":
        this.overrideOpacity = value;
        this.updateOpacityField();
        break;
      case "opacity":
        this.opacity = value;
        this.updateOpacityField();
        break;
      case "characterSpacing":
        this.cSpacing = value;
        this.updateSpacingField();
        break;
      case "lineSpacing":
        this.lSpacing = value;
        this.updateSpacingField();
        break;
      case "text":
        if (this.pendingModification === 0) this.fields["text"].value = value;
        break;
      case "materialType":
        this.fields[path].value = value;
        this.shaderRow.hidden = value !== "shader";
        break;
      case "shaderAssetId":
        this.shaderAssetId = value;
        this.shaderFieldSubscriber.onChangeAssetId(this.shaderAssetId);
        break;
      default:
        this.fields[path].value = value;
        break;
    }
  }

  private updateColorField() {
    const color = this.color != null ? this.color : (this.fontAsset != null ? this.fontAsset.pub.color : null);
    this.fields["color"].setValue(color);

    this.colorCheckbox.checked = this.color != null;
    this.fields["color"].setDisabled(this.color == null);
  }

  private updateOpacityField() {
    this.fields["overrideOpacity"].checked = this.overrideOpacity;
    this.fields["transparent"].disabled = !this.overrideOpacity;
    this.fields["opacity"].sliderField.disabled = !this.overrideOpacity;
    this.fields["opacity"].numberField.disabled = !this.overrideOpacity;

    if (!this.overrideOpacity && this.fontAsset == null) {
      this.fields["transparent"].value = "empty";
      this.fields["opacity"].numberField.parentElement.hidden = true;
    } else {
      const opacity = this.overrideOpacity ? this.opacity : this.fontAsset.pub.opacity;
      if (opacity != null) {
        this.fields["transparent"].value = "transparent";
        this.fields["opacity"].numberField.parentElement.hidden = false;
        this.fields["opacity"].sliderField.value = opacity.toString();
        this.fields["opacity"].numberField.value = opacity.toString();
      } else {
        this.fields["transparent"].value = "opaque";
        this.fields["opacity"].numberField.parentElement.hidden = true;
      }
    }
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
    this.updateOpacityField();
  }
  onAssetEdited(assetId: string, command: string, ...args: any[]) {
    if (command !== "setProperty") return;

    if (command === "setProperty" && args[0] === "color") this.updateColorField();
    if (command === "setProperty" && args[0] === "characterSpacing") this.updateSpacingField();
    if (command === "setProperty" && args[0] === "lineSpacing") this.updateSpacingField();
    if (command === "setProperty" && args[0] === "opacity") this.updateOpacityField();

  }
  onAssetTrashed(assetId: string) {
    this.fontAsset = null;

    this.updateColorField();
    this.updateSpacingField();
    this.updateOpacityField();
  }
}
