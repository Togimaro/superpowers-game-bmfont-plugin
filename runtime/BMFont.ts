// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare let FontFace: any;

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
    player.getAssetData(`assets/${entry.storagePath}/asset.json`, "json", (err, data) => {
        const img = new Image();

        img.onload = () => {
            data.texture = new SupEngine.THREE.Texture(img);
            data.texture.needsUpdate = true;
            data.texture.magFilter = SupEngine.THREE.NearestFilter;
            data.texture.minFilter = SupEngine.THREE.NearestFilter;

            callback(null, data);
        };

        img.onerror = () => { callback(null, data); };
        img.src = `${player.dataURL}assets/${entry.storagePath}/bitmap.dat`;
    });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.BMFont(asset); }
