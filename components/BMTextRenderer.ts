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

    MAX_CHARS = 500;

    text: string;
    font: BMFontPub;

    constructor(actor: SupEngine.Actor) {
        super(actor, "BMTextRenderer");
    }

    setText(text: string) {
        this.text = text;
        this.updateMesh();
    }
    setFont(font: BMFontPub) {
        this.font = font;
        this.updateMesh(true);
    }

    updateMesh(updateTexture = false) {
        if (this.text == null || this.font == null) return;

        if (this.threeMesh == null) {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.MeshBasicMaterial({
                map: this.font.texture,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            material.color.setHex(0xFFFFFF);

            this.positions = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 3 * 4), 3);
            this.uvs = new THREE.BufferAttribute(new Float32Array(this.MAX_CHARS * 2 * 4), 2);
            this.indices = new THREE.BufferAttribute(new Uint32Array(this.MAX_CHARS * 6), 1);
            geometry.addAttribute("position" , this.positions);
            geometry.addAttribute("uv", this.uvs);
            geometry.setIndex(this.indices);

            this.threeMesh = new THREE.Mesh(geometry, material);
        }
        if (updateTexture) {
            (this.threeMesh.material as THREE.MeshBasicMaterial).map = this.font.texture;
            this.threeMesh.material.needsUpdate = true;
        }

        let currentChar = 0;
        let currentOff = 0;
        let currentLine = 0;
        let prevChar = 0;
        for (let c of this.text) {
            if (c === "\n") {
                currentLine -= this.font.common.lineHeight;
                currentOff = 0;
                prevChar = 0;
            }
            let id = c.charCodeAt(0);
            let glyph = this.font.chars.find(element => element.id === id);
            if (glyph === undefined) continue;
            let kerning = this.font.kernings.find(element => element.first === prevChar && element.second === id);
            if (kerning !== undefined) currentOff += kerning.amount;
            this.addGlyph(currentChar, glyph, currentOff, currentLine);
            currentChar++;
            currentOff += glyph.xadv;
            prevChar = id;
        }
        this.positions.needsUpdate = true;
        this.uvs.needsUpdate = true;
        this.indices.needsUpdate = true;
        (this.threeMesh.geometry as THREE.BufferGeometry).setDrawRange(0, currentChar * 6);

        this.actor.threeObject.add(this.threeMesh);
        const scale = 1 / this.font.pixelsPerUnit;
        this.threeMesh.scale.set(scale, scale, scale);
        this.threeMesh.updateMatrixWorld(false);
    }

    addGlyph(charNum: number, glyph: any, offX : number, lineY : number) {
        this.positions.setXYZ(charNum * 4 + 0   , glyph.xoff + offX                 , lineY - glyph.yoff                , 0);
        this.positions.setXYZ(charNum * 4 + 1   , glyph.xoff + offX + glyph.width   , lineY - glyph.yoff                , 0);
        this.positions.setXYZ(charNum * 4 + 2   , glyph.xoff + offX + glyph.width   , lineY - glyph.yoff - glyph.height , 0);
        this.positions.setXYZ(charNum * 4 + 3   , glyph.xoff + offX                 , lineY - glyph.yoff - glyph.height , 0);

        let rX = glyph.x / this.font.common.scaleW;
        let rY = glyph.y / this.font.common.scaleH;
        let rW = glyph.width / this.font.common.scaleW;
        let rH = glyph.height / this.font.common.scaleH;
        this.uvs.setXY(charNum * 4 + 0  , rX        , 1 - rY        );
        this.uvs.setXY(charNum * 4 + 1  , rX + rW   , 1 - rY        );
        this.uvs.setXY(charNum * 4 + 2  , rX + rW   , 1 - (rY + rH) );
        this.uvs.setXY(charNum * 4 + 3  , rX        , 1 - (rY + rH) );

        this.indices.setXYZ(charNum * 6 + 0, charNum * 4 + 0, charNum * 4 + 1, charNum * 4 + 2);
        this.indices.setXYZ(charNum * 6 + 3, charNum * 4 + 0, charNum * 4 + 2, charNum * 4 + 3);
    }

    _destroy() {
        if (this.threeMesh != null) {
            this.actor.threeObject.remove(this.threeMesh);
            this.threeMesh.geometry.dispose();
            this.threeMesh.material.dispose();
        }
        super._destroy();
    }

    setIsLayerActive(active: boolean) {
        if (this.threeMesh != null)
            this.threeMesh.visible = active;
    }
}
