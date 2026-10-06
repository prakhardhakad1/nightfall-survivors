import { Engine } from './core/engine';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  // Handle dynamic DPR and mobile portrait sizing
  const resizeCanvas = () => {
    const container = document.getElementById('game-container');
    if (container) {
      canvas.width = 450;
      canvas.height = 800;
    }
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const engine = new Engine(canvas);
  engine.start();

  // Expose to window for testing, automated verification & telemetry
  (window as any).__GAME__ = engine;

  // Support url flag ?autoplay=true for headless and playtest validation
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autoplay') === 'true') {
    engine.autoplayEnabled = true;
  }
});
