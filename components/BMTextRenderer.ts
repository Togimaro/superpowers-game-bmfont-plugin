const THREE = SupEngine.THREE;

import BMTextRendererUpdater from "./BMTextRendererUpdater";
import { BMFontPub } from "../data/BMFontAsset";

export default class BMTextRenderer extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = BMTextRendererUpdater;
  /* tslint:enable:variable-name */

  threeMesh: THREE.Mesh;
  threeMeshShadow: THREE.Mesh; // maybe merge the two together in the future

  material: THREE.MeshBasicMaterial|THREE.ShaderMaterial;
  materialShadow: THREE.MeshBasicMaterial|THREE.ShaderMaterial;
  positions: THREE.BufferAttribute;
  uvs: THREE.BufferAttribute;
  charIds: THREE.BufferAttribute;
  indices: THREE.BufferAttribute;

  MAX_CHARS = 32;

  text: string;
  font: BMFontPub;
  options: {
    alignment: string;
    verticalAlignment: string;
    characterSpacing?: number;
    lineSpacing?: number;
    color?: string;
    dropshadow? : { color: string; x: number; y: number; };
  };
  materialType = "basic";
  shaderAsset: any;

  needChangeMaterial: boolean = false;
  needUpdateMesh: boolean = false;
  needUpdateMaterial: boolean = false;
  needUpdateShadow: boolean = false;

  constructor(actor: SupEngine.Actor) {
    super(actor, "BMTextRenderer");
    this.options = { alignment: "center", verticalAlignment: "center" };
  }

  setText(text: string) {
    this.text = text;
    this.needUpdateMesh = true;
  }
  setFont(font: BMFontPub, materialType?: string, customShader?: any) {
    this.font = font;
    if (materialType != null) this.materialType = materialType;
    if (customShader != null) this.shaderAsset = customShader;
    this.needChangeMaterial = true;
    this.needUpdateMesh = true;
    this.needUpdateMaterial = true;
    this.needUpdateShadow = true;
  }
  setOptions(options: { alignment: string; verticalAlignment: string; characterSpacing?: number; lineSpacing?: number; color?: string; }) {
    if (options.alignment == null) options.alignment = "center";
    if (options.verticalAlignment == null) options.verticalAlignment = "center";
    this.options.alignment = options.alignment;
    this.options.verticalAlignment = options.verticalAlignment;
    this.options.characterSpacing = options.characterSpacing;
    this.options.lineSpacing = options.lineSpacing;
    this.options.color = options.color;

    this.needUpdateMesh = true;
    this.needUpdateMaterial = true;
  }
  setDropshadow(dropshadow: { color: string; x: number; y: number; }) {
    this.options.dropshadow = dropshadow;

    this.needUpdateShadow = true;
  }

  lateUpdate() {
    this.renderUpdate();
  }

  renderUpdate() {
    if (this.needChangeMaterial) this.changeMaterial();
    if (this.needUpdateMesh) this.updateMesh();
    if (this.needUpdateMaterial) this.updateMaterial();
    if (this.needUpdateShadow) this.updateShadow();
    this.needChangeMaterial = false;
    this.needUpdateMesh = false;
    this.needUpdateMaterial = false;
    this.needUpdateShadow = false;

    if (this.material != null) {
      const uniforms = (<THREE.ShaderMaterial>this.material).uniforms;
      if (uniforms != null) uniforms.time.value += 1 / this.actor.gameInstance.framesPerSecond;
    }
    if (this.materialShadow != null) {
      const uniforms = (<THREE.ShaderMaterial>this.materialShadow).uniforms;
      if (uniforms != null) uniforms.time.value += 1 / this.actor.gameInstance.framesPerSecond;
    }
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

    // This count as if every letter is printed, not really the case but good enough as an approximation for memory pre allocation
    let vertMax = this.nextPow2(this.text.length);
    if (vertMax > this.MAX_CHARS) {
      this.MAX_CHARS = vertMax;
      this.disposeMesh();
    }

    if (this.threeMesh == null) {
      this.createMesh();
      this.needUpdateMaterial = true;
      this.needUpdateShadow = true;
    }

    let currentChar = 0;
    let currentLine = 0;
    this.logicalChar = 0;
    let height = this.getTextHeight();
    if (this.options.verticalAlignment === "center")
      currentLine += height / 2;
    else if (this.options.verticalAlignment === "bottom")
      currentLine += height;
    const lSpacing = (this.options.lineSpacing != null) ? this.options.lineSpacing : this.font.lineSpacing;
    while (currentChar < this.text.length) {
      currentChar = this.pushLine(currentChar, currentLine);
      currentLine -= this.font.common.lineHeight + lSpacing;
    }

    this.positions.needsUpdate = true;
    this.uvs.needsUpdate = true;
    (this.threeMesh.geometry as THREE.BufferGeometry).setDrawRange(0, this.logicalChar * 6);

    const scale = 1 / this.font.pixelsPerUnit;
    this.threeMesh.scale.set(scale, scale, scale);
    this.threeMesh.updateMatrixWorld(false);
    this.threeMeshShadow.scale.set(scale, scale, scale);
    this.threeMeshShadow.updateMatrixWorld(false);
  }

  changeMaterial() {
    if (this.threeMesh == null || this.font == null) return;
    this.disposeMaterial();
    let geometry = this.threeMesh.geometry as THREE.BufferGeometry;
    const color = (this.options.color != null) ? this.options.color : this.font.color;
    this.material = this.createMaterial(geometry, parseInt(color, 16));
    const shadowColor = (this.options.dropshadow != null) ? this.options.dropshadow.color : "0xFFFFFF";
    this.materialShadow = this.createMaterial(geometry, parseInt(shadowColor, 16));

    this.threeMesh.material = this.material;
    this.threeMeshShadow.material = this.materialShadow;
  }

  updateMaterial() {
    if (this.threeMesh == null || this.font == null) return;
    const color = (this.options.color != null) ? this.options.color : this.font.color;

    if (this.material instanceof THREE.ShaderMaterial) {
      const uniforms = (<THREE.ShaderMaterial>this.material).uniforms;
      if (uniforms.map != null) uniforms.map.value = this.font.texture;
      if (uniforms.color != null) uniforms.color.value.setHex(parseInt(color, 16));
    } else {
      (this.material as THREE.MeshBasicMaterial).map = this.font.texture;
      (this.material as THREE.MeshBasicMaterial).color.setHex(parseInt(color, 16));
    }
  }

  updateShadow() {
    if (this.threeMeshShadow == null || this.font == null) return;
    if (this.options.dropshadow) {
      let options = this.options.dropshadow;

      if (this.materialShadow instanceof THREE.ShaderMaterial) {
        const uniforms = (<THREE.ShaderMaterial>this.materialShadow).uniforms;
        if (uniforms.map != null) uniforms.map.value = this.font.texture;
        if (uniforms.color != null) uniforms.color.value.setHex(parseInt(options.color, 16));
      } else {
        (this.materialShadow as THREE.MeshBasicMaterial).map = this.font.texture;
        (this.materialShadow as THREE.MeshBasicMaterial).color.setHex(parseInt(options.color, 16));
      }

      this.threeMeshShadow.position.set(options.x / this.font.pixelsPerUnit, options.y / this.font.pixelsPerUnit, -0.01);
      this.threeMeshShadow.visible = true;
      this.threeMeshShadow.updateMatrixWorld(false);
    } else {
      this.threeMeshShadow.visible = false;
    }
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
    const cSpacing = (this.options.characterSpacing != null) ? this.options.characterSpacing : this.font.characterSpacing;
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

    this.logicalChar++;
  }

  getLineWidth(startPos: number): number {
    let currentChar = startPos;
    let xAdv = 0;
    const cSpacing = (this.options.characterSpacing != null) ? this.options.characterSpacing : this.font.characterSpacing;
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
    const lSpacing = (this.options.lineSpacing != null) ? this.options.lineSpacing : this.font.lineSpacing;
    while (currentChar < this.text.length) {
      let id = this.text.charCodeAt(currentChar++);
      if (id === 10)
        height += this.font.common.lineHeight + lSpacing;
    }
    return height + this.font.common.lineHeight;
  }

  createMesh() {
    if (this.threeMesh != null) return;
    const color = (this.options.color != null) ? this.options.color : this.font.color;
    const geometry = new THREE.BufferGeometry();

    if (this.material == null) this.material = this.createMaterial(geometry, parseInt(color, 16));
    if (this.materialShadow == null) this.materialShadow = this.createMaterial(geometry, 0xFFFFFF);

    this.positions = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 3 * 4), 3);
    this.positions.dynamic = true;
    this.uvs = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 2 * 4), 2);
    this.uvs.dynamic = true;
    this.indices = new THREE.BufferAttribute(new Uint32Array(this.MAX_CHARS * 6), 1);
    for (let i = 0; i < this.MAX_CHARS; i++) {
      this.indices.setXYZ(i * 6 + 0, i * 4 + 0, i * 4 + 1, i * 4 + 2);
      this.indices.setXYZ(i * 6 + 3, i * 4 + 0, i * 4 + 2, i * 4 + 3);
    }
    this.charIds = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 4), 1);
    for (let i = 0; i < this.MAX_CHARS; i++) {
      this.charIds.setX(i * 4 + 0, i);
      this.charIds.setX(i * 4 + 1, i);
      this.charIds.setX(i * 4 + 2, i);
      this.charIds.setX(i * 4 + 3, i);
    }
    geometry.addAttribute("position", this.positions);
    geometry.addAttribute("uv", this.uvs);
    geometry.addAttribute("charId", this.charIds);
    geometry.setIndex(this.indices);

    this.threeMesh = new THREE.Mesh(geometry, this.material);
    this.threeMeshShadow = new THREE.Mesh(geometry, this.materialShadow);

    this.threeMeshShadow.visible = false;

    this.actor.threeObject.add(this.threeMesh);
    this.actor.threeObject.add(this.threeMeshShadow);
  }

  createMaterial(geometry: THREE.BufferGeometry, defaultColor: number) {
    let material: THREE.MeshBasicMaterial|THREE.ShaderMaterial;
    if (this.materialType === "shader")
      material = SupEngine.componentClasses["Shader"].createShaderMaterial(
        this.shaderAsset, {"map": this.font.texture}, geometry
      );
    else {
      material = new THREE.MeshBasicMaterial();
      (<any>material as THREE.MeshBasicMaterial).map = this.font.texture;
      (<any>material as THREE.MeshBasicMaterial).color.setHex(defaultColor);
    }
    material.alphaTest = 0.1;
    material.side = THREE.DoubleSide;
    return material;
  }

  disposeMesh() {
    if (this.threeMesh == null) return;
    this.actor.threeObject.remove(this.threeMesh);
    this.actor.threeObject.remove(this.threeMeshShadow);
    this.threeMesh.geometry.dispose();
    this.threeMesh = null;
    this.threeMeshShadow = null;
  }

  disposeMaterial() {
    if (this.material == null) return;
    this.material.dispose();
    this.materialShadow.dispose();
    this.material = null;
    this.materialShadow = null;
  }

  _destroy() {
    this.disposeMesh();
    this.disposeMaterial();
    super._destroy();
  }

  setIsLayerActive(active: boolean) {
    if (this.threeMesh != null)
      this.threeMesh.visible = active;
    if (this.threeMeshShadow != null)
      this.threeMeshShadow.visible = active && this.options.dropshadow != null;
  }
}
