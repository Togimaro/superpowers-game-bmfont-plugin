const THREE = SupEngine.THREE;

import BMTextRendererUpdater from "./BMTextRendererUpdater";
import { BMFontPub } from "../data/BMFontAsset";

export default class BMTextRenderer extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = BMTextRendererUpdater;
  /* tslint:enable:variable-name */

  threeMesh: THREE.Mesh;
  threeMeshShadow: THREE.Mesh; // maybe merge the two together in the future

  material: THREE.ShaderMaterial;
  materialShadow: THREE.ShaderMaterial;
  positions: THREE.BufferAttribute;
  uvs: THREE.BufferAttribute;
  charIds: THREE.BufferAttribute;
  indices: THREE.BufferAttribute;

  MAX_CHARS = 128;

  text: string;
  font: BMFontPub;
  options: {
    alignment: string;
    verticalAlignment: string;
    characterSpacing?: number;
    lineSpacing?: number;
    dropshadow? : { color: string; x: number; y: number; };
  };
  opacity: number;
  color?: string;
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
  setColor(color: string) {
    this.color = color;
    this.needUpdateMaterial = true;
  }
  setOpacity(opacity: number) {
    this.opacity = opacity;
    this.needUpdateMaterial = true;
  }
  setTextOptions(options: { alignment: string; verticalAlignment: string; characterSpacing?: number; lineSpacing?: number; }) {
    if (options.alignment == null) options.alignment = "center";
    if (options.verticalAlignment == null) options.verticalAlignment = "center";
    this.options.alignment = options.alignment;
    this.options.verticalAlignment = options.verticalAlignment;
    this.options.characterSpacing = options.characterSpacing;
    this.options.lineSpacing = options.lineSpacing;

    this.needUpdateMesh = true;
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

    if (this.material != null)
      this.material.uniforms.time.value += 1 / this.actor.gameInstance.framesPerSecond;
    if (this.materialShadow != null)
      this.materialShadow.uniforms.time.value += 1 / this.actor.gameInstance.framesPerSecond;
  }

  nextPow2(aSize: number): number {
    return Math.pow(2, Math.ceil(Math.log(aSize) / Math.log(2)));
  }

  logicalChar = 0;
  updateMesh() {
    if (this.text == null || this.font == null) {
      this.hideMesh();
      return;
    }

    // This count as if every letter is printed, not really the case but good enough as an approximation for memory pre allocation
    let vertMax = this.nextPow2(this.text.length);
    if (vertMax > this.MAX_CHARS) {
      this.MAX_CHARS = vertMax;
      this.disposeMesh();
    }

    if (this.threeMesh == null)
      this.createMesh();
    else if (this.threeMesh.parent == null) {
        this.actor.threeObject.add(this.threeMesh);
        this.actor.threeObject.add(this.threeMeshShadow);
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
    this.material = this.createMaterial(geometry);
    this.materialShadow = this.createMaterial(geometry);
    this.needUpdateMaterial = true;
    this.needUpdateShadow = true;

    this.threeMesh.material = this.material;
    this.threeMeshShadow.material = this.materialShadow;
  }

  updateMaterial() {
    if (this.material == null || this.font == null) return;
    const color = (this.color != null) ? this.color : this.font.color;

    if (this.opacity != null) {
      this.material.transparent = true;
      this.material.depthWrite = false;
      this.material.opacity = this.opacity;
    } else {
      this.material.transparent = false;
      this.material.depthWrite = true;
      this.material.opacity = 1;
    }

    if (this.material.uniforms.color != null)
      this.material.uniforms.color.value.setHex(parseInt(color, 16));
    if (this.material.uniforms.opacity != null)
      this.material.uniforms.opacity.value = this.material.opacity;
  }

  updateShadow() {
    if (this.threeMeshShadow == null || this.font == null) return;
    if (this.options.dropshadow) {
      let options = this.options.dropshadow;

      if (this.materialShadow.uniforms.color != null)
        this.materialShadow.uniforms.color.value.setHex(parseInt(options.color, 16));

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
    const geometry = new THREE.BufferGeometry();

    if (this.material == null) {
      this.material = this.createMaterial(geometry);
      this.needUpdateMaterial = true;
    }
    if (this.materialShadow == null) {
      this.materialShadow = this.createMaterial(geometry);
      this.needUpdateShadow = true;
    }

    this.positions = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 3 * 4), 3);
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.uvs = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 2 * 4), 2);
    this.uvs.setUsage(THREE.DynamicDrawUsage);
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
    geometry.setAttribute("position", this.positions);
    geometry.setAttribute("uv", this.uvs);
    geometry.setAttribute("charId", this.charIds);
    geometry.setIndex(this.indices);

    this.threeMesh = new THREE.Mesh(geometry, this.material);
    this.threeMeshShadow = new THREE.Mesh(geometry, this.materialShadow);

    this.threeMeshShadow.visible = false;

    this.actor.threeObject.add(this.threeMesh);
    this.actor.threeObject.add(this.threeMeshShadow);

    this.needUpdateShadow = true;
  }

  createMaterial(geometry: THREE.BufferGeometry) {
    let material: THREE.ShaderMaterial;
    if (this.materialType === "shader") {
      material = SupEngine.componentClasses["Shader"].createShaderMaterial(
        this.shaderAsset, { map: this.font.texture }, geometry
      );
    }
    else {
      // TODO: put default shader in a separate file
      material = new THREE.ShaderMaterial({
        vertexShader:
`varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader:
`uniform sampler2D map;
uniform vec3 color;
uniform float opacity;

varying vec2 vUv;

#if defined(BMFONT_SDF)
float aastep(float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
  return smoothstep(0.5 - afwidth, 0.5 + afwidth, value);
}
#elif defined(BMFONT_MSDF)
float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}
#endif

void main() {
#if defined(BMFONT_SDF)
  float distSample = texture2D(map, vUv).r;

  gl_FragColor = vec4(color, aastep(distSample) * opacity);
#elif defined(BMFONT_MSDF)
  vec3 distSample = texture2D(map, vUv).rgb;
  float sigDist = median(distSample.r, distSample.g, distSample.b) - 0.5;
  float alpha = clamp(sigDist/fwidth(sigDist) + 0.5, 0.0, 1.0);

  gl_FragColor = vec4(color, alpha * opacity);
#else
  vec4 diffuseColor = vec4(color, opacity);

  vec4 texelColor = texture2D(map, vUv);
  diffuseColor *= texelColor;

  gl_FragColor = diffuseColor;
#endif

  #ifdef ALPHATEST
    if ( gl_FragColor.a < ALPHATEST ) discard;
  #endif

  #ifdef PREMULTIPLIED_ALPHA
    gl_FragColor.rgb *= gl_FragColor.a;
  #endif
}`,
        uniforms: {
          "time": { value: 0.0 },
          "map": { value: this.font.texture },
          "color": { value: new THREE.Color(0xFFFFFF) },
          "opacity": { value: 1.0 }
        }
      });
    }
    if (this.font.renderingType === "bitmap") material.defines["BMFONT_BITMAP"] = "";
    if (this.font.renderingType === "sdf") material.defines["BMFONT_SDF"] = "";
    if (this.font.renderingType === "msdf") material.defines["BMFONT_MSDF"] = "";
    if (this.font.renderingType !== "bitmap") material.extensions.derivatives = true;
    material.alphaTest = 0.01;
    material.side = THREE.DoubleSide;
    return material;
  }

  hideMesh() {
    if (this.threeMesh == null) return;
    this.actor.threeObject.remove(this.threeMesh);
    this.actor.threeObject.remove(this.threeMeshShadow);
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
