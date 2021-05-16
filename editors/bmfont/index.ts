import BMFontAsset from "../../data/BMFontAsset";
import BMTextRenderer from "../../components/BMTextRenderer";
import BMTextRendererUpdater from "../../components/BMTextRendererUpdater";

const data: { projectClient: SupClient.ProjectClient; asset: BMFontAsset; textUpdater?: BMTextRendererUpdater; } = {} as any;
const ui: {
  gameInstance: SupEngine.GameInstance,

  allSettings: string[],
  settings: { [name: string]: any; }
  opacitySelect: HTMLSelectElement;
  opacitySlider: HTMLInputElement;
  colorPicker: HTMLInputElement,
} = {} as any;
const noCharsetText = "The quick brown fox\njumps over the lazy dog\n\n0123456789 +-*/=";

let socket: SocketIOClient.Socket = null;

function start() {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);

  ui.gameInstance = new SupEngine.GameInstance(document.querySelector("canvas") as HTMLCanvasElement);
  ui.gameInstance.update();
  ui.gameInstance.draw();

  const cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
  const cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  cameraComponent.setOrthographicMode(true);
  cameraComponent.setOrthographicScale(5);
  cameraComponent.setClearColor(0xbbbbbb);
  new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
    zoomSpeed: 1.5,
    zoomMin: 1,
    zoomMax: 200
  });

  // Upload
  const bmpSelect = <HTMLInputElement>document.querySelector("input.bmp-select");
  bmpSelect.addEventListener("change", onBmpChange);
  document.querySelector("button.uploadBmp").addEventListener("click", () => { bmpSelect.click(); });

  const fntSelect = <HTMLInputElement>document.querySelector("input.fnt-select");
  fntSelect.addEventListener("change", onFntChange);
  document.querySelector("button.uploadFnt").addEventListener("click", () => { fntSelect.click(); });

  ui.allSettings = ["renderingType", "filtering", "pixelsPerUnit", "opacity", "color", "characterSpacing", "lineSpacing"];
  ui.settings = {};
  ui.allSettings.forEach((setting: string) => {
    const settingObj: any = ui.settings[setting] = document.querySelector(`.property-${setting}`);
    settingObj.dataset["name"] = setting;

    if (setting === "color" || setting === "filtering" || setting === "renderingType") {
      settingObj.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], event.target.value);
      });
    } else if (setting === "pixelsPerUnit") {
      settingObj.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], parseInt(event.target.value, 10));
      });
    } else {
      settingObj.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], parseFloat(event.target.value));
      });
    }
  });
  ui.opacitySelect = <HTMLSelectElement>document.querySelector(".opacity-select");
  ui.opacitySelect.addEventListener("change", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "opacity", event.target.value === "transparent" ? 1 : null); });
  ui.opacitySlider = <HTMLInputElement>document.querySelector(".opacity-slider");
  ui.opacitySlider.addEventListener("input", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "opacity", parseFloat(event.target.value)); });

  ui.colorPicker = document.querySelector("input.color-picker") as HTMLInputElement;
  ui.colorPicker.addEventListener("change", (event: any) => {
    data.projectClient.editAsset(SupClient.query.asset, "setProperty", "color", event.target.value.slice(1));
  });

  requestAnimationFrame(tick);
}

// Network callbacks
const onAssetCommands: any = {};

function onConnected() {
  data.projectClient = new SupClient.ProjectClient(socket);

  const textActor = new SupEngine.Actor(ui.gameInstance, "Text");
  const textRenderer = new BMTextRenderer(textActor);
  const config = {
    fontAssetId: SupClient.query.asset,
    text: noCharsetText,
    alignment: "center",
    verticalAlignment: "center",
    materialType: "basic"
  };
  const bmfSubscriber = {
    onAssetReceived,
    onAssetEdited,
    onAssetTrashed: SupClient.onAssetTrashed
  };
  data.textUpdater = new BMTextRendererUpdater(data.projectClient, textRenderer, config, bmfSubscriber);
}

function onAssetReceived(err: string, asset: BMFontAsset) {
  ui.allSettings.forEach((setting: string) => {
    setupProperty(setting, (data.textUpdater.fontAsset.pub as any)[setting]);
  });
  data.asset = asset;
}

function onAssetEdited(id: string, command: string, ...args: any[]) {
  if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
}

// User interface
function onBmpChange(event: any) {
  if (event.target.files.length === 0) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    data.projectClient.editAsset(SupClient.query.asset, "uploadBmp", reader.result);
  };
  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

function onFntChange(event: any) {
  if (event.target.files.length === 0) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    data.projectClient.editAsset(SupClient.query.asset, "uploadFnt", reader.result);
  };
  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

function setupProperty(path: string, value: any) {
  ui.settings[path].value = value;
  switch (path) {
    case "opacity":
      if (value == null) {
        ui.opacitySelect.value = "opaque";
        ui.opacitySlider.parentElement.hidden = true;
        data.textUpdater.config_setProperty("opacity", null);
      } else {
        ui.opacitySelect.value = "transparent";
        ui.opacitySlider.parentElement.hidden = false;
        ui.opacitySlider.value = value;
        data.textUpdater.config_setProperty("opacity", value);
      }
      break;
    case "color": ui.colorPicker.value = `#${value}`; break;
  }
}

onAssetCommands.setProperty = setupProperty;

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  const { updates, timeLeft } = ui.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) ui.gameInstance.draw();
  requestAnimationFrame(tick);
}

// Start
SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "bmfontEditor" }], start);
