const THREE = SupEngine.THREE;

import BMTextRendererUpdater from "./BMTextRendererUpdater";
import { BMFontPub } from "../data/BMFontAsset";

export default class BMTextRenderer extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = BMTextRendererUpdater;
  /* tslint:enable:variable-name */

  threeMesh: THREE.Mesh;

  positions: THREE.BufferAttribute;
  uvs: THREE.BufferAttribute;
  indices: THREE.BufferAttribute;

  MAX_CHARS = 512;

  text: string;
  font: BMFontPub;
  options: {
    alignment: string;
    verticalAlignment: string;
    characterSpacing: number;
    lineSpacing: number;
    color?: string;
  };

  needUpdateMesh: boolean = false;
  needUpdateMaterial: boolean = false;

  constructor(actor: SupEngine.Actor) {
    super(actor, "BMTextRenderer");
  }

  setText(text: string) {
    this.text = text;
    this.needUpdateMesh = true;
  }
  setFont(font: BMFontPub) {
    this.font = font;
    this.needUpdateMesh = true;
    this.needUpdateMaterial = true;
  }
  setOptions(options: { alignment: string; verticalAlignment: string; characterSpacing: number; lineSpacing: number; color?: string; }) {
    if (options.alignment == null) options.alignment = "center";
    if (options.verticalAlignment == null) options.verticalAlignment = "center";
    this.options = options;

    this.needUpdateMesh = true;
    if (options.color != null)
      this.needUpdateMaterial = true;
  }

  lateUpdate() {
    this.renderUpdate();
  }

  renderUpdate() { // to investigate: remove the current 1 frame lag + weird bug logicalcharacter
    if (this.needUpdateMesh) this.updateMesh();
    if (this.needUpdateMaterial) this.updateMaterial();
    this.needUpdateMesh = false;
    this.needUpdateMaterial = false;
  }

  nextPow2(aSize: number): number {
    return Math.pow(2, Math.ceil(Math.log(aSize) / Math.log(2)));
  }

  logicalChar = 0;
  updateMesh() {
    if (this.text == null || this.font == null) {
      this.disposeMesh();
      return;
    }

    let vertMax = this.nextPow2(this.text.length);
    if (vertMax > this.MAX_CHARS) {
      this.MAX_CHARS = vertMax;
      this.disposeMesh();
    }

    if (this.threeMesh == null)
      this.createMesh();

    let currentChar = 0;
    let currentLine = 0;
    this.logicalChar = 0;
    let height = this.getTextHeight();
    if (this.options.verticalAlignment === "center")
      currentLine += height / 2;
    else if (this.options.verticalAlignment === "bottom")
        currentLine += height;
    const lSpacing = (this.options.lineSpacing != null) ? this.options.lineSpacing : 0;
    while (currentChar < this.text.length) {
      currentChar = this.pushLine(currentChar, currentLine);
      currentLine -= this.font.common.lineHeight + lSpacing;
    }

    this.positions.needsUpdate = true;
    this.uvs.needsUpdate = true;
    this.indices.needsUpdate = true;
    (this.threeMesh.geometry as THREE.BufferGeometry).setDrawRange(0, this.logicalChar * 6);

    const scale = 1 / this.font.pixelsPerUnit;
    this.threeMesh.scale.set(scale, scale, scale);
    this.threeMesh.updateMatrixWorld(false);
  }

  updateMaterial() {
    if (this.threeMesh == null || this.font == null) return;
    const color = (this.options.color != null) ? this.options.color : this.font.color;
    (this.threeMesh.material as THREE.MeshBasicMaterial).map = this.font.texture;
    (this.threeMesh.material as THREE.MeshBasicMaterial).color.setHex(parseInt(color, 16));

    (this.threeMesh.material as THREE.Material).needsUpdate = true;
  }

  pushLine(startPos: number, currentLine: number): number {
    let width = this.getLineWidth(startPos);
    let currentChar = startPos;
    let xAdv = 0;
    let prevId = 0;
    if (this.options.alignment === "center")
      xAdv -= width / 2;
    else if (this.options.alignment === "right")
      xAdv -= width;
    const cSpacing = (this.options.characterSpacing != null) ? this.options.characterSpacing : 0;
    while (currentChar < this.text.length) {
      let id = this.text.charCodeAt(currentChar++);
      if (id === 10) break;
      let glyph = this.font.chars.find(element => element.id === id);
      if (glyph === undefined) continue;
      let kerning = this.font.kernings.find(element => element.first === prevId && element.second === id);
      if (kerning !== undefined) xAdv += kerning.amount;
      this.addGlyph(glyph, xAdv, currentLine);
      xAdv += glyph.xadv + cSpacing;
      prevId = id;
    }

    return currentChar;
  }

  addGlyph(glyph: any, offX: number, lineY: number) {
    this.positions.setXYZ(this.logicalChar * 4 + 0, glyph.xoff + offX, lineY - glyph.yoff, 0);
    this.positions.setXYZ(this.logicalChar * 4 + 1, glyph.xoff + offX + glyph.width, lineY - glyph.yoff, 0);
    this.positions.setXYZ(this.logicalChar * 4 + 2, glyph.xoff + offX + glyph.width, lineY - glyph.yoff - glyph.height, 0);
    this.positions.setXYZ(this.logicalChar * 4 + 3, glyph.xoff + offX, lineY - glyph.yoff - glyph.height, 0);

    let rX = glyph.x / this.font.common.scaleW;
    let rY = glyph.y / this.font.common.scaleH;
    let rW = glyph.width / this.font.common.scaleW;
    let rH = glyph.height / this.font.common.scaleH;
    this.uvs.setXY(this.logicalChar * 4 + 0, rX, 1 - rY);
    this.uvs.setXY(this.logicalChar * 4 + 1, rX + rW, 1 - rY);
    this.uvs.setXY(this.logicalChar * 4 + 2, rX + rW, 1 - (rY + rH));
    this.uvs.setXY(this.logicalChar * 4 + 3, rX, 1 - (rY + rH));

    this.indices.setXYZ(this.logicalChar * 6 + 0, this.logicalChar * 4 + 0, this.logicalChar * 4 + 1, this.logicalChar * 4 + 2);
    this.indices.setXYZ(this.logicalChar * 6 + 3, this.logicalChar * 4 + 0, this.logicalChar * 4 + 2, this.logicalChar * 4 + 3);
    this.logicalChar++;
  }

  getLineWidth(startPos: number): number {
    let currentChar = startPos;
    let xAdv = 0;
    const cSpacing = (this.options.characterSpacing != null) ? this.options.characterSpacing : 0;
    let prevId = 0;
    while (currentChar < this.text.length) {
      let id = this.text.charCodeAt(currentChar++);
      if (id === 10) return xAdv;
      let glyph = this.font.chars.find(element => element.id === id);
      if (glyph === undefined) continue;
      let kerning = this.font.kernings.find(element => element.first === prevId && element.second === id);
      if (kerning !== undefined) xAdv += kerning.amount;
      xAdv += glyph.xadv + cSpacing;
      prevId = id;
    }
    return xAdv;
  }

  getTextHeight(): number {
    let currentChar = 0;
    let height = 0;
    const lSpacing = (this.options.lineSpacing != null) ? this.options.lineSpacing : 0;
    while (currentChar < this.text.length) {
      let id = this.text.charCodeAt(currentChar++);
      if (id === 10)
        height += this.font.common.lineHeight + lSpacing;
    }
    return height;
  }

  createMesh() {
    if (this.threeMesh != null) return;
    const color = (this.options.color != null) ? this.options.color : this.font.color;
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial({
      map: this.font.texture,
      alphaTest: 0.1,
      color: parseInt(color, 16),
      side: THREE.DoubleSide
    });

    this.positions = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 3 * 4), 3);
    this.uvs = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 2 * 4), 2);
    this.indices = new THREE.BufferAttribute(new Uint32Array(this.MAX_CHARS * 6), 1);
    geometry.addAttribute("position", this.positions);
    geometry.addAttribute("uv", this.uvs);
    geometry.setIndex(this.indices);

    this.threeMesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.threeMesh);
  }

  disposeMesh() {
    if (this.threeMesh == null) return;
    this.actor.threeObject.remove(this.threeMesh);
    this.threeMesh.geometry.dispose();
    (this.threeMesh.material as THREE.Material).dispose();
    this.threeMesh = null;
  }

  _destroy() {
    this.disposeMesh();
    super._destroy();
  }

  setIsLayerActive(active: boolean) {
    if (this.threeMesh != null)
      this.threeMesh.visible = active;
  }
}
