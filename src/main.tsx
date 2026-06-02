import Phaser from 'phaser';

class TestScene extends Phaser.Scene {
  private rect!: Phaser.GameObjects.Rectangle;
  private fpsText!: Phaser.GameObjects.Text;
  private x = 0;

  constructor() {
    super({ key: 'TestScene' });
  }

  create() {
    this.rect = this.add.rectangle(100, 300, 80, 80, 0xffd700);
    this.fpsText = this.add.text(20, 20, 'FPS: --', {
      fontSize: '28px',
      color: '#ffffff',
    });
  }

  update() {
    this.x = (this.x + 2) % (window.innerWidth + 80);
    this.rect.setX(this.x);
    this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scene: TestScene,
  parent: document.getElementById('root')!,
});