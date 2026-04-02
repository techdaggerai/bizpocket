(function() {
  'use strict';
  var WIDGET_URL = 'https://www.bizpocket.io';
  var script = document.currentScript;
  var orgId = script.getAttribute('data-org-id');
  var lang = script.getAttribute('data-lang') || 'en';
  var position = script.getAttribute('data-position') || 'right';
  var color = script.getAttribute('data-color') || '#4F46E5';
  if (!orgId) { console.error('PocketChat: data-org-id is required'); return; }

  var chatSvg = '<svg width="28" height="28" viewBox="0 0 88 88" fill="none"><path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/><path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B"/><text x="32" y="68" font-size="10" font-weight="800" fill="' + color + '" text-anchor="middle" font-family="sans-serif">Hi</text><text x="55.5" y="72" font-size="9.5" font-weight="700" fill="white" text-anchor="middle" font-family="sans-serif">やあ</text></svg>';
  var closeSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  var btn = document.createElement('div');
  btn.id = 'pocketchat-btn';
  btn.style.cssText = 'position:fixed;bottom:20px;' + position + ':20px;width:56px;height:56px;border-radius:16px;background:' + color + ';cursor:pointer;z-index:99999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.15);transition:transform 0.2s ease;';
  btn.innerHTML = chatSvg;
  btn.onmouseover = function() { btn.style.transform = 'scale(1.05)'; };
  btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };

  var container = document.createElement('div');
  container.id = 'pocketchat-container';
  container.style.cssText = 'position:fixed;bottom:90px;' + position + ':20px;width:380px;height:520px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;z-index:99998;box-shadow:0 8px 40px rgba(0,0,0,0.12);display:none;background:white;';
  var iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  iframe.src = WIDGET_URL + '/widget/chat?org=' + encodeURIComponent(orgId) + '&lang=' + encodeURIComponent(lang);
  container.appendChild(iframe);

  var open = false;
  btn.onclick = function() {
    open = !open;
    container.style.display = open ? 'block' : 'none';
    btn.innerHTML = open ? closeSvg : chatSvg;
  };

  document.body.appendChild(btn);
  document.body.appendChild(container);
})();
