/*
 * Adaptive Regular Liquid Glass web approximation.
 * Keeps optical feedback isolated to authenticated interactive controls.
 */
(function initLiquidGlassInteractions(){
  if (window.__ordoLiquidGlassInteractionsInit) return;
  window.__ordoLiquidGlassInteractionsInit = true;

  const selector = '.ordo-liquid-button, .ordo-c-button';
  let frame = 0;
  let pending = null;

  function controlFrom(target){
    const control = target?.closest?.(selector);
    if (!control || !document.body.classList.contains('auth-on')) return null;
    if (control.disabled || control.getAttribute('aria-disabled') === 'true') return null;
    return control;
  }

  function reducedMotion(){
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function paintHighlight(control, clientX, clientY){
    const rect = control.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    control.style.setProperty('--ordo-liquid-x', x.toFixed(1) + '%');
    control.style.setProperty('--ordo-liquid-y', y.toFixed(1) + '%');
  }

  document.addEventListener('pointermove', function(event){
    const control = controlFrom(event.target);
    if (!control || event.pointerType === 'touch' || reducedMotion()) return;
    pending = { control: control, x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(function(){
      frame = 0;
      if (!pending) return;
      paintHighlight(pending.control, pending.x, pending.y);
      pending = null;
    });
  }, { passive: true });

  document.addEventListener('pointerout', function(event){
    const control = controlFrom(event.target);
    if (!control || control.contains(event.relatedTarget)) return;
    control.style.removeProperty('--ordo-liquid-x');
    control.style.removeProperty('--ordo-liquid-y');
    control.classList.remove('is-liquid-pressed');
  });

  document.addEventListener('pointerdown', function(event){
    const control = controlFrom(event.target);
    if (!control) return;
    control.classList.add('is-liquid-pressed');
  });

  document.addEventListener('pointerup', function(event){
    const control = controlFrom(event.target);
    document.querySelectorAll('.ordo-liquid-button.is-liquid-pressed, .ordo-c-button.is-liquid-pressed').forEach(function(item){
      item.classList.remove('is-liquid-pressed');
    });
    if (!control || reducedMotion()) return;
    control.classList.remove('is-liquid-settling');
    void control.offsetWidth;
    control.classList.add('is-liquid-settling');
    setTimeout(function(){ control.classList.remove('is-liquid-settling'); }, 280);
  });

  document.addEventListener('keydown', function(event){
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const control = controlFrom(event.target);
    if (control) control.classList.add('is-liquid-pressed');
  });

  document.addEventListener('keyup', function(event){
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const control = controlFrom(event.target);
    if (!control) return;
    control.classList.remove('is-liquid-pressed');
    if (reducedMotion()) return;
    control.classList.add('is-liquid-settling');
    setTimeout(function(){ control.classList.remove('is-liquid-settling'); }, 280);
  });
})();
