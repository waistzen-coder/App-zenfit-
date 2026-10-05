/* ReliefPath · gráficos en movimiento: aparición al hacer scroll, contadores,
   iconos vivos solo cuando se ven y cinta en pausa fuera de pantalla. */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var editor=window.Shopify&&Shopify.designMode;
  if(!('IntersectionObserver' in window)||reduce||editor) return;
  var root=document.documentElement; root.classList.add('rp-motion');

  /* Secciones que aparecen (no la portada: su foto es lo primero que se pinta) */
  var targets='.rp-feature-grid .rp-wrap,.rp-editorial .rp-wrap,.rp-close .rp-wrap,.rp-stats .rp-wrap,.sr-faq .sr-w,.sr-guar .sr-w';
  function mark(){
    document.querySelectorAll(targets).forEach(function(el){ if(!el.hasAttribute('data-rp-reveal')) el.setAttribute('data-rp-reveal',''); });
    document.querySelectorAll('.rp-features__grid > .rp-feature,.rp-editorial__steps > li,.rp-stats__grid > .rp-stat').forEach(function(el){ el.setAttribute('data-rp-stagger',''); });
    /* Los contadores arrancan en 0 y suben al verse; sin JS se ve la cifra final */
    document.querySelectorAll('[data-rp-count]').forEach(function(el){ var o=el.querySelector('[data-rp-count-value]')||el; if(!el.closest('.is-in')) o.textContent='0'; });
  }
  var ran=false;
  function count(el){
    var to=parseFloat(el.getAttribute('data-rp-count')); if(isNaN(to)) return;
    var dec=(el.getAttribute('data-rp-count').split('.')[1]||'').length, t0=null, dur=1400, out=el.querySelector('[data-rp-count-value]')||el;
    function step(t){ if(!t0) t0=t; var p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      out.textContent=(to*e).toFixed(dec).replace('.',','); if(p<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var io=new IntersectionObserver(function(es){ ran=true; es.forEach(function(en){ if(!en.isIntersecting) return;
    en.target.classList.add('is-in');
    en.target.querySelectorAll('[data-rp-count]').forEach(count);
    io.unobserve(en.target); }); },{rootMargin:'0px 0px -12% 0px',threshold:.08});
  /* Iconos y cinta: se animan solo mientras están en pantalla */
  var live=new IntersectionObserver(function(es){ es.forEach(function(en){
    en.target.classList.toggle(en.target.classList.contains('rp-ticker')?'is-paused':'is-live', en.target.classList.contains('rp-ticker')?!en.isIntersecting:en.isIntersecting); }); });
  function watch(){
    mark();
    document.querySelectorAll('[data-rp-reveal]:not(.is-in)').forEach(function(el){ io.observe(el); });
    document.querySelectorAll('.rp-feature,.rp-ticker').forEach(function(el){ live.observe(el); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch); else watch();
  /* Red de seguridad: si algo falla, a los 4 s se enseña todo */
  setTimeout(function(){ if(ran) return; document.querySelectorAll('[data-rp-reveal]').forEach(function(el){ el.classList.add('is-in'); el.querySelectorAll('[data-rp-count]').forEach(count); }); },4000);
})();
