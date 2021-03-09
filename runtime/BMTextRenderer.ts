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
        component.setFont(font);
    }

    component.setupComponent();
}
