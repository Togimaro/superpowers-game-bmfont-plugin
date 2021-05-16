export const componentClassName = "Sup.BMTextRenderer";

export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.setText(config.text);
  component.setOptions({
    alignment: config.alignment,
    verticalAlignment: config.verticalAlignment,
    characterSpacing: config.characterSpacing,
    lineSpacing: config.lineSpacing,
    color: config.color
  });

  if (config.fontAssetId != null) {
    const font = player.getOuterAsset(config.fontAssetId).__inner;

    let shader: any;
    if (config.materialType === "shader") {
      if (config.shaderAssetId != null) {
        const shaderAsset = player.getOuterAsset(config.shaderAssetId);
        if (shaderAsset == null) return;
        shader = shaderAsset.__inner;
      }
    }
    component.setFont(font, config.materialType, shader);
  }

  component.renderUpdate();
}
