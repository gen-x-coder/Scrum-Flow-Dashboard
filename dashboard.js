/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
/* Radix stable entry point */
(function () {
  if (window.RADIX_VERSION || document.getElementById('radix-app')) { console.warn('Radix: slechts één dashboard per pagina.'); return; }
  const script = document.currentScript || Array.from(document.scripts || []).find(s => /\/dashboard\.js(?:[?#]|$)/.test(s.src));
  if (!script?.src) { console.error('Radix: locatie dashboard.js onbekend'); return; }
  const version = window.RADIX_VERSION = '3.1.0';
  const base = new URL('.', script.src);
  const pageConfig = window.FLOW_CONFIG || {};
  const load = (name, optional=false) => new Promise((resolve,reject) => {
    const el = document.createElement('script');
    el.src = new URL(name,base).href + '?v=' + encodeURIComponent(optional ? Date.now() : version);
    el.onload = () => resolve(true);
    el.onerror = () => optional ? resolve(false) : reject(new Error(name + ' kon niet worden geladen'));
    document.head.appendChild(el);
  });
  const start = async () => {
    let root = document.getElementById(pageConfig.containerId || 'flow-app-container');
    try {
      if(root)root.textContent='Radix wordt geladen…';
      await load('configuration.js');
      // A classic script also works for external hosting without fetch/CORS requirements.
      delete window.RADIX_CONFIG;
      const present=await load('config.js',true);
      if(present && typeof window.RADIX_CONFIG === 'undefined')console.warn('Radix: config.js bevat geen window.RADIX_CONFIG; standaardwaarden worden gebruikt.');
      const config=RadixConfig.resolve(present ? (typeof window.RADIX_CONFIG === 'undefined' ? {} : window.RADIX_CONFIG) : {},pageConfig);
      window.FLOW_CONFIG=config;
      window.FLOW_JIRA_URL=config.jiraUrl;
      root=document.getElementById(config.containerId);
      if(!root)throw new Error('HTML-container niet gevonden: '+config.containerId);
      if(!config.jiraUrl)throw new Error('Jira-adres ontbreekt of is ongeldig');
      await load('history-cache.js'); await load('jira-api.js'); await load('metrics.js'); await load('workflow.js'); await load('charts.js'); await load('manual.js'); await load('advice.js'); await load('app.js');
      window.initFlowApp(root.id);
    } catch(e) { if(root)root.textContent='Radix: '+e.message;else console.error('Radix:',e.message); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
