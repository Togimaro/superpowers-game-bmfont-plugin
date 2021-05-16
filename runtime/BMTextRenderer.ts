export const componentClassName = "Sup.BMTextRenderer";

export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.setText(config.text);
  component.setTextOptions({
    alignment: config.alignment,
    verticalAlignment: config.verticalAlignment,
    characterSpacing: config.characterSpacing,
    lineSpacing: config.lineSpacing
  });
  component.setColor(config.color);
  if (config.overrideOpacity) component.opacity = config.opacity;

  if (config.fontAssetId != null) {
    const font = player.getOuterAsset(config.fontAssetId).__inner;
    if (!config.overrideOpacity) component.opacity = font.opacity;

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
