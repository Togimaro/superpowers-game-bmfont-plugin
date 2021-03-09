class TextUpdaterBehavior extends Sup.Behavior {
  bmtext: Sup.BMTextRenderer;
  text: Sup.TextRenderer;
  
  private textUpdate = "";
  private char = 33;
  
  awake() {
    this.bmtext = Sup.getActor("BMText").bmTextRenderer;
    this.text = Sup.getActor("Text").textRenderer;
  }

  update() {
    if(this.char < 127) {
      this.textUpdate += String.fromCharCode(this.char);
      this.char++;
      if(this.char % 11 == 0) this.textUpdate += "\n";
    } else {
      this.char++;
    }
    if(this.char > 160) {
      this.char = 33;
      this.textUpdate = "";
    }

    this.bmtext.setText(this.textUpdate);
    this.bmtext.forceUpdateMesh(); // bug weird
    this.text.setText(this.textUpdate);
  }
}
Sup.registerBehavior(TextUpdaterBehavior);
